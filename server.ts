import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { db, initDatabase } from "./src/server/database.js";
import { toEthiopian, toGregorian } from "ethiopian-date";

// Initialize the database and seed it
initDatabase();

const app = express();
const PORT = 3000;
console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}`);

// Request logger
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  console.log(`${req.method} ${req.url}`);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "construction-company-secret-key-2026";

// --- ETHIOPIAN TIMEZONE & CALENDAR HELPER FUNCTIONS (Africa/Addis_Ababa, UTC+3) ---
function getAddisAbabaYMD(date: Date = new Date()): { year: number, month: number, day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date);
  
  let year = 0, month = 0, day = 0;
  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
  }
  return { year, month, day };
}

function getEthiopianDateString(date: Date = new Date()): string {
  try {
    const g = getAddisAbabaYMD(date);
    const [ey, em, ed] = toEthiopian(g.year, g.month, g.day);
    const mm = String(em).padStart(2, "0");
    const dd = String(ed).padStart(2, "0");
    return `${ey}-${mm}-${dd}`;
  } catch (err) {
    console.error("Error converting date to Ethiopian calendar:", err);
    // Fallback to Gregorian in Addis Ababa timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  }
}

function convertGregorianToEthiopianDate(gDateStr: string): string {
  if (!gDateStr) return gDateStr;
  try {
    const parts = gDateStr.split("-");
    if (parts.length !== 3) return gDateStr;
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return gDateStr;
    const [ey, em, ed] = toEthiopian(y, m, d);
    return `${ey}-${String(em).padStart(2, "0")}-${String(ed).padStart(2, "0")}`;
  } catch (e) {
    return gDateStr;
  }
}

function getEthiopianTimeString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Addis_Ababa',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const formatted = formatter.format(date);
    const parts = formatted.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const s = parts[2];
    
    const ethH = (h - 6 + 24) % 24;
    return `${String(ethH).padStart(2, "0")}:${m}:${s}`;
  } catch (err) {
    console.error("Error converting time to Ethiopian:", err);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Addis_Ababa',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(date);
  }
}

app.use(express.json({ limit: "10mb" }));

// --- TYPES FOR REQUESTS ---
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    phone_number: string;
    role: string;
    full_name: string;
    workspace_id?: number | null;
  };
}

// --- JWT AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      console.log("Auth failed: Missing token");
      return res.status(401).json({ error: "Access token is required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user: any) => {
      if (err) {
        console.log(`Auth failed: JWT verify error: ${err.message}`);
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      // Check if user still exists in DB to prevent stale token issues after DB reset
      try {
        const dbUser = db.prepare("SELECT id, role, workspace_id, full_name, phone_number FROM users WHERE id = ?").get(user.id) as any;
        if (!dbUser) {
          console.log(`Auth failed: User ${user.id} not found in DB`);
          return res.status(401).json({ error: "User session is invalid. Please log in again." });
        }
        req.user = { ...user, ...dbUser };
        console.log(`Auth successful: User ${req.user.full_name} (${req.user.role})`);
        next();
      } catch (dbErr) {
        console.error("Auth middleware DB error:", dbErr);
        return res.status(500).json({ error: "Internal server error during authentication" });
      }
    });
  } catch (err) {
    console.error("Critical auth middleware error:", err);
    res.status(500).json({ error: "Internal server error in auth middleware" });
  }
}

// --- MODULE 6: AUTHENTICATION & REGISTRATION API ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/test-json", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ test: "ok", user: req.user });
});

// Login Endpoint
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    return res.status(400).json({ error: "Phone number and password are required" });
  }

  try {
    const user: any = db.prepare(`
      SELECT u.*, w.name as workspace_name 
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.phone_number = ?
    `).get(phone_number);

    if (!user) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const token = jwt.sign(
      { id: user.id, phone_number: user.phone_number, role: user.role, full_name: user.full_name, workspace_id: user.workspace_id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        photo: user.photo,
        hourly_rate: user.hourly_rate,
        registration_date: user.registration_date,
        workspace_id: user.workspace_id,
        workspace_name: user.workspace_name,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if database is empty (no users registered yet)
app.get("/api/auth/setup-check", (req: Request, res: Response) => {
  try {
    const row: any = db.prepare("SELECT COUNT(*) as count FROM users").get();
    res.json({ empty: row.count === 0 });
  } catch (err) {
    console.error("Setup check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Setup first Admin user when database is empty (Bootstrap Admin)
app.post("/api/auth/setup-admin", (req: Request, res: Response) => {
  const { full_name, phone_number, password } = req.body;

  if (!full_name || !phone_number || !password) {
    return res.status(400).json({ error: "Full name, phone number, and password are required" });
  }

  try {
    const row: any = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (row.count > 0) {
      return res.status(400).json({ error: "Setup already completed. Please log in." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (full_name, phone_number, role, password, hourly_rate, workspace_id)
      VALUES (?, ?, 'Bootstrap', ?, 35.00, NULL)
    `).run(full_name, phone_number, passwordHash);

    const userId = Number(result.lastInsertRowid);

    // Initialize attendance score for the new admin
    db.prepare(`
      INSERT INTO attendance_scores (user_id, attendance_score, punctuality_percentage, late_count)
      VALUES (?, 100.0, 100.0, 0)
    `).run(userId);

    // Create a login token
    const token = jwt.sign(
      { id: userId, phone_number: phone_number, role: "Bootstrap", full_name: full_name, workspace_id: null },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: userId,
        full_name,
        phone_number,
        role: "Bootstrap",
        photo: null,
        hourly_rate: 35.00,
        registration_date: new Date().toISOString(),
        workspace_id: null,
      },
    });
  } catch (error: any) {
    console.error("Setup admin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register Employee / Admin Endpoint (Multi-tenant)
app.post("/api/employees/register", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  console.log("Entering /api/employees/register handler");
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  console.log("Registration request by:", currentRole, "for workspace:", currentWorkspaceId);

  const allowedRoles = ["AdminCreator", "AdminManager", "Bootstrap", "SuperAdmin"];
  if (!allowedRoles.includes(currentRole || "")) {
    console.log(`Access denied for role: ${currentRole}`);
    return res.status(400).json({ success: false, error: "Access denied. Write operations forbidden." });
  }

  const { full_name, phone_number, role, password, photo, hourly_rate, workspace_name } = req.body;
  console.log("Registering employee:", { full_name, phone_number, role, hourly_rate });

  if (!full_name || !phone_number || !role || !password) {
    return res.status(400).json({ error: "Full name, phone number, role, and password are required" });
  }

  const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];

  // Role hierarchy and registration permissions:
  // 1. Bootstrap can ONLY register other Admin accounts (specifically AdminCreator). Cannot register Employees, AdminManagers or SuperAdmins.
  if (currentRole === "Bootstrap") {
    if (role !== "AdminCreator") {
      return res.status(400).json({ error: "Bootstrap Setup Admin can only register a normal Admin (AdminCreator) account." });
    }
  }

  // 2. AdminCreator can register other Admin accounts or Employees.
  // 3. AdminManager can ONLY register employee roles, CANNOT create other Admins.
  if (currentRole === "AdminManager") {
    if (!employeeRoles.includes(role)) {
      return res.status(400).json({ error: "Second Workspace Managing Admin can only register employee roles (Employee, Purchaser, Accountant, Engineer, HR)." });
    }
  }

  try {
    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE phone_number = ?").get(phone_number);
    if (existing) {
      return res.status(400).json({ error: "A user with this phone number is already registered" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const rateValue = parseFloat(hourly_rate) || 15.0;

    let targetWorkspaceId: number | null = null;

    if (employeeRoles.includes(role)) {
      if (!currentWorkspaceId) {
        return res.status(400).json({ error: "Workspace not set for your account. Cannot create employee." });
      }
      targetWorkspaceId = currentWorkspaceId;
    } else {
      // It's a newly registered Admin
      if (role === "AdminCreator" || role === "AdminManager") {
        const wName = workspace_name || `Workspace for ${full_name}`;
        
        let cleanName = wName;
        const existsCheck = db.prepare("SELECT id FROM workspaces WHERE name = ?").get(cleanName);
        if (existsCheck) {
          cleanName = `${wName} (${Math.floor(Math.random()*1000)})`;
        }

        const wResult = db.prepare("INSERT INTO workspaces (name) VALUES (?)").run(cleanName);
        targetWorkspaceId = Number(wResult.lastInsertRowid);

        // Seed site settings for the new workspace!
        db.prepare(`
          INSERT INTO site_settings (office_name, latitude, longitude, wifi_ssid, wifi_ip, use_wifi_verification, workspace_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(cleanName, 9.0227, 38.7460, 'Apex_HQ_WiFi', '192.168.1.100', 1, targetWorkspaceId);

        // Seed QR code
        const now = new Date();
        const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        db.prepare(`
          INSERT INTO qr_codes (code, generated_at, expires_at, workspace_id)
          VALUES (?, ?, ?, ?)
        `).run(`QR-${targetWorkspaceId}-${Math.floor(Math.random()*10000)}`, now.toISOString(), expires.toISOString(), targetWorkspaceId);
      }
    }

    if (targetWorkspaceId !== null) {
      const workspaceExists = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(targetWorkspaceId);
      if (!workspaceExists) {
        return res.status(400).json({ error: "Assigned workspace no longer exists. Please contact support." });
      }
    }

    const result = db.prepare(`
      INSERT INTO users (full_name, phone_number, role, password, photo, hourly_rate, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, phone_number, role, passwordHash, photo || null, rateValue, targetWorkspaceId);

    const userId = Number(result.lastInsertRowid);

    // Initialize attendance score
    db.prepare(`
      INSERT INTO attendance_scores (user_id, attendance_score, punctuality_percentage, late_count)
      VALUES (?, 100.0, 100.0, 0)
    `).run(userId);

    const responsePayload = {
      success: true,
      user: {
        id: userId,
        full_name,
        phone_number,
        role,
        hourly_rate: rateValue,
        workspace_id: targetWorkspaceId
      },
    };
    
    console.log("Registration successful, sending response");
    try {
      JSON.stringify(responsePayload);
      res.json(responsePayload);
    } catch (jsonErr) {
      console.error("JSON serialization error in registration:", jsonErr);
      res.status(500).json({ error: "Response serialization failed" });
    }
  } catch (error: any) {
    console.error("Employee registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch List of Employees (Isolated)
app.get("/api/employees", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["SuperAdmin", "AdminCreator", "AdminManager", "Bootstrap"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    let employees;
    if (currentRole === "SuperAdmin") {
      employees = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, u.role, u.photo, u.hourly_rate, u.registration_date, w.name as workspace_name, u.workspace_id
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        ORDER BY u.role DESC, u.full_name ASC
      `).all();
    } else if (currentRole === "Bootstrap") {
      employees = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, u.role, u.photo, u.hourly_rate, u.registration_date, w.name as workspace_name, u.workspace_id
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.role IN ('AdminCreator', 'AdminManager', 'SuperAdmin', 'Bootstrap')
        ORDER BY u.role DESC, u.full_name ASC
      `).all();
    } else {
      employees = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, u.role, u.photo, u.hourly_rate, u.registration_date, w.name as workspace_name, u.workspace_id
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.workspace_id = ?
        ORDER BY u.role DESC, u.full_name ASC
      `).all(currentWorkspaceId);
    }

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Employee Details (Isolated)
app.put("/api/employees/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied. Action not allowed for your role." });
  }

  const { id } = req.params;
  const { full_name, phone_number, role, hourly_rate, password } = req.body;

  if (!full_name || !phone_number || !role) {
    return res.status(400).json({ error: "Full name, phone number, and role are required" });
  }

  const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];

  if (currentRole === "AdminManager") {
    if (!employeeRoles.includes(role)) {
      return res.status(403).json({ error: "Access denied. Second Workspace Managing Admin cannot register or set user roles to Admin." });
    }
  }

  try {
    // Check if employee is in the same workspace
    const employee: any = db.prepare("SELECT role, workspace_id FROM users WHERE id = ?").get(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }
    if (employee.workspace_id !== currentWorkspaceId) {
      return res.status(403).json({ error: "Access denied. Data isolation violation." });
    }

    if (currentRole === "AdminManager" && !employeeRoles.includes(employee.role)) {
      return res.status(403).json({ error: "Access denied. Second Workspace Managing Admin cannot modify other Admin accounts." });
    }

    // Check if phone number is taken by another user
    const existing = db.prepare("SELECT id FROM users WHERE phone_number = ? AND id != ?").get(phone_number, id);
    if (existing) {
      return res.status(400).json({ error: "Another user is already registered with this phone number" });
    }

    const rateValue = parseFloat(hourly_rate) || 0.0;

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare(`
        UPDATE users 
        SET full_name = ?, phone_number = ?, role = ?, hourly_rate = ?, password = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(full_name, phone_number, role, rateValue, passwordHash, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET full_name = ?, phone_number = ?, role = ?, hourly_rate = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(full_name, phone_number, role, rateValue, id);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Employee update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Employee (Isolated)
app.delete("/api/employees/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;

  if (parseInt(id) === req.user?.id) {
    return res.status(400).json({ error: "You cannot delete your own admin account." });
  }

  const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];

  try {
    const employee: any = db.prepare("SELECT role, workspace_id FROM users WHERE id = ?").get(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }
    if (employee.workspace_id !== currentWorkspaceId) {
      return res.status(403).json({ error: "Access denied. Data isolation violation." });
    }

    if (currentRole === "AdminManager" && !employeeRoles.includes(employee.role)) {
      return res.status(403).json({ error: "Access denied. Second Workspace Managing Admin cannot delete other Admin accounts." });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Employee deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Employee Hourly Rate (Isolated)
app.put("/api/employees/:id/hourly-rate", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { hourly_rate } = req.body;

  if (hourly_rate === undefined || isNaN(parseFloat(hourly_rate))) {
    return res.status(400).json({ error: "Valid hourly rate is required" });
  }

  try {
    const employee: any = db.prepare("SELECT workspace_id FROM users WHERE id = ?").get(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }
    if (employee.workspace_id !== currentWorkspaceId) {
      return res.status(403).json({ error: "Access denied. Data isolation violation." });
    }

    db.prepare("UPDATE users SET hourly_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(parseFloat(hourly_rate), id);
    res.json({ success: true, hourly_rate: parseFloat(hourly_rate) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch workspaces list
app.get("/api/workspaces", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = db.prepare("SELECT * FROM workspaces ORDER BY name ASC").all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 4: PROFILE MANAGEMENT API ---

// Get current profile
app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user: any = db.prepare(`
      SELECT u.id, u.full_name, u.phone_number, u.role, u.photo, u.hourly_rate, u.registration_date, u.workspace_id, w.name as workspace_name
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.id = ?
    `).get(req.user?.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Profile
app.put("/api/auth/profile", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { full_name, phone_number, password, current_password, new_password, photo } = req.body;

  if (!full_name || !phone_number) {
    return res.status(400).json({ error: "Full name and phone number are required" });
  }

  try {
    // Check if phone number is taken by another user
    const existing: any = db.prepare("SELECT id FROM users WHERE phone_number = ? AND id != ?").get(phone_number, req.user?.id);
    if (existing) {
      return res.status(400).json({ error: "Phone number is already in use by another user" });
    }

    let query = "UPDATE users SET full_name = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP";
    const params: any[] = [full_name, phone_number];

    if (photo !== undefined) {
      query += ", photo = ?";
      params.push(photo);
    }

    // Support both new_password (with current_password check) and legacy password field
    const targetPassword = new_password || password;
    if (targetPassword) {
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ error: "Current password is required to change password" });
        }
        const userRecord: any = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user?.id);
        if (!userRecord || !bcrypt.compareSync(current_password, userRecord.password)) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }
      }
      
      const passwordHash = bcrypt.hashSync(targetPassword, 10);
      query += ", password = ?";
      params.push(passwordHash);
    }

    query += " WHERE id = ?";
    params.push(req.user?.id);

    db.prepare(query).run(...params);

    const updatedUser: any = db.prepare(`
      SELECT u.id, u.full_name, u.phone_number, u.role, u.photo, u.hourly_rate, u.workspace_id, w.name as workspace_name
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.id = ?
    `).get(req.user?.id);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 3: ATTENDANCE WORKFLOWS ---

// Get today's attendance status
app.get("/api/attendance/today", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const todayStr = getEthiopianDateString();

  try {
    const records = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").all(req.user?.id, todayStr);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: Haversine distance formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Location and Wi-Fi verification helper (Workspace-aligned)
function validateLocationAndWifi(req: Request, body: any, workspaceId: number): { isValid: boolean; error?: string; method?: string; wifiMatched: boolean } {
  const settings: any = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
  if (!settings) {
    return { isValid: true, method: "No site settings configured for workspace", wifiMatched: false };
  }

  const { wifi_ip, wifi_ssid, use_wifi_verification, latitude: officeLat, longitude: officeLon } = settings;
  const clientProvidedIp = body.wifi_ip;
  const clientProvidedSsid = body.wifi_ssid;

  // Read remote client IP
  const serverIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  const serverIpStr = Array.isArray(serverIp) ? serverIp[0] : serverIp;

  // Primary: Check if Office Wi-Fi is preset/enabled and matches client IP/SSID
  const isWifiPreset = (use_wifi_verification === 1) && (wifi_ip || wifi_ssid);

  if (isWifiPreset) {
    const ipMatches = (wifi_ip && (
      (clientProvidedIp && clientProvidedIp === wifi_ip) ||
      (serverIpStr && serverIpStr.includes(wifi_ip))
    ));
    const ssidMatches = (wifi_ssid && clientProvidedSsid && clientProvidedSsid === wifi_ssid);

    if (ipMatches || ssidMatches) {
      return {
        isValid: true,
        wifiMatched: true,
        method: `Office Wi-Fi Connected (SSID: ${clientProvidedSsid || wifi_ssid}, IP: ${clientProvidedIp || serverIpStr})`
      };
    }
  }

  return {
    isValid: false,
    wifiMatched: false,
    error: `Designated workspace Wi-Fi not detected.`
  };
}

// Get Site Settings (Workspace Isolated)
app.get("/api/site-settings", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace not found for your account." });
  }

  try {
    // Verify workspace existence first to avoid foreign key errors with stale data
    const workspace = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(workspaceId);
    if (!workspace) {
      return res.status(403).json({ error: "Your assigned workspace no longer exists. Please log in again." });
    }

    let settings = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
    if (!settings) {
      // Seed site settings for this workspace
      db.prepare(`
        INSERT INTO site_settings (office_name, latitude, longitude, wifi_ssid, wifi_ip, use_wifi_verification, workspace_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('Main Head Office', 9.0227, 38.7460, 'Apex_HQ_WiFi', '192.168.1.100', 1, workspaceId);
      settings = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
    }
    res.json(settings);
  } catch (error) {
    console.error("Get site settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Site Settings (Workspace Isolated & Admin Only)
app.put("/api/site-settings", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  const role = req.user?.role;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(role || "")) {
    return res.status(403).json({ error: "Access denied. Action not allowed for your role." });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace not found for your account." });
  }

  const { office_name, latitude, longitude, wifi_ssid, wifi_ip, use_wifi_verification } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Office latitude and longitude are required" });
  }

  try {
    db.prepare(`
      UPDATE site_settings 
      SET office_name = ?, 
          latitude = ?, 
          longitude = ?, 
          wifi_ssid = ?, 
          wifi_ip = ?, 
          use_wifi_verification = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ?
    `).run(
      office_name || "Main Head Office",
      parseFloat(latitude),
      parseFloat(longitude),
      wifi_ssid || "",
      wifi_ip || "",
      use_wifi_verification ? 1 : 0,
      workspaceId
    );

    // Sync company/workspace name if customized
    if (office_name) {
      db.prepare("UPDATE workspaces SET name = ? WHERE id = ?").run(office_name, workspaceId);
    }

    const updated = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Update site settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check-In (Supports QR, Wi-Fi and Geofence validation for employees)
app.post("/api/attendance/check-in", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === "Bootstrap") {
    return res.status(403).json({ error: "Access Denied. Setup Bootstrap account cannot log attendance." });
  }

  const { qr_code, latitude, longitude, accuracy, wifi_ssid, wifi_ip, session, simulated_time } = req.body;
  const todayStr = getEthiopianDateString();
  const nowTimeStr = simulated_time || getEthiopianTimeString(); // HH:MM:SS

  // Determine active session strictly based on check-in time (before 06:00 Ethiopian time / 12:00 PM standard is Morning):
  const activeSession = nowTimeStr < "06:00:00" ? "Morning" : "Afternoon";

  const complianceRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR", "AdminCreator", "AdminManager"];

  try {
    // Prevent simultaneous attendance:
    const activeCheckIn: any = db.prepare(`
      SELECT session FROM attendance 
      WHERE user_id = ? AND date = ? AND check_out_time IS NULL
    `).get(req.user?.id, todayStr);

    if (activeCheckIn) {
      return res.status(400).json({ 
        error: `Simultaneous session attendance is not allowed. You are currently checked in for the ${activeCheckIn.session} session. Please check out first.` 
      });
    }

    // Also enforce that they can only request the session matching the time-based restriction
    if (session && session !== activeSession) {
      return res.status(400).json({
        error: `Check-in time (${nowTimeStr}) is for the ${activeSession} session. You cannot check in for the ${session} session.`
      });
    }

    // Check if already checked in and completed this session today
    const existing = db.prepare("SELECT id FROM attendance WHERE user_id = ? AND date = ? AND session = ?").get(req.user?.id, todayStr, activeSession);
    if (existing) {
      return res.status(400).json({ error: `You have already attended the ${activeSession} session today` });
    }
    // Employee must satisfy Wi-Fi IP Mode OR QR + GPS Fallback
    if (complianceRoles.includes(req.user?.role || "")) {
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId) {
        return res.status(400).json({ error: "User does not belong to any workspace" });
      }

      // Check primary Wi-Fi compliance
      const compliance = validateLocationAndWifi(req, req.body, workspaceId);
      if (compliance.isValid && compliance.wifiMatched) {
        console.log(`Checked in via primary Wi-Fi IP mode: ${compliance.method}`);
      } else {
        // Fallback: QR + GPS Geofencing
        // 1. QR Scan check
        if (!qr_code) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. Checking in via GPS fallback requires scanning the active Site QR Code." });
        }
        const activeQR: any = db.prepare("SELECT * FROM qr_codes WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").get(workspaceId);
        if (!activeQR || activeQR.code !== qr_code) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. Invalid QR Code scanned. Please scan the current site QR Code." });
        }

        // 2. GPS check
        if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. GPS coordinates are required for geographical boundary validation." });
        }

        const settings: any = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
        if (settings) {
          const { latitude: officeLat, longitude: officeLon } = settings;
          const distance = getDistance(parseFloat(latitude), parseFloat(longitude), officeLat, officeLon);
          const clientAccuracy = parseFloat(accuracy);
          const isGpsLowQuality = !isNaN(clientAccuracy) && clientAccuracy > 15;
          const allowedRadius = isGpsLowQuality ? 50 : 30;

          if (distance > allowedRadius) {
            return res.status(400).json({
              error: `Office Wi-Fi not detected. GPS validation failed. You are ${distance.toFixed(1)}m away from the office location. ` +
                `Your GPS accuracy is ${!isNaN(clientAccuracy) ? clientAccuracy.toFixed(1) : "unknown"}m, which allows a maximum distance of ${allowedRadius}m.`
            });
          }
        }
      }
    }

    // Determine punctuality (Ethiopian shift start: Morning is 02:00:00 (08:00 AM standard), Afternoon is 07:00:00 (01:00 PM standard))
    let isLate = false;
    if (activeSession === "Morning") {
      isLate = nowTimeStr > "02:00:00";
    } else {
      isLate = nowTimeStr > "07:00:00";
    }
    const status = isLate ? "Late" : "Present";

    db.prepare(`
      INSERT INTO attendance (user_id, date, session, check_in_time, status, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user?.id, todayStr, activeSession, nowTimeStr, status, req.user?.workspace_id);

    // Recalculate attendance score for the user
    updateAttendanceScore(req.user?.id!);

    res.json({ success: true, check_in_time: nowTimeStr, session: activeSession, status });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check-Out (Supports Wi-Fi and Geofence validation for employees)
app.post("/api/attendance/check-out", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === "Bootstrap") {
    return res.status(403).json({ error: "Access Denied. Setup Bootstrap account cannot log attendance." });
  }

  const { qr_code, latitude, longitude, accuracy, wifi_ssid, wifi_ip, session, simulated_time } = req.body;
  const todayStr = getEthiopianDateString();
  const nowTimeStr = simulated_time || getEthiopianTimeString(); // HH:MM:SS
  const complianceRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR", "AdminCreator", "AdminManager"];

  try {
    let record: any;
    if (session) {
      record = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ? AND session = ?").get(req.user?.id, todayStr, session);
    } else {
      record = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ? AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1").get(req.user?.id, todayStr);
    }

    if (!record) {
      return res.status(400).json({ error: session ? `No check-in record found for the ${session} session today. You must check in first.` : "No active check-in record found for today. You must check in first." });
    }

    if (record.check_out_time) {
      return res.status(400).json({ error: `You have already checked out of the ${record.session} session today` });
    }

    // Employee must satisfy Wi-Fi IP Mode OR QR + GPS Fallback to check out
    if (complianceRoles.includes(req.user?.role || "")) {
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId) {
        return res.status(400).json({ error: "User does not belong to any workspace" });
      }

      // Check primary Wi-Fi compliance
      const compliance = validateLocationAndWifi(req, req.body, workspaceId);
      if (compliance.isValid && compliance.wifiMatched) {
        console.log(`Checked out via primary Wi-Fi IP mode: ${compliance.method}`);
      } else {
        // Fallback: QR + GPS Geofencing
        // 1. QR Scan check
        if (!qr_code) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. Checking out via GPS fallback requires scanning the active Site QR Code." });
        }
        const activeQR: any = db.prepare("SELECT * FROM qr_codes WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").get(workspaceId);
        if (!activeQR || activeQR.code !== qr_code) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. Invalid QR Code scanned. Please scan the current site QR Code." });
        }

        // 2. GPS check
        if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
          return res.status(400).json({ error: "Office Wi-Fi not detected. GPS coordinates are required for geographical boundary validation." });
        }

        const settings: any = db.prepare("SELECT * FROM site_settings WHERE workspace_id = ?").get(workspaceId);
        if (settings) {
          const { latitude: officeLat, longitude: officeLon } = settings;
          const distance = getDistance(parseFloat(latitude), parseFloat(longitude), officeLat, officeLon);
          const clientAccuracy = parseFloat(accuracy);
          const isGpsLowQuality = !isNaN(clientAccuracy) && clientAccuracy > 15;
          const allowedRadius = isGpsLowQuality ? 50 : 30;

          if (distance > allowedRadius) {
            return res.status(400).json({
              error: `Office Wi-Fi not detected. GPS validation failed. You are ${distance.toFixed(1)}m away from the office location. ` +
                `Your GPS accuracy is ${!isNaN(clientAccuracy) ? clientAccuracy.toFixed(1) : "unknown"}m, which allows a maximum distance of ${allowedRadius}m.`
            });
          }
        }
      }
    }

    // Calculate total hours worked
    const checkInTime = record.check_in_time || (record.session === "Morning" ? "02:00:00" : "07:00:00");
    const checkInParts = checkInTime.split(":");
    const checkOutParts = nowTimeStr.split(":");

    const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
    const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);

    let diffMinutes = checkOutMinutes - checkInMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
    const totalHours = Math.max(0, parseFloat((diffMinutes / 60).toFixed(2)));

    db.prepare(`
      UPDATE attendance 
      SET check_out_time = ?, total_hours = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(nowTimeStr, totalHours, record.id);

    // Recalculate score
    updateAttendanceScore(req.user?.id!);

    res.json({ success: true, check_out_time: nowTimeStr, total_hours: totalHours, session: record.session });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: Recalculate attendance metrics and score
function updateAttendanceScore(userId: number) {
  try {
    const records: any[] = db.prepare("SELECT * FROM attendance WHERE user_id = ?").all(userId);
    const approvedPermissions: any[] = db.prepare(`
      SELECT * FROM permissions 
      WHERE user_id = ? AND status = 'Approved'
    `).all(userId);

    // Create a set of dates where user was present or had permission
    const presentDates = new Set<string>();
    records.forEach(r => {
      if (["Present", "Late", "Permission", "Authorized"].includes(r.status)) {
        presentDates.add(r.date);
      }
    });

    approvedPermissions.forEach(p => {
      const dates = getDatesInRange(p.approved_from_date || p.start_date, p.approved_to_date || p.end_date);
      dates.forEach(d => presentDates.add(d));
    });

    const totalDays = records.length; // This might be problematic if we want to include days they were only present via permission
    // Actually, totalDays should probably be the union of attendance record dates and permission dates in the relevant period.
    // But let's keep it simple for now as per current logic but just adjust presentCount.

    const lateCount = records.filter(r => r.status === "Late").length;
    const presentCount = presentDates.size;
    
    // Adjust totalDays if there are permissions on dates with no attendance record
    const allRelevantDates = new Set<string>();
    records.forEach(r => allRelevantDates.add(r.date));
    approvedPermissions.forEach(p => {
      const dates = getDatesInRange(p.approved_from_date || p.start_date, p.approved_to_date || p.end_date);
      dates.forEach(d => allRelevantDates.add(d));
    });
    
    const adjustedTotalDays = allRelevantDates.size;

    const punctualityPercentage = presentCount > 0 ? parseFloat(((presentCount - lateCount) / presentCount * 100).toFixed(1)) : 100.0;
    
    const presentRatio = adjustedTotalDays > 0 ? (presentCount / adjustedTotalDays) * 100 : 100.0;
    const attendanceScore = parseFloat((punctualityPercentage * 0.5 + presentRatio * 0.5).toFixed(1));

    db.prepare(`
      INSERT INTO attendance_scores (user_id, attendance_score, punctuality_percentage, late_count, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        attendance_score = excluded.attendance_score,
        punctuality_percentage = excluded.punctuality_percentage,
        late_count = excluded.late_count,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, attendanceScore, punctualityPercentage, lateCount);
  } catch (error) {
    console.error("Error recalculating attendance score:", error);
  }
}

function getDatesInRange(startStr: string, endStr: string): string[] {
  try {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split("-").map(Number);
    const [ey, em, ed] = endStr.split("-").map(Number);
    
    if (!sy || !sm || !sd || !ey || !em || !ed) return [startStr];

    const currentG = toGregorian(sy, sm, sd);
    const endG = toGregorian(ey, em, ed);
    
    const currDate = new Date(currentG[0], currentG[1] - 1, currentG[2]);
    const endDate = new Date(endG[0], endG[1] - 1, endG[2]);
    
    while (currDate <= endDate) {
      const [eyy, emm, edd] = toEthiopian(currDate.getFullYear(), currDate.getMonth() + 1, currDate.getDate());
      dates.push(`${eyy}-${String(emm).padStart(2, "0")}-${String(edd).padStart(2, "0")}`);
      currDate.setDate(currDate.getDate() + 1);
    }
    return dates;
  } catch (err) {
    console.error("Error in getDatesInRange:", err);
    return [startStr];
  }
}

// Fetch all attendance logs (SuperAdmin sees all, Bootstrap sees none, Admin sees workspace, Employee sees own)
app.get("/api/attendance/history", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  try {
    let logs: any[];
    if (currentRole === "SuperAdmin") {
      logs = db.prepare(`
        SELECT a.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN workspaces w ON a.workspace_id = w.id
        ORDER BY a.date DESC, a.check_in_time DESC
      `).all();
    } else if (currentRole === "Bootstrap") {
      logs = [];
    } else if (currentRole === "AdminCreator" || currentRole === "AdminManager") {
      logs = db.prepare(`
        SELECT a.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN workspaces w ON a.workspace_id = w.id
        WHERE a.workspace_id = ?
        ORDER BY a.date DESC, a.check_in_time DESC
      `).all(currentWorkspaceId);
    } else {
      logs = db.prepare(`
        SELECT a.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN workspaces w ON a.workspace_id = w.id
        WHERE a.user_id = ?
        ORDER BY a.date DESC, a.check_in_time DESC
      `).all(req.user?.id);
    }

    // Synthesize "Present" records for approved permissions
    let permissions: any[];
    if (currentRole === "SuperAdmin") {
      permissions = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN workspaces w ON p.workspace_id = w.id
        WHERE p.status = 'Approved'
      `).all();
    } else if (currentRole === "AdminCreator" || currentRole === "AdminManager") {
      permissions = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN workspaces w ON p.workspace_id = w.id
        WHERE p.status = 'Approved' AND p.workspace_id = ?
      `).all(currentWorkspaceId);
    } else {
      permissions = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number, u.role, w.name as workspace_name
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN workspaces w ON p.workspace_id = w.id
        WHERE p.status = 'Approved' AND p.user_id = ?
      `).all(req.user?.id);
    }

    const mergedLogs = [...logs];
    permissions.forEach(p => {
      const dates = getDatesInRange(p.approved_from_date || p.start_date, p.approved_to_date || p.end_date);
      dates.forEach(d => {
        ['Morning', 'Afternoon'].forEach(sess => {
          const exists = logs.some(l => l.user_id === p.user_id && l.date === d && l.session === sess);
          if (!exists) {
            mergedLogs.push({
              id: `perm-${p.id}-${d}-${sess}`,
              user_id: p.user_id,
              date: d,
              session: sess,
              check_in_time: null,
              check_out_time: null,
              total_hours: 4.0,
              status: "Present",
              full_name: p.full_name,
              phone_number: p.phone_number,
              role: p.role,
              workspace_name: p.workspace_name || "N/A"
            });
          }
        });
      });
    });

    mergedLogs.sort((a, b) => b.date.localeCompare(a.date));
    res.json(mergedLogs);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 1: ANALYTICS DASHBOARD API ---
app.get("/api/attendance/dashboard", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["SuperAdmin", "AdminCreator", "AdminManager", "Bootstrap"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { filter, start_date, end_date } = req.query;

  try {
    const todayStr = getEthiopianDateString();

    // Total active employees
    let employeesCount: any;
    if (currentRole === "SuperAdmin") {
      employeesCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR')").get();
    } else if (currentRole === "Bootstrap") {
      employeesCount = { count: 0 };
    } else {
      employeesCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR') AND workspace_id = ?").get(currentWorkspaceId);
    }
    const totalEmployees = employeesCount.count || 0;

    // Daily active check-ins
    let todayCheckIns: any[];
    if (currentRole === "SuperAdmin") {
      todayCheckIns = db.prepare(`
        SELECT a.user_id, a.status 
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date = ? AND u.role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR')
      `).all(todayStr);
    } else if (currentRole === "Bootstrap") {
      todayCheckIns = [];
    } else {
      todayCheckIns = db.prepare(`
        SELECT a.user_id, a.status 
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date = ? AND a.workspace_id = ? AND u.role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR')
      `).all(todayStr, currentWorkspaceId);
    }

    const uniquePresentUserIds = new Set<number>();
    const uniqueLateUserIds = new Set<number>();

    todayCheckIns.forEach(c => {
      if (["Present", "Late", "Permission", "Authorized"].includes(c.status)) {
        uniquePresentUserIds.add(c.user_id);
        if (c.status === "Late") {
          uniqueLateUserIds.add(c.user_id);
        }
      }
    });

    // Approved permissions count as "Present" (even if they didn't check in)
    let approvedPermissions: any[];
    if (currentRole === "SuperAdmin") {
      approvedPermissions = db.prepare(`
        SELECT user_id FROM permissions 
        WHERE status = 'Approved' 
        AND ? BETWEEN COALESCE(approved_from_date, start_date) AND COALESCE(approved_to_date, end_date)
      `).all(todayStr);
    } else {
      approvedPermissions = db.prepare(`
        SELECT user_id FROM permissions 
        WHERE status = 'Approved' 
        AND workspace_id = ?
        AND ? BETWEEN COALESCE(approved_from_date, start_date) AND COALESCE(approved_to_date, end_date)
      `).all(currentWorkspaceId, todayStr);
    }
    approvedPermissions.forEach(p => uniquePresentUserIds.add(p.user_id));

    // Approved attendance requests also count as "Present"
    let approvedAttendanceReqs: any[];
    if (currentRole === "SuperAdmin") {
      approvedAttendanceReqs = db.prepare(`
        SELECT user_id FROM attendance_requests
        WHERE status = 'Approved' AND date = ?
      `).all(todayStr);
    } else {
      approvedAttendanceReqs = db.prepare(`
        SELECT user_id FROM attendance_requests
        WHERE status = 'Approved' AND date = ? AND workspace_id = ?
      `).all(todayStr, currentWorkspaceId);
    }
    approvedAttendanceReqs.forEach(r => uniquePresentUserIds.add(r.user_id));

    const presentToday = uniquePresentUserIds.size;
    const lateToday = uniqueLateUserIds.size;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    // Historical filters
    let dateFilterClause = "";
    const params: any[] = [];
    const now = new Date();

    if (filter === "Today") {
      dateFilterClause = "AND date = ?";
      params.push(todayStr);
    } else if (filter === "Week") {
      const oneWeekAgo = getEthiopianDateString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneWeekAgo);
    } else if (filter === "Month") {
      const oneMonthAgo = getEthiopianDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneMonthAgo);
    } else if (filter === "Year") {
      const oneYearAgo = getEthiopianDateString(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneYearAgo);
    } else if (filter === "Custom" && start_date && end_date) {
      dateFilterClause = "AND date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else {
      // Default: Last 30 Days
      const thirtyDaysAgo = getEthiopianDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(thirtyDaysAgo);
    }

    // Apply workspace filter to aggregates, trends and performance
    let workspaceFilterClause = "";
    let perfWorkspaceFilterClause = "";
    const aggParams = [...params];
    const trendParams = [...params];
    const perfParams = [...params];

    if (currentRole === "SuperAdmin") {
      workspaceFilterClause = "";
      perfWorkspaceFilterClause = "";
    } else if (currentRole === "Bootstrap") {
      workspaceFilterClause = "AND workspace_id = -1";
      perfWorkspaceFilterClause = "AND a.workspace_id = -1";
    } else {
      workspaceFilterClause = "AND workspace_id = ?";
      perfWorkspaceFilterClause = "AND a.workspace_id = ?";
      aggParams.push(currentWorkspaceId);
      trendParams.push(currentWorkspaceId);
      perfParams.push(currentWorkspaceId);
    }

    // Aggregates over the filter
    const aggregates: any = db.prepare(`
      SELECT 
        SUM(total_hours) as total_working_hours,
        AVG(total_hours) as avg_working_hours,
        COUNT(id) as total_present_records
      FROM attendance
      WHERE 1=1 ${dateFilterClause} ${workspaceFilterClause}
    `).get(...aggParams);

    const totalWorkingHours = parseFloat((aggregates.total_working_hours || 0).toFixed(1));
    const avgWorkingHours = parseFloat((aggregates.avg_working_hours || 0).toFixed(1));

    // Chart: Daily and Monthly Trends
    const trends: any[] = db.prepare(`
      SELECT date, COUNT(id) as present_count, SUM(total_hours) as working_hours
      FROM attendance
      WHERE 1=1 ${dateFilterClause} ${workspaceFilterClause}
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `).all(...trendParams);

    // Chart: Employee Performance Trend
    let performance: any[] = [];
    if (currentRole !== "Bootstrap") {
      performance = db.prepare(`
        SELECT u.full_name, AVG(a.total_hours) as avg_hours, COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1 ${dateFilterClause} ${perfWorkspaceFilterClause}
        GROUP BY u.id
        ORDER BY avg_hours DESC
      `).all(...perfParams);
    }

    res.json({
      summary: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        totalWorkingHours,
        avgWorkingHours,
      },
      trends,
      performance,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 2: APPROVALS (PERMISSION REQUESTS) ---

// Get permission requests (SuperAdmin/Admin workspace-aligned, Employee sees own)
app.get("/api/permissions", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  try {
    let requests;
    if (currentRole === "SuperAdmin") {
      requests = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `).all();
    } else if (currentRole === "Bootstrap") {
      requests = [];
    } else if (currentRole === "AdminCreator" || currentRole === "AdminManager") {
      requests = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        WHERE p.workspace_id = ?
        ORDER BY p.created_at DESC
      `).all(currentWorkspaceId);
    } else {
      requests = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user?.id);
    }
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create permission request
app.post("/api/permissions", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === "Bootstrap") {
    return res.status(403).json({ error: "Access Denied. Setup Bootstrap account cannot request leaves." });
  }

  const { request_type, reason, start_date, end_date } = req.body;

  if (!request_type || !reason || !start_date || !end_date) {
    return res.status(400).json({ error: "Request type, reason, start date, and end date are required" });
  }

  // Convert Gregorian dates from client to Ethiopian for storage
  const ethStart = convertGregorianToEthiopianDate(start_date);
  const ethEnd = convertGregorianToEthiopianDate(end_date);

  if (!["Permission", "Sick Leave", "Annual Leave"].includes(request_type)) {
    return res.status(400).json({ error: "Invalid request type" });
  }

  try {
    db.prepare(`
      INSERT INTO permissions (user_id, request_type, reason, start_date, end_date, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user?.id, request_type, reason, ethStart, ethEnd, req.user?.workspace_id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/Reject permission request (Admin Only, Workspace Isolated)
app.put("/api/permissions/:id/approve", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { status, approved_from_date, approved_to_date } = req.body;

  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }

  try {
    // Isolate by workspace
    const targetPermission: any = db.prepare("SELECT * FROM permissions WHERE id = ?").get(id);
    if (!targetPermission) {
      return res.status(404).json({ error: "Permission request not found." });
    }
    if (targetPermission.workspace_id !== currentWorkspaceId) {
      return res.status(403).json({ error: "Access denied. Workspace isolation violation." });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE permissions
        SET status = ?, approved_from_date = ?, approved_to_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, approved_from_date || null, approved_to_date || null, id);

      if (status === "Approved") {
        const fromDate = approved_from_date ? approved_from_date : targetPermission.start_date;
        const toDate = approved_to_date ? approved_to_date : targetPermission.end_date;
        
        const dates = getDatesInRange(fromDate, toDate);
        for (const date of dates) {
          for (const session of ["Morning", "Afternoon"]) {
            db.prepare(`
              INSERT INTO attendance (user_id, date, session, status, workspace_id)
              VALUES (?, ?, ?, 'Permission', ?)
              ON CONFLICT(user_id, date, session) DO UPDATE SET
                status = 'Permission',
                updated_at = CURRENT_TIMESTAMP
            `).run(targetPermission.user_id, date, session, currentWorkspaceId);
          }
        }
      } else if (status === "Rejected") {
        // Just update the status, don't overwrite existing attendance records
      }
      
      updateAttendanceScore(targetPermission.user_id);
    })();

    res.json({ success: true });
  } catch (error) {
    console.error("Error approving/rejecting permission request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 2.2: ATTENDANCE REQUESTS APPROVAL ---

// Get attendance requests (SuperAdmin/Admin workspace-aligned, Employee sees own)
app.get("/api/attendance-requests", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  try {
    let requests;
    if (currentRole === "SuperAdmin") {
      requests = db.prepare(`
        SELECT ar.*, u.full_name, u.phone_number
        FROM attendance_requests ar
        JOIN users u ON ar.user_id = u.id
        ORDER BY ar.created_at DESC
      `).all();
    } else if (currentRole === "Bootstrap") {
      requests = [];
    } else if (currentRole === "AdminCreator" || currentRole === "AdminManager") {
      requests = db.prepare(`
        SELECT ar.*, u.full_name, u.phone_number
        FROM attendance_requests ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.workspace_id = ?
        ORDER BY ar.created_at DESC
      `).all(currentWorkspaceId);
    } else {
      requests = db.prepare(`
        SELECT ar.*, u.full_name, u.phone_number
        FROM attendance_requests ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.user_id = ?
        ORDER BY ar.created_at DESC
      `).all(req.user?.id);
    }
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create attendance request
app.post("/api/attendance-requests", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === "Bootstrap") {
    return res.status(403).json({ error: "Access Denied. Setup Bootstrap account cannot request attendance adjustments." });
  }

  const { type, date, check_in_time, check_out_time, reason } = req.body;

  if (!type || !date || !check_in_time || !check_out_time || !reason) {
    return res.status(400).json({ error: "Type, date, check-in, check-out, and reason are required" });
  }

  // Convert Gregorian date from client to Ethiopian for storage
  const ethDate = convertGregorianToEthiopianDate(date);

  if (!["Site Visit", "External Work", "Purchaser Visit"].includes(type)) {
    return res.status(400).json({ error: "Invalid attendance request type" });
  }

  try {
    db.prepare(`
      INSERT INTO attendance_requests (user_id, type, date, check_in_time, check_out_time, reason, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user?.id, type, ethDate, check_in_time, check_out_time, reason, req.user?.workspace_id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/Reject attendance request (Admin Only, Workspace Isolated)
app.put("/api/attendance-requests/:id/approve", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["AdminCreator", "AdminManager"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }

  try {
    const reqDetail: any = db.prepare("SELECT * FROM attendance_requests WHERE id = ?").get(id);
    if (!reqDetail) {
      return res.status(404).json({ error: "Attendance request not found." });
    }
    if (reqDetail.workspace_id !== currentWorkspaceId) {
      return res.status(403).json({ error: "Access denied. Workspace isolation violation." });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE attendance_requests
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, id);

      // Determine session(s) based on check-in and check-out time
      // Ethiopian Noon threshold is 06:00:00
      const targetSessions: string[] = [];
      const threshold = "06:00:00";
      
      const isOvernight = reqDetail.check_out_time < reqDetail.check_in_time;
      
      if (isOvernight) {
        // If overnight, they definitely covered both sessions (or at least parts of them in a cycle)
        targetSessions.push("Morning", "Afternoon");
      } else {
        if (reqDetail.check_in_time < threshold) targetSessions.push("Morning");
        if (reqDetail.check_out_time > threshold) targetSessions.push("Afternoon");
      }
      
      // Fallback if exactly at threshold or ambiguous
      if (targetSessions.length === 0) targetSessions.push(reqDetail.check_in_time < threshold ? "Morning" : "Afternoon");

      if (status === "Approved") {
        const reqCheckIn = reqDetail.check_in_time || "02:00:00";
        const reqCheckOut = reqDetail.check_out_time || "11:00:00";
        const checkInParts = reqCheckIn.split(":");
        const checkOutParts = reqCheckOut.split(":");
        const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
        const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
        let diffMinutes = checkOutMinutes - checkInMinutes;
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
        const totalHours = Math.max(0, parseFloat((diffMinutes / 60).toFixed(2)));

        for (const session of targetSessions) {
          db.prepare(`
            INSERT INTO attendance (user_id, date, session, check_in_time, check_out_time, total_hours, status, workspace_id)
            VALUES (?, ?, ?, ?, ?, ?, 'Authorized', ?)
            ON CONFLICT(user_id, date, session) DO UPDATE SET
              check_in_time = excluded.check_in_time,
              check_out_time = excluded.check_out_time,
              total_hours = excluded.total_hours,
              status = 'Authorized',
              updated_at = CURRENT_TIMESTAMP
          `).run(reqDetail.user_id, reqDetail.date, session, reqDetail.check_in_time, reqDetail.check_out_time, totalHours, currentWorkspaceId);
        }
      } else if (status === "Rejected") {
        // Just update the status, don't overwrite existing attendance records
      }

      updateAttendanceScore(reqDetail.user_id);
    })();

    res.json({ success: true });
  } catch (error) {
    console.error("Error approving attendance request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 5: SALARY MANAGEMENT API ---
app.get("/api/salaries", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  const adminRoles = ["SuperAdmin", "AdminCreator", "AdminManager", "Bootstrap"];
  if (!adminRoles.includes(currentRole || "")) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { filter } = req.query; // Daily, Weekly, Monthly, Yearly

  try {
    let dateFilterClause = "";
    const params: any[] = [];
    const now = new Date();

    if (filter === "Daily") {
      const todayStr = getEthiopianDateString(now);
      dateFilterClause = "AND date = ?";
      params.push(todayStr);
    } else if (filter === "Weekly") {
      const oneWeekAgo = getEthiopianDateString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneWeekAgo);
    } else if (filter === "Yearly") {
      const oneYearAgo = getEthiopianDateString(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneYearAgo);
    } else {
      // Default: Monthly
      const oneMonthAgo = getEthiopianDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      dateFilterClause = "AND date >= ?";
      params.push(oneMonthAgo);
    }

    // Apply Workspace filter to dynamic payroll calculation
    let workspaceFilterClause = "";
    if (currentRole === "SuperAdmin") {
      workspaceFilterClause = "";
    } else if (currentRole === "Bootstrap") {
      workspaceFilterClause = "AND u.workspace_id = -1";
    } else {
      workspaceFilterClause = "AND u.workspace_id = ?";
      params.push(currentWorkspaceId);
    }

    const payroll = db.prepare(`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.phone_number,
        u.hourly_rate,
        SUM(COALESCE(a.total_hours, 0)) as total_hours,
        (SUM(COALESCE(a.total_hours, 0)) * u.hourly_rate) as calculated_salary
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id ${dateFilterClause}
      WHERE u.role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR') ${workspaceFilterClause}
      GROUP BY u.id
      ORDER BY u.full_name ASC
    `).all(...params);

    res.json(payroll);
  } catch (error) {
    console.error("Salary calculation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 7: ATTENDANCE SCORE LISTING ---
app.get("/api/scores", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const currentWorkspaceId = req.user?.workspace_id;

  try {
    let scores;
    if (currentRole === "SuperAdmin") {
      scores = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, 
               COALESCE(s.attendance_score, 100.0) as attendance_score, 
               COALESCE(s.punctuality_percentage, 100.0) as punctuality_percentage, 
               COALESCE(s.late_count, 0) as late_count
        FROM users u
        LEFT JOIN attendance_scores s ON u.id = s.user_id
        WHERE u.role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR')
        ORDER BY attendance_score DESC
      `).all();
    } else if (currentRole === "Bootstrap") {
      scores = [];
    } else if (currentRole === "AdminCreator" || currentRole === "AdminManager") {
      scores = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, 
               COALESCE(s.attendance_score, 100.0) as attendance_score, 
               COALESCE(s.punctuality_percentage, 100.0) as punctuality_percentage, 
               COALESCE(s.late_count, 0) as late_count
        FROM users u
        LEFT JOIN attendance_scores s ON u.id = s.user_id
        WHERE u.role IN ('Employee', 'Purchaser', 'Accountant', 'Engineer', 'HR') AND u.workspace_id = ?
        ORDER BY attendance_score DESC
      `).all(currentWorkspaceId);
    } else {
      scores = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, 
               COALESCE(s.attendance_score, 100.0) as attendance_score, 
               COALESCE(s.punctuality_percentage, 100.0) as punctuality_percentage, 
               COALESCE(s.late_count, 0) as late_count
        FROM users u
        LEFT JOIN attendance_scores s ON u.id = s.user_id
        WHERE u.id = ?
      `).all(req.user?.id);
    }
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 8: QR CODE MANAGEMENT ---

// Get current active QR Code (Workspace aligned)
app.get("/api/qr-code", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) {
    return res.json(null);
  }

  try {
    let qrCode = db.prepare("SELECT * FROM qr_codes WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").get(workspaceId);
    if (!qrCode) {
      // Auto-generate a QR code for this workspace
      const now = new Date();
      const expires = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); 
      const newCode = `CONST-QR-${workspaceId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${now.getFullYear()}`;
      db.prepare(`
        INSERT INTO qr_codes (code, generated_at, expires_at, workspace_id)
        VALUES (?, ?, ?, ?)
      `).run(newCode, now.toISOString(), expires.toISOString(), workspaceId);
      qrCode = db.prepare("SELECT * FROM qr_codes WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").get(workspaceId);
    }
    res.json(qrCode || null);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Regenerate QR Code (Workspace Isolated & Admin Only)
app.post("/api/qr-code/regenerate", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentRole = req.user?.role;
  const workspaceId = req.user?.workspace_id;

  if (currentRole === "SuperAdmin" || currentRole === "Employee" || currentRole === "Bootstrap") {
    return res.status(403).json({ error: "Access denied." });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace not found for your account." });
  }

  try {
    const now = new Date();
    // QR Code does not expire automatically (valid for 100 years)
    const expires = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); 
    const newCode = `CONST-QR-${workspaceId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${now.getFullYear()}`;

    db.prepare(`
      INSERT INTO qr_codes (code, generated_at, expires_at, workspace_id)
      VALUES (?, ?, ?, ?)
    `).run(newCode, now.toISOString(), expires.toISOString(), workspaceId);

    res.json({ success: true, code: newCode, expires_at: expires.toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// --- VITE DEV AND BUILD HANDLERS ---
async function startServer() {
  // Catch-all for undefined /api routes to return JSON instead of HTML
  app.all("/api/*", (req, res) => {
    console.log(`Unmatched API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error (Global Handler)" });
});

startServer();
