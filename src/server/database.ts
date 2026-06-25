import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "attendance.db");
export const db = new Database(dbPath);

// Enable foreign key support
db.pragma("foreign_keys = ON");

export function initDatabase() {
  // Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Employee')),
      password TEXT NOT NULL,
      photo TEXT,
      hourly_rate REAL DEFAULT 15.00,
      registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Attendance Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      session TEXT NOT NULL DEFAULT 'Morning' CHECK(session IN ('Morning', 'Afternoon')),
      check_in_time TEXT,
      check_out_time TEXT,
      total_hours REAL DEFAULT 0.0,
      status TEXT DEFAULT 'Present' CHECK(status IN ('Present', 'Late', 'Absent')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, date, session)
    )
  `);

  // Migrate existing databases to add 'session' column if it doesn't exist
  try {
    const tableInfo: any[] = db.prepare("PRAGMA table_info(attendance)").all();
    const hasSession = tableInfo.some((col: any) => col.name === "session");
    if (!hasSession) {
      db.exec("ALTER TABLE attendance ADD COLUMN session TEXT NOT NULL DEFAULT 'Morning'");
    }
  } catch (err) {
    console.error("Migration error for session column:", err);
  }

  // Create AttendanceRequests Table (Site Visit, External Work, Purchaser Visit)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Site Visit', 'External Work', 'Purchaser Visit')),
      date TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      check_out_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create Permissions Table (Permission, Sick Leave, Annual Leave)
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_type TEXT NOT NULL CHECK(request_type IN ('Permission', 'Sick Leave', 'Annual Leave')),
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      approved_from_date TEXT,
      approved_to_date TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create Salary Table (stores generated summaries/payout records if needed, though we can calculate dynamically)
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_hours REAL NOT NULL,
      hourly_rate REAL NOT NULL,
      salary_amount REAL NOT NULL,
      payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      period_type TEXT NOT NULL CHECK(period_type IN ('Daily', 'Weekly', 'Monthly', 'Yearly')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create AttendanceScores Table (cached scores)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      attendance_score REAL DEFAULT 100.0,
      punctuality_percentage REAL DEFAULT 100.0,
      late_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create QRCode Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create SiteSettings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_name TEXT DEFAULT 'Main Head Office',
      latitude REAL DEFAULT 9.0227,
      longitude REAL DEFAULT 38.7460,
      wifi_ssid TEXT DEFAULT 'Apex_HQ_WiFi',
      wifi_ip TEXT DEFAULT '192.168.1.100',
      use_wifi_verification INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Indexes for high performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_session ON attendance(user_id, date, session);
    CREATE INDEX IF NOT EXISTS idx_attendance_requests_user ON attendance_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
  `);

  // Seed default Site Settings if not exists
  const settingsCheck = db.prepare("SELECT * FROM site_settings").get();
  if (!settingsCheck) {
    db.prepare(`
      INSERT INTO site_settings (office_name, latitude, longitude, wifi_ssid, wifi_ip, use_wifi_verification)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Main Head Office', 9.0227, 38.7460, 'Apex_HQ_WiFi', '192.168.1.100', 1);
  }

  // Seed default Admin if not exists (Removed to allow first-time admin setup)

  // Seed default active QR Code
  const qrCheck = db.prepare("SELECT * FROM qr_codes").get();
  if (!qrCheck) {
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry
    db.prepare(`
      INSERT INTO qr_codes (code, generated_at, expires_at)
      VALUES (?, ?, ?)
    `).run("CONST-QR-INITIAL-SECRET-2026", now.toISOString(), expires.toISOString());
  }
}
