import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { db, initDatabase } from "./src/server/database.js";

// Initialize the database and seed it
initDatabase();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "construction-company-secret-key-2026";

app.use(express.json({ limit: "10mb" }));

// --- TYPES FOR REQUESTS ---
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    phone_number: string;
    role: string;
    full_name: string;
  };
}

// --- JWT AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user as any;
    next();
  });
}

// --- MODULE 6: AUTHENTICATION & REGISTRATION API ---

// Login Endpoint
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    return res.status(400).json({ error: "Phone number and password are required" });
  }

  try {
    const user: any = db.prepare("SELECT * FROM users WHERE phone_number = ?").get(phone_number);

    if (!user) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const token = jwt.sign(
      { id: user.id, phone_number: user.phone_number, role: user.role, full_name: user.full_name },
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

// Setup first Admin user when database is empty
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
      INSERT INTO users (full_name, phone_number, role, password, hourly_rate)
      VALUES (?, ?, 'Admin', ?, 35.00)
    `).run(full_name, phone_number, passwordHash);

    const userId = result.lastInsertRowid;

    // Initialize attendance score for the new admin
    db.prepare(`
      INSERT INTO attendance_scores (user_id, attendance_score, punctuality_percentage, late_count)
      VALUES (?, 100.0, 100.0, 0)
    `).run(userId);

    // Create a login token
    const token = jwt.sign(
      { id: userId, phone_number: phone_number, role: "Admin", full_name: full_name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: userId,
        full_name,
        phone_number,
        role: "Admin",
        photo: null,
        hourly_rate: 35.00,
        registration_date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Setup admin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register Employee Endpoint (Admin Only)
app.post("/api/employees/register", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { full_name, phone_number, role, password, photo, hourly_rate } = req.body;

  if (!full_name || !phone_number || !role || !password) {
    return res.status(400).json({ error: "Full name, phone number, role, and password are required" });
  }

  if (role !== "Employee" && role !== "Admin") {
    return res.status(400).json({ error: "Role must be 'Employee' or 'Admin'" });
  }

  try {
    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE phone_number = ?").get(phone_number);
    if (existing) {
      return res.status(400).json({ error: "Employee with this phone number already registered" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const rateValue = parseFloat(hourly_rate) || 15.0;

    const result = db.prepare(`
      INSERT INTO users (full_name, phone_number, role, password, photo, hourly_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(full_name, phone_number, role, passwordHash, photo || null, rateValue);

    const userId = result.lastInsertRowid;

    // Initialize attendance score for the new employee
    db.prepare(`
      INSERT INTO attendance_scores (user_id, attendance_score, punctuality_percentage, late_count)
      VALUES (?, 100.0, 100.0, 0)
    `).run(userId);

    res.status(211).json({
      success: true,
      user: {
        id: userId,
        full_name,
        phone_number,
        role,
        hourly_rate: rateValue,
      },
    });
  } catch (error: any) {
    console.error("Employee registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch List of Employees (Admin Only)
app.get("/api/employees", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const employees = db.prepare(`
      SELECT id, full_name, phone_number, role, photo, hourly_rate, registration_date 
      FROM users 
      ORDER BY role DESC, full_name ASC
    `).all();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Employee Details (Admin Only)
app.put("/api/employees/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { id } = req.params;
  const { full_name, phone_number, role, hourly_rate, password } = req.body;

  if (!full_name || !phone_number || !role) {
    return res.status(400).json({ error: "Full name, phone number, and role are required" });
  }

  if (role !== "Employee" && role !== "Admin") {
    return res.status(400).json({ error: "Role must be 'Employee' or 'Admin'" });
  }

  try {
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

// Delete Employee (Admin Only)
app.delete("/api/employees/:id", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { id } = req.params;

  if (parseInt(id) === req.user?.id) {
    return res.status(400).json({ error: "You cannot delete your own admin account." });
  }

  try {
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Employee deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Employee Hourly Rate (Admin Only)
app.put("/api/employees/:id/hourly-rate", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { hourly_rate } = req.body;

  if (hourly_rate === undefined || isNaN(parseFloat(hourly_rate))) {
    return res.status(400).json({ error: "Valid hourly rate is required" });
  }

  try {
    db.prepare("UPDATE users SET hourly_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(parseFloat(hourly_rate), id);
    res.json({ success: true, hourly_rate: parseFloat(hourly_rate) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 4: PROFILE MANAGEMENT API ---

// Get current profile
app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user: any = db.prepare("SELECT id, full_name, phone_number, role, photo, hourly_rate, registration_date FROM users WHERE id = ?").get(req.user?.id);
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

    const updatedUser: any = db.prepare("SELECT id, full_name, phone_number, role, photo, hourly_rate FROM users WHERE id = ?").get(req.user?.id);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 3: ATTENDANCE WORKFLOWS ---

// Get today's attendance status
app.get("/api/attendance/today", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const todayStr = new Date().toISOString().split("T")[0];

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

// Location and Wi-Fi verification helper
function validateLocationAndWifi(req: Request, body: any): { isValid: boolean; error?: string; method?: string } {
  const settings: any = db.prepare("SELECT * FROM site_settings LIMIT 1").get();
  if (!settings) {
    return { isValid: true, method: "No site settings configured" };
  }

  const { wifi_ip, wifi_ssid, use_wifi_verification, latitude: officeLat, longitude: officeLon } = settings;
  const clientProvidedIp = body.wifi_ip;
  const clientProvidedSsid = body.wifi_ssid;
  const clientLat = parseFloat(body.latitude);
  const clientLon = parseFloat(body.longitude);
  const clientAccuracy = parseFloat(body.accuracy);

  // Read remote client IP
  const serverIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  const serverIpStr = Array.isArray(serverIp) ? serverIp[0] : serverIp;

  // 1. Check if Office Wi-Fi is preset/enabled
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
        method: `Office Wi-Fi Connected (SSID: ${clientProvidedSsid || wifi_ssid}, IP: ${clientProvidedIp || serverIpStr})`
      };
    }
  }

  // 2. Wi-Fi not matched or not available -> restrict to GPS Geofencing (30m or 50m fallback)
  if (isNaN(clientLat) || isNaN(clientLon)) {
    return {
      isValid: false,
      error: isWifiPreset
        ? `Verification failed. You must either connect to the office Wi-Fi (${wifi_ssid || "Preset IP"}) OR enable GPS location services to verify you are on-site.`
        : "GPS location coordinates are required to check in/out, but were not provided. Please enable GPS."
    };
  }

  const distance = getDistance(clientLat, clientLon, officeLat, officeLon);

  // If GPS quality is low (accuracy > 15m), expand allowed radius up to 50 meters. Otherwise restrict to 30 meters.
  const isGpsLowQuality = !isNaN(clientAccuracy) && clientAccuracy > 15;
  const allowedRadius = isGpsLowQuality ? 50 : 30;

  if (distance > allowedRadius) {
    return {
      isValid: false,
      error: `Verification failed. You are ${distance.toFixed(1)}m away from the office location. ` +
        `Your GPS accuracy is ${!isNaN(clientAccuracy) ? clientAccuracy.toFixed(1) : "unknown"}m (${isGpsLowQuality ? "Low Quality" : "High Quality"}), ` +
        `which allows a maximum distance of ${allowedRadius}m.`
    };
  }

  return {
    isValid: true,
    method: `GPS Geofence Verified (${distance.toFixed(1)}m from office, accuracy: ${!isNaN(clientAccuracy) ? clientAccuracy.toFixed(1) : "unknown"}m, allowed: ${allowedRadius}m)`
  };
}

// Get Site Settings
app.get("/api/site-settings", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.prepare("SELECT * FROM site_settings LIMIT 1").get();
    res.json(settings || null);
  } catch (error) {
    console.error("Get site settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Site Settings (Admin Only)
app.put("/api/site-settings", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
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
      WHERE id = (SELECT id FROM site_settings LIMIT 1)
    `).run(
      office_name || "Main Head Office",
      parseFloat(latitude),
      parseFloat(longitude),
      wifi_ssid || "",
      wifi_ip || "",
      use_wifi_verification ? 1 : 0
    );

    const updated = db.prepare("SELECT * FROM site_settings LIMIT 1").get();
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Update site settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check-In (Supports QR, Wi-Fi and Geofence validation for employees)
app.post("/api/attendance/check-in", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { qr_code, latitude, longitude, accuracy, wifi_ssid, wifi_ip, session, simulated_time } = req.body;
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = simulated_time || new Date().toTimeString().split(" ")[0]; // HH:MM:SS

  // Determine active session strictly based on check-in time:
  // "if it is before 06:00 the check in must only for the mornning session if after 06:00 the check in must be for the afternoon session"
  const activeSession = nowTimeStr < "06:00:00" ? "Morning" : "Afternoon";

  try {
    // Prevent simultaneous attendance: "at one time attending for both sessions is not possible"
    // If they have an active check-in (where check_out_time IS NULL), they must check out of that session first.
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

    // Employee must provide a valid active QR code and satisfy Wi-Fi / GPS compliance
    if (req.user?.role === "Employee") {
      if (!qr_code) {
        return res.status(400).json({ error: "Scanning the active Site QR Code is required to check in" });
      }

      const activeQR: any = db.prepare("SELECT * FROM qr_codes ORDER BY id DESC LIMIT 1").get();
      if (!activeQR || activeQR.code !== qr_code) {
        return res.status(400).json({ error: "Invalid QR Code scanned. Please scan the current site QR Code." });
      }

      // Check Wi-Fi and GPS compliance
      const compliance = validateLocationAndWifi(req, req.body);
      if (!compliance.isValid) {
        return res.status(400).json({ error: compliance.error });
      }
    }

    // Determine punctuality (Standard start: Morning is 08:00 AM, Afternoon is 01:00 PM / 13:00)
    let isLate = false;
    if (activeSession === "Morning") {
      isLate = nowTimeStr > "08:00:00";
    } else {
      isLate = nowTimeStr > "13:00:00";
    }
    const status = isLate ? "Late" : "Present";

    db.prepare(`
      INSERT INTO attendance (user_id, date, session, check_in_time, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user?.id, todayStr, activeSession, nowTimeStr, status);

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
  const { latitude, longitude, accuracy, wifi_ssid, wifi_ip, session, simulated_time } = req.body;
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = simulated_time || new Date().toTimeString().split(" ")[0]; // HH:MM:SS

  try {
    let record: any;
    if (session) {
      record = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ? AND session = ?").get(req.user?.id, todayStr, session);
    } else {
      // Fallback: find any checked-in record without a check-out time
      record = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ? AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1").get(req.user?.id, todayStr);
    }

    if (!record) {
      return res.status(400).json({ error: session ? `No check-in record found for the ${session} session today. You must check in first.` : "No active check-in record found for today. You must check in first." });
    }

    if (record.check_out_time) {
      return res.status(400).json({ error: `You have already checked out of the ${record.session} session today` });
    }

    // Employee must satisfy Wi-Fi / GPS compliance to check out
    if (req.user?.role === "Employee") {
      const compliance = validateLocationAndWifi(req, req.body);
      if (!compliance.isValid) {
        return res.status(400).json({ error: compliance.error });
      }
    }

    // Calculate total hours worked
    const checkInTime = record.check_in_time || (record.session === "Morning" ? "08:00:00" : "13:00:00");
    const checkInParts = checkInTime.split(":");
    const checkOutParts = nowTimeStr.split(":");

    const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
    const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);

    const diffMinutes = checkOutMinutes - checkInMinutes;
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
    if (records.length === 0) return;

    const totalDays = records.length;
    const lateCount = records.filter(r => r.status === "Late").length;
    const presentCount = records.filter(r => r.status === "Present" || r.status === "Late").length;

    const punctualityPercentage = totalDays > 0 ? parseFloat(((presentCount - lateCount) / presentCount * 100).toFixed(1)) : 100.0;
    
    // Attendance Score: Base rate of present vs total days, penalty for lates, reward for total hours
    // Simple Score: Punctuality * 0.6 + Present_Ratio * 0.4
    const presentRatio = totalDays > 0 ? (presentCount / totalDays) * 100 : 100.0;
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
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [startStr];
  }
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Fetch all attendance logs (Admin sees all, Employee sees own)
app.get("/api/attendance/history", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    let logs;
    if (req.user?.role === "Admin") {
      logs = db.prepare(`
        SELECT a.*, u.full_name, u.phone_number, u.role
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.date DESC, a.check_in_time DESC
      `).all();
    } else {
      logs = db.prepare(`
        SELECT a.*, u.full_name, u.phone_number, u.role
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ?
        ORDER BY a.date DESC, a.check_in_time DESC
      `).all(req.user?.id);
    }
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 1: ANALYTICS DASHBOARD API ---
app.get("/api/attendance/dashboard", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { filter, start_date, end_date } = req.query;

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // Total active employees
    const employeesCount: any = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Employee'").get();
    const totalEmployees = employeesCount.count || 0;

    // Daily active check-ins
    const todayCheckIns: any[] = db.prepare(`
      SELECT status, total_hours FROM attendance WHERE date = ?
    `).all(todayStr);

    const presentToday = todayCheckIns.length;
    const lateToday = todayCheckIns.filter(c => c.status === "Late").length;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    // Filtered historical analysis for summaries & trends
    let dateFilterClause = "";
    const params: any[] = [];

    const now = new Date();
    if (filter === "Today") {
      dateFilterClause = "AND date = ?";
      params.push(todayStr);
    } else if (filter === "Week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneWeekAgo);
    } else if (filter === "Month") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneMonthAgo);
    } else if (filter === "Year") {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneYearAgo);
    } else if (filter === "Custom" && start_date && end_date) {
      dateFilterClause = "AND date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else {
      // Default: Last 30 Days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(thirtyDaysAgo);
    }

    // Aggregates over the filter
    const aggregates: any = db.prepare(`
      SELECT 
        SUM(total_hours) as total_working_hours,
        AVG(total_hours) as avg_working_hours,
        COUNT(id) as total_present_records
      FROM attendance
      WHERE 1=1 ${dateFilterClause}
    `).get(...params);

    const totalWorkingHours = parseFloat((aggregates.total_working_hours || 0).toFixed(1));
    const avgWorkingHours = parseFloat((aggregates.avg_working_hours || 0).toFixed(1));

    // Chart 1 & 2: Daily and Monthly Trends
    const trends: any[] = db.prepare(`
      SELECT date, COUNT(id) as present_count, SUM(total_hours) as working_hours
      FROM attendance
      WHERE 1=1 ${dateFilterClause}
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `).all(...params);

    // Chart 3: Employee Performance Trend
    const performance: any[] = db.prepare(`
      SELECT u.full_name, AVG(a.total_hours) as avg_hours, COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1 ${dateFilterClause}
      GROUP BY u.id
      ORDER BY avg_hours DESC
    `).all(...params);

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

// Get permission requests (Admin gets all, Employee gets own)
app.get("/api/permissions", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    let requests;
    if (req.user?.role === "Admin") {
      requests = db.prepare(`
        SELECT p.*, u.full_name, u.phone_number
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `).all();
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
  const { request_type, reason, start_date, end_date } = req.body;

  if (!request_type || !reason || !start_date || !end_date) {
    return res.status(400).json({ error: "Request type, reason, start date, and end date are required" });
  }

  if (!["Permission", "Sick Leave", "Annual Leave"].includes(request_type)) {
    return res.status(400).json({ error: "Invalid request type" });
  }

  try {
    db.prepare(`
      INSERT INTO permissions (user_id, request_type, reason, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user?.id, request_type, reason, start_date, end_date);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/Reject permission request (Admin Only)
app.put("/api/permissions/:id/approve", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { status, approved_from_date, approved_to_date } = req.body;

  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE permissions
        SET status = ?, approved_from_date = ?, approved_to_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, approved_from_date || null, approved_to_date || null, id);

      const permission: any = db.prepare("SELECT * FROM permissions WHERE id = ?").get(id);
      if (permission) {
        const fromDate = (status === "Approved" && approved_from_date) ? approved_from_date : permission.start_date;
        const toDate = (status === "Approved" && approved_to_date) ? approved_to_date : permission.end_date;
        
        const dates = getDatesInRange(fromDate, toDate);
        for (const date of dates) {
          for (const session of ["Morning", "Afternoon"]) {
            if (status === "Approved") {
              db.prepare(`
                INSERT INTO attendance (user_id, date, session, status)
                VALUES (?, ?, ?, 'Present')
                ON CONFLICT(user_id, date, session) DO UPDATE SET
                  status = 'Present',
                  updated_at = CURRENT_TIMESTAMP
              `).run(permission.user_id, date, session);
            } else if (status === "Rejected") {
              db.prepare(`
                INSERT INTO attendance (user_id, date, session, check_in_time, check_out_time, total_hours, status)
                VALUES (?, ?, ?, NULL, NULL, 0, 'Absent')
                ON CONFLICT(user_id, date, session) DO UPDATE SET
                  check_in_time = NULL,
                  check_out_time = NULL,
                  total_hours = 0,
                  status = 'Absent',
                  updated_at = CURRENT_TIMESTAMP
              `).run(permission.user_id, date, session);
            }
          }
        }
        
        updateAttendanceScore(permission.user_id);
      }
    })();

    res.json({ success: true });
  } catch (error) {
    console.error("Error approving/rejecting permission request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 2.2: ATTENDANCE REQUESTS APPROVAL ---

// Get attendance requests (Admin gets all, Employee gets own)
app.get("/api/attendance-requests", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    let requests;
    if (req.user?.role === "Admin") {
      requests = db.prepare(`
        SELECT ar.*, u.full_name, u.phone_number
        FROM attendance_requests ar
        JOIN users u ON ar.user_id = u.id
        ORDER BY ar.created_at DESC
      `).all();
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
  const { type, date, check_in_time, check_out_time, reason } = req.body;

  if (!type || !date || !check_in_time || !check_out_time || !reason) {
    return res.status(400).json({ error: "Type, date, check-in, check-out, and reason are required" });
  }

  if (!["Site Visit", "External Work", "Purchaser Visit"].includes(type)) {
    return res.status(400).json({ error: "Invalid attendance request type" });
  }

  try {
    db.prepare(`
      INSERT INTO attendance_requests (user_id, type, date, check_in_time, check_out_time, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user?.id, type, date, check_in_time, check_out_time, reason);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/Reject attendance request (Admin Only)
app.put("/api/attendance-requests/:id/approve", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE attendance_requests
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, id);

      const reqDetail: any = db.prepare("SELECT * FROM attendance_requests WHERE id = ?").get(id);
      if (reqDetail) {
        // Determine session based on check-in time
        const activeSession = reqDetail.check_in_time < "13:00:00" ? "Morning" : "Afternoon";

        if (status === "Approved") {
          // Check total hours
          const reqCheckIn = reqDetail.check_in_time || "08:00:00";
          const reqCheckOut = reqDetail.check_out_time || "12:00:00";
          const checkInParts = reqCheckIn.split(":");
          const checkOutParts = reqCheckOut.split(":");
          const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
          const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
          const diffMinutes = checkOutMinutes - checkInMinutes;
          const totalHours = Math.max(0, parseFloat((diffMinutes / 60).toFixed(2)));

          // Insert or update attendance log
          db.prepare(`
            INSERT INTO attendance (user_id, date, session, check_in_time, check_out_time, total_hours, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Present')
            ON CONFLICT(user_id, date, session) DO UPDATE SET
              check_in_time = excluded.check_in_time,
              check_out_time = excluded.check_out_time,
              total_hours = excluded.total_hours,
              status = 'Present',
              updated_at = CURRENT_TIMESTAMP
          `).run(reqDetail.user_id, reqDetail.date, activeSession, reqDetail.check_in_time, reqDetail.check_out_time, totalHours);
        } else if (status === "Rejected") {
          // Insert or update attendance log to 'Absent'
          db.prepare(`
            INSERT INTO attendance (user_id, date, session, check_in_time, check_out_time, total_hours, status)
            VALUES (?, ?, ?, NULL, NULL, 0, 'Absent')
            ON CONFLICT(user_id, date, session) DO UPDATE SET
              check_in_time = NULL,
              check_out_time = NULL,
              total_hours = 0,
              status = 'Absent',
              updated_at = CURRENT_TIMESTAMP
          `).run(reqDetail.user_id, reqDetail.date, activeSession);
        }

        // Refresh score
        updateAttendanceScore(reqDetail.user_id);
      }
    })();

    res.json({ success: true });
  } catch (error) {
    console.error("Error approving attendance request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MODULE 5: SALARY MANAGEMENT API ---
app.get("/api/salaries", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { filter } = req.query; // Daily, Weekly, Monthly, Yearly

  try {
    let dateFilterClause = "";
    const params: any[] = [];
    const now = new Date();

    if (filter === "Daily") {
      const todayStr = now.toISOString().split("T")[0];
      dateFilterClause = "AND date = ?";
      params.push(todayStr);
    } else if (filter === "Weekly") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneWeekAgo);
    } else if (filter === "Yearly") {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneYearAgo);
    } else {
      // Default: Monthly
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilterClause = "AND date >= ?";
      params.push(oneMonthAgo);
    }

    // Dynamic payroll calculation: worked hours * hourly rate
    const payroll = db.prepare(`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.phone_number,
        u.hourly_rate,
        SUM(a.total_hours) as total_hours,
        (SUM(a.total_hours) * u.hourly_rate) as calculated_salary
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id ${dateFilterClause}
      WHERE u.role = 'Employee'
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
  try {
    let scores;
    if (req.user?.role === "Admin") {
      scores = db.prepare(`
        SELECT u.id, u.full_name, u.phone_number, 
               COALESCE(s.attendance_score, 100.0) as attendance_score, 
               COALESCE(s.punctuality_percentage, 100.0) as punctuality_percentage, 
               COALESCE(s.late_count, 0) as late_count
        FROM users u
        LEFT JOIN attendance_scores s ON u.id = s.user_id
        WHERE u.role = 'Employee'
        ORDER BY attendance_score DESC
      `).all();
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

// Get current active QR Code
app.get("/api/qr-code", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const qrCode = db.prepare("SELECT * FROM qr_codes ORDER BY id DESC LIMIT 1").get();
    res.json(qrCode || null);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Regenerate QR Code (Admin Only)
app.post("/api/qr-code/regenerate", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const now = new Date();
    // QR Code does not expire automatically (valid for 100 years)
    const expires = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); 
    const newCode = `CONST-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${now.getFullYear()}`;

    db.prepare(`
      INSERT INTO qr_codes (code, generated_at, expires_at)
      VALUES (?, ?, ?)
    `).run(newCode, now.toISOString(), expires.toISOString());

    res.json({ success: true, code: newCode, expires_at: expires.toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// --- VITE DEV AND BUILD HANDLERS ---
async function startServer() {
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

startServer();
