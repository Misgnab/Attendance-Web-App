import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "attendance.db");
export const db = new Database(dbPath);

// Enable foreign key support
db.pragma("foreign_keys = ON");

function migrateUsersTable() {
  try {
    const tableCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    if (tableCheck && tableCheck.sql) {
      const sqlStr = tableCheck.sql;
      if (sqlStr.includes("CHECK(role IN") || sqlStr.includes("CHECK (role IN")) {
        console.log("Migrating users table to remove CHECK constraint on role...");
        
        // 1. Turn off foreign keys temporarily to avoid cascade delete triggers
        db.pragma("foreign_keys = OFF");
        
        // 2. Start transaction
        db.exec("BEGIN TRANSACTION;");
        
        // 3. Create users_new without CHECK constraint
        db.exec(`
          CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone_number TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            password TEXT NOT NULL,
            photo TEXT,
            hourly_rate REAL DEFAULT 15.00,
            registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL
          )
        `);
        
        // 4. Try copying the workspace_id safely by checking if the source table has it
        const hasWorkspaceId = sqlStr.includes("workspace_id");
        if (hasWorkspaceId) {
          db.exec(`
            INSERT INTO users_new (id, full_name, phone_number, role, password, photo, hourly_rate, registration_date, created_at, updated_at, workspace_id)
            SELECT id, full_name, phone_number, role, password, photo, hourly_rate, registration_date, created_at, updated_at, workspace_id FROM users
          `);
        } else {
          db.exec(`
            INSERT INTO users_new (id, full_name, phone_number, role, password, photo, hourly_rate, registration_date, created_at, updated_at)
            SELECT id, full_name, phone_number, role, password, photo, hourly_rate, registration_date, created_at, updated_at FROM users
          `);
        }
        
        // 5. Drop old table
        db.exec("DROP TABLE users;");
        
        // 6. Rename new table
        db.exec("ALTER TABLE users_new RENAME TO users;");
        
        // 7. Re-create indexes
        db.exec("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);");
        db.exec("CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);");
        
        // 8. Commit
        db.exec("COMMIT;");
        
        // 9. Enable foreign keys
        db.pragma("foreign_keys = ON");
        
        console.log("Successfully migrated users table!");
      }
    }
  } catch (err) {
    console.error("Failed to migrate users table:", err);
    try {
      db.exec("ROLLBACK;");
    } catch (_) {}
    db.pragma("foreign_keys = ON");
  }
}

export function initDatabase() {
  // Run table migration
  migrateUsersTable();

  // Create Workspaces Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default workspace if none exists
  const workspaceCheck = db.prepare("SELECT COUNT(*) as count FROM workspaces").get() as any;
  if (workspaceCheck.count === 0) {
    db.prepare("INSERT INTO workspaces (name) VALUES (?)").run("Default Workspace");
  }

  const defaultWorkspaceId = (db.prepare("SELECT id FROM workspaces ORDER BY id ASC LIMIT 1").get() as any).id;

  // Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
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
      session TEXT NOT NULL DEFAULT 'Morning',
      check_in_time TEXT,
      check_out_time TEXT,
      total_hours REAL DEFAULT 0.0,
      status TEXT DEFAULT 'Present',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, date, session)
    )
  `);

  // Create AttendanceRequests Table (Site Visit, External Work, Purchaser Visit)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      check_out_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
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
      request_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      approved_from_date TEXT,
      approved_to_date TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create Salary Table
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
      period_type TEXT NOT NULL,
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

  // Safely add workspace_id to tables if they don't exist
  function addColumnIfNotExists(tableName: string, colName: string, colDef: string) {
    try {
      const tableInfo: any[] = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const exists = tableInfo.some((col: any) => col.name === colName);
      if (!exists) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
      }
    } catch (err) {
      console.error(`Migration error adding ${colName} to ${tableName}:`, err);
    }
  }

  addColumnIfNotExists("users", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("attendance", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("attendance_requests", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("permissions", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("salary_payments", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("qr_codes", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");
  addColumnIfNotExists("site_settings", "workspace_id", "INTEGER REFERENCES workspaces(id) ON DELETE SET NULL");

  // Retroactively fill workspace_id for rows where it is NULL
  try {
    db.prepare("UPDATE users SET workspace_id = ? WHERE workspace_id IS NULL AND role != 'Bootstrap' AND role != 'SuperAdmin'").run(defaultWorkspaceId);
    db.prepare("UPDATE attendance SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
    db.prepare("UPDATE attendance_requests SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
    db.prepare("UPDATE permissions SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
    db.prepare("UPDATE salary_payments SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
    db.prepare("UPDATE qr_codes SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
    db.prepare("UPDATE site_settings SET workspace_id = ? WHERE workspace_id IS NULL").run(defaultWorkspaceId);
  } catch (err) {
    console.error("Migration error filling workspace_id:", err);
  }

  // Create Indexes for high performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_requests_user ON attendance_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_workspace ON attendance(workspace_id);
  `);

  // Seed default Site Settings for default workspace if not exists
  const settingsCheck = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ? OR (workspace_id IS NULL AND id = 1)").get(defaultWorkspaceId);
  if (!settingsCheck) {
    db.prepare(`
      INSERT INTO site_settings (office_name, latitude, longitude, wifi_ssid, wifi_ip, use_wifi_verification, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Main Head Office', 9.0227, 38.7460, 'Apex_HQ_WiFi', '192.168.1.100', 1, defaultWorkspaceId);
  }

  // Seed default active QR Code for default workspace if not exists
  const qrCheck = db.prepare("SELECT * FROM qr_codes WHERE workspace_id = ?").get(defaultWorkspaceId);
  if (!qrCheck) {
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry
    db.prepare(`
      INSERT INTO qr_codes (code, generated_at, expires_at, workspace_id)
      VALUES (?, ?, ?, ?)
    `).run("CONST-QR-INITIAL-SECRET-2026", now.toISOString(), expires.toISOString(), defaultWorkspaceId);
  }
}
