import React, { useState, useEffect } from "react";
import { useAppStore } from "./store.js";
import { QRCodeSVG } from "qrcode.react";
import { toEthiopian } from "ethiopian-date";
import { 
  Briefcase, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Key, 
  LogOut, 
  MapPin, 
  Phone, 
  QrCode, 
  RefreshCw, 
  RotateCcw, 
  DollarSign, 
  Award, 
  User as UserIcon, 
  UserPlus, 
  Users, 
  XCircle, 
  Smartphone, 
  Check, 
  AlertTriangle,
  Lock,
  ChevronRight,
  TrendingUp,
  Camera,
  Settings,
  Menu,
  Wifi,
  AlertCircle,
  X
} from "lucide-react";

export default function App() {
  const {
    token,
    user,
    employees,
    todayAttendance,
    attendanceHistory,
    permissions,
    attendanceRequests,
    salaries,
    scores,
    qrCode,
    dashboardData,
    loading,
    error,
    login,
    logout,
    fetchProfile,
    updateProfile,
    registerEmployee,
    fetchEmployees,
    updateHourlyRate,
    updateEmployee,
    deleteEmployee,
    fetchDashboard,
    approvePermission,
    approveAttendanceRequest,
    fetchSalaries,
    fetchTodayAttendance,
    checkIn,
    checkOut,
    fetchAttendanceHistory,
    fetchPermissions,
    submitPermission,
    fetchAttendanceRequests,
    submitAttendanceRequest,
    fetchScores,
    fetchQRCode,
    regenerateQRCode,
    siteSettings,
    fetchSiteSettings,
    updateSiteSettings,
    checkSetup,
    setupAdmin
  } = useAppStore();

  // Navigation states
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileTab, setMobileTab] = useState<string>("mobile-home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Ethiopian calendar month names (13 months)
  const ETHIOPIAN_MONTH_NAMES = [
    "",
    "Meskerem",
    "Tekemt",
    "Hedar",
    "Tahsas",
    "Ter",
    "Yakatit",
    "Megabit",
    "Miazia",
    "Genbot",
    "Sene",
    "Hamle",
    "Nehase",
    "Pagume"
  ];

  // Helper to get Year, Month, Day in Addis Ababa timezone
  const getAddisAbabaYMD = (date: Date = new Date()): { year: number, month: number, day: number } => {
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
  };

  // Convert a date to Ethiopian Calendar date string (YYYY-MM-DD format)
  const getEthiopianDateString = (date: Date = new Date()): string => {
    try {
      const g = getAddisAbabaYMD(date);
      const [ey, em, ed] = toEthiopian(g.year, g.month, g.day);
      const mm = String(em).padStart(2, "0");
      const dd = String(ed).padStart(2, "0");
      return `${ey}-${mm}-${dd}`;
    } catch (err) {
      console.error("Error converting date to Ethiopian calendar:", err);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    }
  };

  const getEthiopianTimeString = (date: Date = new Date()): string => {
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
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Addis_Ababa',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      return formatter.format(date);
    }
  };

  const getEthiopianLocalClockTimeString = (date: Date = new Date()): string => {
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
      const displayH = ethH % 12 === 0 ? 12 : ethH % 12;
      return `${String(displayH).padStart(2, "0")}:${m}:${s}`;
    } catch (err) {
      return getEthiopianTimeString(date);
    }
  };

  const getEthiopianTimePeriod = (date: Date = new Date()): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Addis_Ababa',
        hour: '2-digit',
        hour12: false
      });
      const h = parseInt(formatter.format(date), 10);
      const ethH = (h - 6 + 24) % 24;
      if (ethH >= 0 && ethH < 6) return "Tewat (ጠዋት / Morning)";
      if (ethH >= 6 && ethH < 12) return "Kese'at (ከሰዓት / Afternoon)";
      if (ethH >= 12 && ethH < 18) return "Mishit (ምሽት / Evening)";
      return "Lelit (ሌሊት / Night)";
    } catch (err) {
      return "";
    }
  };

  const getEthiopianNiceDateString = (date: Date = new Date()): string => {
    try {
      const g = getAddisAbabaYMD(date);
      const [ey, em, ed] = toEthiopian(g.year, g.month, g.day);
      const monthName = ETHIOPIAN_MONTH_NAMES[em] || "";
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        weekday: 'long'
      }).format(date);
      return `${weekday}, ${monthName} ${ed}, ${ey} E.C.`;
    } catch (err) {
      console.error("Error formatting nice Ethiopian date:", err);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return formatter.format(date);
    }
  };

  // Helper to format registration ISO date to Ethiopian Calendar nicely
  const getEthiopianFormattedDateString = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const g = getAddisAbabaYMD(d);
      const [ey, em, ed] = toEthiopian(g.year, g.month, g.day);
      const monthName = ETHIOPIAN_MONTH_NAMES[em] || "";
      return `${monthName} ${ed}, ${ey} E.C.`;
    } catch (e) {
      return dateStr;
    }
  };

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Database first-time setup state
  const [isDbEmpty, setIsDbEmpty] = useState<boolean>(false);
  const [setupName, setSetupName] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupPass, setSetupPass] = useState("");
  const [setupErr, setSetupErr] = useState("");

  useEffect(() => {
    const runCheck = async () => {
      const empty = await checkSetup();
      setIsDbEmpty(empty);
    };
    runCheck();
  }, [checkSetup]);
  
  // Geofencing and Wi-Fi Compliance Settings states
  const [editOfficeName, setEditOfficeName] = useState("Main Head Office");
  const [editLatitude, setEditLatitude] = useState("9.0227");
  const [editLongitude, setEditLongitude] = useState("38.7460");
  const [editWifiSsid, setEditWifiSsid] = useState("BsquareY_WiFi");
  const [editWifiIp, setEditWifiIp] = useState("192.168.1.100");
  const [editUseWifi, setEditUseWifi] = useState(true);

  // Public IP tracking for auto-compliance verification
  const [currentPublicIp, setCurrentPublicIp] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const triggerNotification = (type: "success" | "error", msg: string) => {
    setNotification({ type, message: msg });
    // Automatically dismiss after 6 seconds
    setTimeout(() => {
      setNotification(prev => prev?.message === msg ? null : prev);
    }, 6000);
  };
  
  // Login input states
  const [loginPhone, setLoginPhone] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginErr, setLoginErr] = useState<string>("");

  // Filters
  const [dashboardFilter, setDashboardFilter] = useState<string>("Month");
  const [salaryFilter, setSalaryFilter] = useState<string>("Monthly");
  const [feedFilter, setFeedFilter] = useState<"All" | "Present" | "Late" | "Absent">("All");

  // Registration states
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regRate, setRegRate] = useState("25.00");
  const [regRole, setRegRole] = useState<string>("Employee");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");
  const [regErrorMsg, setRegErrorMsg] = useState("");

  useEffect(() => {
    if (user?.role === "Bootstrap") {
      setRegRole("AdminCreator");
      setActiveTab("registration");
    } else {
      setRegRole("Employee");
    }
  }, [user?.role]);

  // Employee Edit states
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editEmpName, setEditEmpName] = useState("");
  const [editEmpPhone, setEditEmpPhone] = useState("");
  const [editEmpRole, setEditEmpRole] = useState<string>("Employee");
  const [editEmpRate, setEditEmpRate] = useState("");
  const [editEmpPass, setEditEmpPass] = useState("");

  // Profile Edit states
  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profCurrentPass, setProfCurrentPass] = useState("");
  const [profNewPass, setProfNewPass] = useState("");
  const [profConfirmPass, setProfConfirmPass] = useState("");
  const [profPhoto, setProfPhoto] = useState("");
  const [profSuccess, setProfSuccess] = useState(false);

  // Leave Form states
  const [leaveType, setLeaveType] = useState<"Permission" | "Sick Leave" | "Annual Leave">("Permission");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  // Attendance Request Form states
  const [reqType, setReqType] = useState<"Site Visit" | "External Work" | "Purchaser Visit">("Site Visit");
  const [reqDate, setReqDate] = useState("");
  const [reqIn, setReqIn] = useState("");
  const [reqOut, setReqOut] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqSuccess, setReqSuccess] = useState(false);

  // Approval Modal states (Admin sets approved range)
  const [selectedPermission, setSelectedPermission] = useState<any>(null);
  const [appFromDate, setAppFromDate] = useState("");
  const [appToDate, setAppToDate] = useState("");

  // Hourly Rate Edit states
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editingRateValue, setEditingRateValue] = useState("");

  // Selected Employee Details Modal
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeTab, setSelectedEmployeeTab] = useState<"today" | "weekly" | "monthly" | "yearly">("today");
  const [selectedDetailMonth, setSelectedDetailMonth] = useState<string>("");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState<"All" | "Present" | "Late" | "Absent">("All");
  const [modalCustomRate, setModalCustomRate] = useState<string>("");

  // Delete Employee Confirmation state
  const [deletingEmployee, setDeletingEmployee] = useState<{ id: number; fullName: string } | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Camera Scan state simulation
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  // On initial mount or auth change
  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchTodayAttendance();
      fetchAttendanceHistory();
      fetchPermissions();
      fetchAttendanceRequests();
      fetchScores();
      fetchQRCode();
      fetchSiteSettings();

      const adminRoles = ["SuperAdmin", "AdminCreator", "AdminManager", "Bootstrap"];
      if (user?.role && adminRoles.includes(user.role)) {
        fetchEmployees();
        fetchDashboard(dashboardFilter);
        fetchSalaries(salaryFilter);
      }
    }
  }, [token, user?.role]);

  // Sync site settings state variables
  useEffect(() => {
    if (siteSettings) {
      setEditOfficeName(siteSettings.office_name);
      setEditLatitude(siteSettings.latitude.toString());
      setEditLongitude(siteSettings.longitude.toString());
      setEditWifiSsid(siteSettings.wifi_ssid || "");
      setEditWifiIp(siteSettings.wifi_ip || "");
      setEditUseWifi(siteSettings.use_wifi_verification === 1);
    }
  }, [siteSettings]);

  // Sync profile fields
  useEffect(() => {
    if (user) {
      setProfName(user.full_name);
      setProfPhone(user.phone_number);
      setProfPhoto(user.photo || "");
    }
  }, [user]);

  // Fetch client's public IP address automatically for compliance checks
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(data => {
        if (data && data.ip) {
          setCurrentPublicIp(data.ip);
        }
      })
      .catch(err => console.warn("Could not auto-fetch client IP:", err));
  }, []);

  // Handle dashboard filter change
  const handleDashboardFilterChange = (filter: string) => {
    setDashboardFilter(filter);
    fetchDashboard(filter);
  };

  // Handle salary filter change
  const handleSalaryFilterChange = (filter: string) => {
    setSalaryFilter(filter);
    fetchSalaries(filter);
  };

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    if (!loginPhone || !loginPassword) {
      setLoginErr("Please fill in both phone number and password");
      return;
    }
    const ok = await login(loginPhone, loginPassword);
    if (!ok) {
      setLoginErr(error || "Invalid phone number or password");
    }
  };

  // Handle first-time Admin Setup submission
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupErr("");
    if (!setupName || !setupPhone || !setupPass) {
      setSetupErr("All fields are required");
      return;
    }
    const ok = await setupAdmin(setupName, setupPhone, setupPass);
    if (!ok) {
      setSetupErr(error || "Failed to setup Admin account");
    } else {
      setIsDbEmpty(false);
      triggerNotification("success", "Admin account created successfully!");
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMsg("");
    setRegErrorMsg("");

    if (!regName || !regPhone || !regPass) {
      setRegErrorMsg("All fields are required");
      return;
    }

    const res = await registerEmployee({
      full_name: regName,
      phone_number: regPhone,
      role: regRole,
      password: regPass,
      hourly_rate: parseFloat(regRate)
    });

    if (res.success) {
      setRegSuccessMsg(`${regRole} successfully registered!`);
      setRegName("");
      setRegPhone("");
      setRegPass("");
      setRegRate("25.00");
      setRegRole("Employee");
    } else {
      setRegErrorMsg(res.error || "Failed to register employee");
    }
  };

  // Handle Profile Save
  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSuccess(false);

    if (profNewPass || profCurrentPass || profConfirmPass) {
      if (!profCurrentPass) {
        triggerNotification("error", "Current password required to save changes.");
        return;
      }
      if (profNewPass !== profConfirmPass) {
        triggerNotification("error", "New passwords do not match.");
        return;
      }
      if (profNewPass.length < 4) {
        triggerNotification("error", "New password must be at least 4 characters long.");
        return;
      }
    }

    const ok = await updateProfile({
      full_name: profName,
      phone_number: profPhone,
      current_password: profCurrentPass || undefined,
      new_password: profNewPass || undefined,
      photo: profPhoto || undefined
    });
    if (ok) {
      setProfSuccess(true);
      setProfCurrentPass("");
      setProfNewPass("");
      setProfConfirmPass("");
      triggerNotification("success", "Profile updated successfully!");
      setTimeout(() => setProfSuccess(false), 4000);
    } else {
      triggerNotification("error", "Profile update failed.");
    }
  };

  // Handle Leave Submission
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveStart || !leaveEnd) {
      triggerNotification("error", "Please fill in all leave request fields.");
      return;
    }
    const ok = await submitPermission({
      request_type: leaveType,
      reason: leaveReason,
      start_date: leaveStart,
      end_date: leaveEnd
    });
    if (ok) {
      setLeaveSuccess(true);
      setLeaveReason("");
      setLeaveStart("");
      setLeaveEnd("");
      triggerNotification("success", "Leave request submitted successfully!");
      setTimeout(() => setLeaveSuccess(false), 4000);
    }
  };

  // Handle Attendance Request Submission
  const handleAttendanceRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate || !reqIn || !reqOut || !reqReason) {
      triggerNotification("error", "Please fill in all attendance adjustment fields.");
      return;
    }
    const ok = await submitAttendanceRequest({
      type: reqType,
      date: reqDate,
      check_in_time: reqIn + ":00",
      check_out_time: reqOut + ":00",
      reason: reqReason
    });
    if (ok) {
      setReqSuccess(true);
      setReqDate("");
      setReqIn("");
      setReqOut("");
      setReqReason("");
      triggerNotification("success", "Adjustment request submitted successfully!");
      setTimeout(() => setReqSuccess(false), 4000);
    }
  };

  // Handle Permission Approval (Admin clicks Approve)
  const handlePermissionApprovalSubmit = async (status: "Approved" | "Rejected") => {
    if (!selectedPermission) return;
    const ok = await approvePermission(
      selectedPermission.id,
      status,
      status === "Approved" ? appFromDate : undefined,
      status === "Approved" ? appToDate : undefined
    );
    if (ok) {
      setSelectedPermission(null);
      setAppFromDate("");
      setAppToDate("");
      triggerNotification("success", `Request has been marked as ${status}.`);
    } else {
      triggerNotification("error", "Failed to submit approval update.");
    }
  };

  // Real check-in with auto-detected compliance checking
  const handleRealScan = (session?: "Morning" | "Afternoon") => {
    if (!qrCode) {
      triggerNotification("error", "No active site QR Code found in database.");
      return;
    }
    setIsScanning(true);
    setScanMessage("Contacting network and satellite systems...");
    setTimeout(() => {
      setScanMessage("Acquiring GPS fix and checking local network...");
      setTimeout(async () => {
        let latitude: number | undefined = undefined;
        let longitude: number | undefined = undefined;
        let accuracy: number | undefined = undefined;
        let wifi_ssid: string | undefined = undefined;
        let wifi_ip: string | undefined = undefined;

        try {
          const ipRes = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipRes.json();
          wifi_ip = ipData.ip;
          if (wifi_ip) {
            setCurrentPublicIp(wifi_ip);
          }
        } catch (err) {
          console.warn("Could not auto-detect public IP client-side:", err);
        }

        setScanMessage("Requesting device location parameters...");
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
          
          setScanMessage(`Scanning QR Token: ${qrCode.code}...`);
          
          const res = await checkIn(qrCode.code, {
            latitude,
            longitude,
            accuracy,
            wifi_ssid,
            wifi_ip,
            session
          } as any);

          setIsScanning(false);
          if (res.success) {
            triggerNotification("success", `Checked In Successfully to ${res.session || "detected"} session!`);
          } else {
            triggerNotification("error", `Check-In Failed: ${res.error || "Expired or invalid QR"}`);
          }
        } catch (err: any) {
          setIsScanning(false);
          let errorMsg = "Could not acquire a secure GPS lock.";
          if (err.code === 1) {
            errorMsg = "Location access denied. Please enable Location permissions in your browser settings to verify your on-site attendance.";
          } else if (err.code === 2) {
            errorMsg = "Position unavailable. Please ensure your device has GPS signal/Internet.";
          } else if (err.code === 3) {
            errorMsg = "Location acquisition timed out. Please try scanning again.";
          }
          triggerNotification("error", errorMsg);
        }
      }, 1200);
    }, 1000);
  };

  // Real check-out with auto-detected compliance checking
  const handleRealCheckOut = (session?: "Morning" | "Afternoon") => {
    setIsScanning(true);
    setScanMessage("Verifying local office network or GPS geofence...");
    setTimeout(() => {
      setScanMessage("Resolving office position and matching subnet parameters...");
      setTimeout(async () => {
        let latitude: number | undefined = undefined;
        let longitude: number | undefined = undefined;
        let accuracy: number | undefined = undefined;
        let wifi_ssid: string | undefined = undefined;
        let wifi_ip: string | undefined = undefined;

        try {
          const ipRes = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipRes.json();
          wifi_ip = ipData.ip;
          if (wifi_ip) {
            setCurrentPublicIp(wifi_ip);
          }
        } catch (err) {
          console.warn("Could not auto-detect public IP client-side:", err);
        }

        setScanMessage("Requesting device location parameters...");
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          accuracy = pos.coords.accuracy;

          setScanMessage("Authenticating Check-Out...");

          const res = await checkOut({
            latitude,
            longitude,
            accuracy,
            wifi_ssid,
            wifi_ip,
            session
          } as any);

          setIsScanning(false);
          if (res.success) {
            triggerNotification("success", `Checked Out Successfully from ${res.session || "detected"} session!`);
          } else {
            triggerNotification("error", `Check-Out Failed: ${res.error || "Compliance conditions not met"}`);
          }
        } catch (err: any) {
          setIsScanning(false);
          let errorMsg = "Could not acquire a secure GPS lock.";
          if (err.code === 1) {
            errorMsg = "Location access denied. Please allow location permissions to check out of your site.";
          } else if (err.code === 2) {
            errorMsg = "Position unavailable. Please ensure your device has GPS signal/Internet.";
          } else if (err.code === 3) {
            errorMsg = "Location acquisition timed out. Please try again.";
          }
          triggerNotification("error", errorMsg);
        }
      }, 1200);
    }, 1000);
  };

  // Format attendance score rating description
  const getRating = (score: number) => {
    if (score >= 90) return { text: "Excellent", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (score >= 80) return { text: "Good", color: "text-blue-600 bg-blue-50 border-blue-200" };
    if (score >= 70) return { text: "Fair", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { text: "Poor", color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  // Dynamic status pill style
  const getStatusPill = (status: string) => {
    switch (status) {
      case "Approved":
        return "text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1";
      case "Rejected":
        return "text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1";
      default:
        return "text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1";
    }
  };

  // --- RENDER LOGIN OR FIRST-TIME SETUP IF NOT LOGGED IN ---
  if (!token || !user) {
    return (
      <div id="login_page" className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/20">
              <Briefcase size={28} />
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">B square Y Attendance</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isDbEmpty ? "Initial Admin Account Configuration" : "Attendance Management Control Panel"}
            </p>
          </div>

          {isDbEmpty ? (
            <form onSubmit={handleSetupSubmit} className="space-y-5">
              <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs font-bold leading-normal">
                Welcome to B square Y Attendance! The database is empty. Please set up the default Administrator account to continue.
              </div>

              {setupErr && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm flex items-start gap-2.5">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{setupErr}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <UserIcon size={16} className="text-gray-400" /> Admin Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Yohannes Berhe"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Phone size={16} className="text-gray-400" /> Phone Number (Login ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0912345678"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Lock size={16} className="text-gray-400" /> Security Password
                </label>
                <input
                  type="password"
                  placeholder="Create strong admin password"
                  value={setupPass}
                  onChange={(e) => setSetupPass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/15 hover:shadow-blue-600/20 active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Register & Configure Admin
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {loginErr && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm flex items-start gap-2.5">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <span>{loginErr}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Phone size={16} className="text-gray-400" /> Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0912345678 or register employee phone"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Lock size={16} className="text-gray-400" /> Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm font-semibold"
                  />
                </div>

                <button
                  id="login_btn"
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/15 hover:shadow-blue-600/20 active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Log In to Portal
                </button>
              </form>

              <div className="mt-8 border-t border-gray-100 pt-6 text-center space-y-4">
                <p className="text-xs text-gray-400 leading-normal">
                  Log in using your Admin credentials or registered Employee phone number.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- EMPLOYEE ONLY PORTAL VIEW (CENTRALIZED DEVICE ENCLOSURE FOR REALISM) ---
  const renderEmployeePortal = () => {
    const mainContent = (
      <div className="h-full bg-[#F8FAFC] flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Mobile Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                {user.photo ? (
                  <img src={user.photo} alt={user.full_name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
                    {user.full_name[0]}
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5">
                    Welcome Employee
                    {user.workspace_name && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded font-black uppercase">
                        {user.workspace_name}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold truncate max-w-[150px]">{user.full_name}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Simulated role indicator */}
                <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  Site
                </span>
                <button 
                  onClick={logout} 
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>

            {/* Mobile App Viewport */}
            <div className="flex-1 p-4 space-y-4">
              {notification && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-left shadow-sm transition-all duration-300 relative ${
                  notification.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {notification.type === "success" ? (
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 font-bold" />
                    )}
                  </div>
                  <div className="flex-1 pr-5">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">
                      {notification.type === "success" ? "Authorized" : "Not Allowed"}
                    </p>
                    <p className="text-[11px] leading-snug font-medium">{notification.message}</p>
                  </div>
                  <button 
                    onClick={() => setNotification(null)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition shrink-0"
                    id="close-notification"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {mobileTab === "mobile-home" && (
                <>
                  {/* Warnings & Alerts for Late or Absent */}
                  {(() => {
                    const lateRecord = attendanceHistory.find(h => h.user_id === user?.id && h.status === "Late");
                    const absentRecord = attendanceHistory.find(h => h.user_id === user?.id && h.status === "Absent");
                    
                    if (!lateRecord && !absentRecord) return null;
                    
                    return (
                      <div className="space-y-3 mb-4 text-left">
                        {lateRecord && (
                          <div className="bg-amber-50/70 border-l-4 border-amber-500 rounded-xl p-3.5 flex items-start gap-3 shadow-sm border border-amber-100/50 animate-fade-in">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-amber-900">Punctuality Warning: Late Attendance</h4>
                              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                You registered a <strong className="font-extrabold uppercase text-amber-800">Late</strong> status on <span className="font-bold font-mono">{lateRecord.date}</span> (Checked in at <span className="font-bold font-mono">{lateRecord.check_in_time}</span>). Please adhere to standard timing rules to maintain your excellent attendance index.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {absentRecord && (
                          <div className="bg-rose-50/70 border-l-4 border-rose-500 rounded-xl p-3.5 flex items-start gap-3 shadow-sm border border-rose-100/50 animate-fade-in">
                            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-rose-900">Attendance Alert: Absenteeism Registered</h4>
                              <p className="text-[10px] text-rose-700 leading-relaxed font-medium">
                                You have been marked <strong className="font-extrabold uppercase text-rose-800">Absent</strong> for the shift on <span className="font-bold font-mono">{absentRecord.date}</span>. If you had an authorized reason, please submit a professional Leave Request immediately.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Attendance Check-In / Out Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 text-gray-50/50">
                      <Clock size={120} />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Attendance</h3>
                    
                    {/* Live Digital Clock */}
                    <div className="my-3">
                      <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight font-mono block">
                        {getEthiopianLocalClockTimeString(currentTime)}
                      </span>
                      <div className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider mt-0.5">
                        {getEthiopianTimePeriod(currentTime)}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-1">
                        {getEthiopianNiceDateString(currentTime)}
                      </div>
                    </div>                    {/* Sessions section */}
                    <div className="space-y-4 text-left mt-4">
                      {/* Morning Session Block */}
                      {(() => {
                        const morningRecord = Array.isArray(todayAttendance) ? todayAttendance.find(r => r.session === "Morning") : null;
                        const afternoonRecord = Array.isArray(todayAttendance) ? todayAttendance.find(r => r.session === "Afternoon") : null;
                        
                        const now = currentTime;
                        const currentHour = parseInt(getEthiopianTimeString(now).split(":")[0], 10);
                        const isMorningSession = currentHour < 6;
                        
                        const hasActiveMorningCheckIn = !!(morningRecord && !morningRecord.check_out_time);
                        const hasActiveAfternoonCheckIn = !!(afternoonRecord && !afternoonRecord.check_out_time);
                        
                        const showMorning = isMorningSession || hasActiveMorningCheckIn;
                        const showAfternoon = !isMorningSession || hasActiveAfternoonCheckIn;

                        return (
                          <>
                            {showMorning && (
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Morning Session</h4>
                                    <p className="text-[10px] text-gray-400">08:00 AM - 12:00 PM</p>
                                  </div>
                                  {morningRecord ? (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      morningRecord.check_out_time 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}>
                                      {morningRecord.check_out_time ? "Completed" : "Active Check-In"}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {morningRecord && (
                                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Check-In:</span>
                                      <span className="font-mono font-semibold text-slate-800">
                                        {morningRecord.check_in_time} {morningRecord.status === "Late" && <span className="text-red-500 font-bold text-[9px] ml-1">(LATE)</span>}
                                      </span>
                                    </div>
                                    {morningRecord.check_out_time && (
                                      <>
                                        <div className="flex justify-between">
                                          <span>Check-Out:</span>
                                          <span className="font-mono font-semibold text-slate-800">{morningRecord.check_out_time}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-100 pt-1 mt-1 text-slate-800 font-bold">
                                          <span>Worked:</span>
                                          <span>{morningRecord.total_hours} hrs</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="pt-1">
                                  {!morningRecord ? (
                                    <button
                                      onClick={() => handleRealScan("Morning")}
                                      disabled={isScanning}
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/10 transition flex items-center justify-center gap-2 text-xs active:scale-[0.98]"
                                    >
                                      <QrCode size={14} />
                                      {isScanning ? "Scanning..." : "Check-In Morning"}
                                    </button>
                                  ) : !morningRecord.check_out_time ? (
                                    <button
                                      onClick={() => handleRealCheckOut("Morning")}
                                      disabled={isScanning}
                                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-rose-600/10 transition flex items-center justify-center gap-2 text-xs active:scale-[0.98]"
                                    >
                                      <LogOut size={14} />
                                      {isScanning ? "Processing..." : "Check-Out Morning"}
                                    </button>
                                  ) : (
                                    <div className="text-center py-2 text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                                      <Check size={14} /> Morning Session Completed
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {showAfternoon && (
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Afternoon Session</h4>
                                    <p className="text-[10px] text-gray-400">01:00 PM - 05:00 PM</p>
                                  </div>
                                  {afternoonRecord ? (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      afternoonRecord.check_out_time 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}>
                                      {afternoonRecord.check_out_time ? "Completed" : "Active Check-In"}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {afternoonRecord && (
                                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Check-In:</span>
                                      <span className="font-mono font-semibold text-slate-800">
                                        {afternoonRecord.check_in_time} {afternoonRecord.status === "Late" && <span className="text-red-500 font-bold text-[9px] ml-1">(LATE)</span>}
                                      </span>
                                    </div>
                                    {afternoonRecord.check_out_time && (
                                      <>
                                        <div className="flex justify-between">
                                          <span>Check-Out:</span>
                                          <span className="font-mono font-semibold text-slate-800">{afternoonRecord.check_out_time}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-100 pt-1 mt-1 text-slate-800 font-bold">
                                          <span>Worked:</span>
                                          <span>{afternoonRecord.total_hours} hrs</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="pt-1">
                                  {!afternoonRecord ? (
                                    <button
                                      onClick={() => handleRealScan("Afternoon")}
                                      disabled={isScanning}
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/10 transition flex items-center justify-center gap-2 text-xs active:scale-[0.98]"
                                    >
                                      <QrCode size={14} />
                                      {isScanning ? "Scanning..." : "Check-In Afternoon"}
                                    </button>
                                  ) : !afternoonRecord.check_out_time ? (
                                    <button
                                      onClick={() => handleRealCheckOut("Afternoon")}
                                      disabled={isScanning}
                                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-rose-600/10 transition flex items-center justify-center gap-2 text-xs active:scale-[0.98]"
                                    >
                                      <LogOut size={14} />
                                      {isScanning ? "Processing..." : "Check-Out Afternoon"}
                                    </button>
                                  ) : (
                                    <div className="text-center py-2 text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                                      <Check size={14} /> Afternoon Session Completed
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {isScanning && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-xl flex items-center gap-2.5 justify-center animate-pulse">
                        <Camera size={16} className="animate-bounce" />
                        <span>{scanMessage}</span>
                      </div>
                    )}

                    {/* Auto-Detection Status Panel */}
                    <div className="mt-4 pt-4 border-t border-gray-100 text-left space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <Smartphone size={14} className="text-blue-600" />
                        <span>System Auto-Detection Diagnostics</span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-gray-600">
                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                          <span className="font-medium text-gray-500">Your Current Public IP:</span>
                          <span className="font-mono text-blue-700 font-semibold">{currentPublicIp || "Detecting..."}</span>
                        </div>
                        
                        <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                          <span className="font-medium text-gray-500">Configured Office Location:</span>
                          <span className="font-semibold text-gray-800 truncate max-w-[150px]" title={editOfficeName}>{editOfficeName}</span>
                        </div>

                        {siteSettings?.use_wifi_verification === 1 && siteSettings?.wifi_ip && (
                          <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                            <span className="font-medium text-gray-500">Office WiFi Router IP:</span>
                            <span className="font-mono text-gray-700">{siteSettings.wifi_ip}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-500 leading-normal bg-white p-2.5 rounded border border-gray-100 flex gap-1.5">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Dual Attendance Verification</strong>: Connected office Wi-Fi takes precedence. If Wi-Fi is not connected, it falls back strictly to the head office's GPS Geofence (30 meters).
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Score Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0">
                        <Award size={22} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400">Attendance Rating</h4>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-bold text-[#0F172A]">
                            {scores[0] ? scores[0].attendance_score : 100}%
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getRating(scores[0] ? scores[0].attendance_score : 100).color}`}>
                            {getRating(scores[0] ? scores[0].attendance_score : 100).text}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-medium">Lates count</div>
                      <div className="text-sm font-bold text-[#0F172A] mt-0.5">
                        {scores[0] ? scores[0].late_count : 0} Days
                      </div>
                    </div>
                  </div>

                  {/* Quick navigation modules */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMobileTab("mobile-leave")}
                      className="p-4 bg-white hover:bg-slate-50 border border-gray-100 rounded-2xl text-left shadow-sm group transition"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center mb-3">
                        <FileText size={18} />
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] group-hover:text-blue-600 transition">Request Leave</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Permissions, Sick, Annual</div>
                    </button>

                    <button
                      onClick={() => setMobileTab("mobile-adjust")}
                      className="p-4 bg-white hover:bg-slate-50 border border-gray-100 rounded-2xl text-left shadow-sm group transition"
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mb-3">
                        <MapPin size={18} />
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] group-hover:text-blue-600 transition">Site Adjust</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Visits & external work</div>
                    </button>
                  </div>

                  {/* History Logs */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Recent Logs</h3>
                      <button onClick={() => setMobileTab("mobile-history")} className="text-xs text-blue-600 font-semibold hover:underline">
                        View All
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {attendanceHistory.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center text-xs text-gray-400 font-medium">
                          No recent attendance logs
                        </div>
                      ) : (
                        attendanceHistory.slice(0, 4).map((h) => (
                          <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full ${h.status === "Present" ? "bg-emerald-500" : h.status === "Late" ? "bg-amber-500" : "bg-rose-500"}`}></div>
                              <div>
                                <div className="text-xs font-bold text-gray-800">{h.date}</div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  {h.check_in_time || "--:--"} to {h.check_out_time || "Pending"}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              h.status === "Present" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                            }`}>
                              {h.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Leave Requests Tab */}
              {mobileTab === "mobile-leave" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <button onClick={() => setMobileTab("mobile-home")} className="text-xs text-blue-600 font-bold hover:underline">Back</button>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs font-bold text-gray-700">Request Leave</span>
                  </div>

                  <form onSubmit={handleLeaveSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
                    {leaveSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                        Leave request submitted successfully!
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Leave Type</label>
                      <select 
                        value={leaveType} 
                        onChange={(e) => setLeaveType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                      >
                        <option value="Permission">Permission</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Annual Leave">Annual Leave</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Start Date</label>
                        <input 
                          type="date" 
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">End Date</label>
                        <input 
                          type="date" 
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Reason</label>
                      <textarea 
                        rows={3}
                        placeholder="State reason here..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full text-xs bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition"
                    >
                      Submit Leave Request
                    </button>
                  </form>

                  {/* History of Leave Requests */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Leave History</h4>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {permissions.length === 0 ? (
                        <div className="text-xs text-gray-400 bg-white p-3 rounded-xl border border-gray-100 text-center font-medium">
                          No leave requests found
                        </div>
                      ) : (
                        permissions.map((p) => (
                          <div key={p.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm text-xs space-y-1.5">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-gray-800">{p.request_type}</span>
                              <span className={getStatusPill(p.status)}>{p.status}</span>
                            </div>
                            <p className="text-gray-500 text-[11px] truncate">{p.reason}</p>
                            <div className="text-[10px] text-gray-400 font-medium">
                              {p.start_date} to {p.end_date}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Site Adjust Tab */}
              {mobileTab === "mobile-adjust" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <button onClick={() => setMobileTab("mobile-home")} className="text-xs text-blue-600 font-bold hover:underline">Back</button>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs font-bold text-gray-700">Attendance Adjustment</span>
                  </div>

                  <form onSubmit={handleAttendanceRequestSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
                    {reqSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                        Attendance request submitted successfully!
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Type</label>
                      <select 
                        value={reqType} 
                        onChange={(e) => setReqType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
                      >
                        <option value="Site Visit">Site Visit</option>
                        <option value="External Work">External Work</option>
                        <option value="Purchaser Visit">Purchaser Visit</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Date</label>
                      <input 
                        type="date" 
                        value={reqDate}
                        onChange={(e) => setReqDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Check-In</label>
                        <input 
                          type="time" 
                          value={reqIn}
                          onChange={(e) => setReqIn(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Check-Out</label>
                        <input 
                          type="time" 
                          value={reqOut}
                          onChange={(e) => setReqOut(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Reason</label>
                      <textarea 
                        rows={2}
                        placeholder="State purpose of trip..."
                        value={reqReason}
                        onChange={(e) => setReqReason(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full text-xs bg-teal-600 text-white font-bold py-2.5 rounded-lg hover:bg-teal-700 transition"
                    >
                      Submit Adjust Request
                    </button>
                  </form>

                  {/* History of adjustments */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Adjustment History</h4>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {attendanceRequests.length === 0 ? (
                        <div className="text-xs text-gray-400 bg-white p-3 rounded-xl border border-gray-100 text-center font-medium">
                          No adjustments found
                        </div>
                      ) : (
                        attendanceRequests.map((r) => (
                          <div key={r.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm text-xs space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-gray-800">{r.type}</span>
                              <span className={getStatusPill(r.status)}>{r.status}</span>
                            </div>
                            <p className="text-gray-500 text-[11px] truncate">{r.reason}</p>
                            <div className="text-[10px] text-gray-400 font-medium">
                              Date: {r.date} ({r.check_in_time} - {r.check_out_time})
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full History Logs Tab */}
              {mobileTab === "mobile-history" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <button onClick={() => setMobileTab("mobile-home")} className="text-xs text-blue-600 font-bold hover:underline">Back</button>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs font-bold text-gray-700">All Attendance History</span>
                  </div>

                  <div className="space-y-2.5">
                    {attendanceHistory.map((h) => (
                      <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <div className="text-xs font-extrabold text-[#0F172A]">{h.date}</div>
                          <div className="text-[11px] text-gray-500 font-medium mt-1">
                            In: {h.check_in_time || "--:--"}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            Out: {h.check_out_time || "--:--"}
                          </div>
                        </div>

                        <div className="text-right space-y-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            h.status === "Present" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                          }`}>
                            {h.status}
                          </span>
                          <div className="text-xs font-bold text-gray-700">{h.total_hours} hrs worked</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="border-t border-gray-100 bg-white px-6 py-2.5 flex justify-between items-center shrink-0 shadow-lg">
              <button 
                onClick={() => setMobileTab("mobile-home")}
                className={`flex flex-col items-center gap-1 transition ${mobileTab === "mobile-home" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <Clock size={18} />
                <span className="text-[10px] font-semibold">Today</span>
              </button>
              <button 
                onClick={() => setMobileTab("mobile-leave")}
                className={`flex flex-col items-center gap-1 transition ${mobileTab === "mobile-leave" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <FileText size={18} />
                <span className="text-[10px] font-semibold">Leaves</span>
              </button>
              <button 
                onClick={() => setMobileTab("mobile-adjust")}
                className={`flex flex-col items-center gap-1 transition ${mobileTab === "mobile-adjust" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <MapPin size={18} />
                <span className="text-[10px] font-semibold">Adjust</span>
              </button>
              <button 
                onClick={() => setMobileTab("mobile-history")}
                className={`flex flex-col items-center gap-1 transition ${mobileTab === "mobile-history" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <Calendar size={18} />
                <span className="text-[10px] font-semibold">History</span>
              </button>
            </div>
          </div>
      );

      return (
        <div className="bg-[#0F172A] min-h-screen flex justify-center items-center p-0 md:p-6">
          <div className="w-full max-w-md bg-white min-h-screen md:min-h-[820px] md:max-h-[820px] md:rounded-[40px] md:shadow-2xl overflow-hidden flex flex-col relative md:border-8 md:border-slate-800">
            {mainContent}
          </div>
        </div>
      );
  };

  // If logged in as an Employee, show the mobile portal immediately
  const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];
  if (employeeRoles.includes(user.role)) {
    return renderEmployeePortal();
  }

  // --- ADMIN WEB APPLICATION PANEL ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative">
      
      {notification && (
        <div className="fixed top-6 right-6 z-[9999] animate-bounce-short">
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-left shadow-2xl max-w-sm transition-all duration-300 ${
            notification.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10" 
              : "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10"
          }`}>
            <div className="mt-0.5 shrink-0">
              {notification.type === "success" ? (
                <Check className="w-5 h-5 text-emerald-600 font-bold" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 font-bold" />
              )}
            </div>
            <div className="flex-1 pr-5">
              <p className="font-extrabold text-[10px] uppercase tracking-wider mb-0.5">
                {notification.type === "success" ? "Authorized" : "Action Required"}
              </p>
              <p className="text-[11px] leading-snug font-semibold text-gray-700">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition shrink-0"
              id="close-admin-notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* Top Banner & Header */}
      <header className="bg-[#0F172A] text-white py-4 px-4 md:px-6 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger button on mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Toggle Menu"
          >
            <Menu size={20} />
          </button>

          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm md:text-lg shadow-lg shadow-blue-500/20 shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "A"}
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-tight flex items-center gap-2">
              {user.full_name}
              {user.workspace_name && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  {user.workspace_name}
                </span>
              )}
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium">
              B square Y Attendance Panel ({user.role === "AdminManager" ? "Second Admin" : user.role === "AdminCreator" ? "Normal Admin" : user.role})
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs font-bold text-slate-300 truncate max-w-[80px] sm:max-w-none">
              {user.full_name}
            </span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition shrink-0"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main split dashboard view */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Mobile Navigation Drawer Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation Drawer Content */}
        <aside 
          className={`fixed top-0 bottom-0 left-0 w-64 bg-white z-50 p-5 flex flex-col justify-between shadow-2xl border-r border-gray-100 transition-transform duration-300 md:hidden ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <span className="font-bold text-slate-800 text-sm">B square Y Navigation</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle size={18} />
              </button>
            </div>
            {user?.workspace_name && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-0.5 mx-1 mt-3">
                <div className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase size={10} />
                  Active Workspace
                </div>
                <div className="text-[11px] font-black text-slate-800 truncate">
                  {user.workspace_name}
                </div>
                <div className="text-[9px] font-semibold text-slate-500">
                  Role: {user.role === "AdminManager" ? "Second Admin" : user.role === "AdminCreator" ? "Normal Admin" : user.role}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Management</h3>
              <nav className="space-y-1">
                {user?.role !== "Bootstrap" && (
                  <>
                    <button
                      onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "dashboard" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <TrendingUp size={18} /> Analytics Dashboard
                    </button>
                    <button
                      onClick={() => { setActiveTab("approvals"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "approvals" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle size={18} /> Approvals & Leaves
                      {(permissions.filter(p => p.status === "Pending").length + attendanceRequests.filter(r => r.status === "Pending").length) > 0 && (
                        <span className="ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {permissions.filter(p => p.status === "Pending").length + attendanceRequests.filter(r => r.status === "Pending").length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { setActiveTab("attendance"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "attendance" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Clock size={18} /> Admin Attendance
                    </button>
                    <button
                      onClick={() => { setActiveTab("salary"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "salary" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <DollarSign size={18} /> Salary Management
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setActiveTab("registration"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                    activeTab === "registration" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UserPlus size={18} /> {user?.role === "Bootstrap" ? "Administrator Registry" : "Employee Registration"}
                </button>
                {user?.role !== "Bootstrap" && (
                  <>
                    <button
                      onClick={() => { setActiveTab("scores"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "scores" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Award size={18} /> Attendance Scores
                    </button>
                    <button
                      onClick={() => { setActiveTab("qr_code"); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "qr_code" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <QrCode size={18} /> QR Management
                    </button>
                  </>
                )}
              </nav>
            </div>

            {user?.role !== "Bootstrap" && (
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Settings</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                      activeTab === "profile" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserIcon size={18} /> Admin Profile
                  </button>
                </nav>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">App Environment</span>
            <div className="text-xs font-bold text-gray-700 mt-1">Live SQLite Engine</div>
          </div>
        </aside>

        {/* Desktop Navigation Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 p-5 flex-col justify-between shrink-0">
          <div className="space-y-6">
            {user?.workspace_name && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase size={12} />
                  Active Workspace
                </div>
                <div className="text-xs font-black text-slate-800 truncate">
                  {user.workspace_name}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  Role: {user.role === "AdminManager" ? "Second Admin" : user.role === "AdminCreator" ? "Normal Admin" : user.role}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Management</h3>
              <nav className="space-y-1">
                {user?.role !== "Bootstrap" && (
                  <>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "dashboard" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <TrendingUp size={18} /> Analytics Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab("approvals")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "approvals" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle size={18} /> Approvals & Leaves
                      {(permissions.filter(p => p.status === "Pending").length + attendanceRequests.filter(r => r.status === "Pending").length) > 0 && (
                        <span className="ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {permissions.filter(p => p.status === "Pending").length + attendanceRequests.filter(r => r.status === "Pending").length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("attendance")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "attendance" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Clock size={18} /> Admin Attendance
                    </button>
                    <button
                      onClick={() => setActiveTab("salary")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "salary" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <DollarSign size={18} /> Salary Management
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveTab("registration")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                    activeTab === "registration" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UserPlus size={18} /> {user?.role === "Bootstrap" ? "Administrator Registry" : "Employee Registration"}
                </button>
                {user?.role !== "Bootstrap" && (
                  <>
                    <button
                      onClick={() => setActiveTab("scores")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "scores" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Award size={18} /> Attendance Scores
                    </button>
                    <button
                      onClick={() => setActiveTab("qr_code")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                        activeTab === "qr_code" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <QrCode size={18} /> QR Management
                    </button>
                  </>
                )}
              </nav>
            </div>

            {user?.role !== "Bootstrap" && (
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Settings</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                      activeTab === "profile" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserIcon size={18} /> Admin Profile
                  </button>
                </nav>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">App Environment</span>
            <div className="text-xs font-bold text-gray-700 mt-1">Live SQLite Engine</div>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
          
          {/* Module 1: Dashboard */}
          {activeTab === "dashboard" && dashboardData && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight">Analytics Dashboard</h2>
                  <p className="text-gray-500 text-xs md:text-sm mt-0.5">Real-time attendance summaries and metrics for the workforce</p>
                </div>

                <div className="flex gap-1.5 bg-white border border-gray-200 p-1 rounded-xl shadow-sm shrink-0">
                  {["Today", "Week", "Month", "Year"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleDashboardFilterChange(opt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        dashboardFilter === opt ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                <button
                  onClick={() => {
                    setActiveTab("registration");
                    setModalSearchTerm("");
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2 text-left hover:border-blue-200 hover:shadow-md transition duration-200 group focus:outline-none w-full"
                >
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider group-hover:text-blue-600 transition">Total Employees</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#0F172A]">{dashboardData.summary.totalEmployees}</span>
                    <span className="text-xs text-gray-500 font-medium">Registered ↗</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setFeedFilter("Present");
                    document.getElementById("todays-shift-feed")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2 text-left hover:border-emerald-200 hover:shadow-md transition duration-200 group focus:outline-none w-full"
                >
                  <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider group-hover:text-emerald-700 transition">Present Today</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-600">{dashboardData.summary.presentToday}</span>
                    <span className="text-xs text-gray-500 font-medium">On-site ↓</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setFeedFilter("Late");
                    document.getElementById("todays-shift-feed")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2 text-left hover:border-amber-200 hover:shadow-md transition duration-200 group focus:outline-none w-full"
                >
                  <span className="text-xs text-amber-600 font-bold uppercase tracking-wider group-hover:text-amber-700 transition">Late Checked-In</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-amber-500">{dashboardData.summary.lateToday}</span>
                    <span className="text-xs text-gray-500 font-medium">Employees ↓</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setFeedFilter("Absent");
                    document.getElementById("todays-shift-feed")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2 text-left hover:border-rose-200 hover:shadow-md transition duration-200 group focus:outline-none w-full"
                >
                  <span className="text-xs text-rose-600 font-bold uppercase tracking-wider group-hover:text-rose-700 transition">Absent Today</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-500">{dashboardData.summary.absentToday}</span>
                    <span className="text-xs text-gray-500 font-medium">Off-duty ↓</span>
                  </div>
                </button>
              </div>

              {/* Extra Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Worked Hours ({dashboardFilter})</span>
                    <div className="text-3xl font-extrabold text-[#0F172A] mt-1">{dashboardData.summary.totalWorkingHours} hrs</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Avg Daily Hours ({dashboardFilter})</span>
                    <div className="text-3xl font-extrabold text-[#0F172A] mt-1">{dashboardData.summary.avgWorkingHours} hrs</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                    <Briefcase size={24} />
                  </div>
                </div>
              </div>

              {/* Charts & Trends Row */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Employee Performance Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 w-full">
                  <h3 className="text-sm font-bold text-[#0F172A]">Employee Performance Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto">
                    {dashboardData.performance.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-10 font-medium col-span-full">
                        No performance stats loaded
                      </div>
                    ) : (
                      dashboardData.performance.map((p, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">{p.full_name}</span>
                            <span className="font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">{(p.avg_hours || 0).toFixed(1)} hrs/day</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${p.avg_hours >= 8 ? "bg-emerald-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(100, ((p.avg_hours || 0) / 10) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Today's Daily Activity Feed */}
              <div id="todays-shift-feed" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-md shadow-slate-100/40 space-y-4 -ml-1 sm:-ml-3 md:-ml-5 mr-0 relative border-l-4 border-l-blue-600">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Today's Shift Feed</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Live attendance and session breakdowns for employee shifts</p>
                  </div>
                  <div className="flex gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
                    {(["All", "Present", "Late", "Absent"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setFeedFilter(opt)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                          feedFilter === opt 
                            ? opt === "Present" ? "bg-emerald-600 text-white"
                              : opt === "Late" ? "bg-amber-500 text-white"
                              : opt === "Absent" ? "bg-rose-500 text-white"
                              : "bg-slate-700 text-white"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  <table className="w-full text-left text-xs text-gray-500 min-w-[800px]">
                    <thead className="bg-slate-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">Employee Name</th>
                        <th className="p-3.5">Morning Session</th>
                        <th className="p-3.5">Afternoon Session</th>
                        <th className="p-3.5">Total Hours</th>
                        <th className="p-3.5">Punctuality</th>
                        <th className="p-3.5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {(() => {
                        const todayStr = getEthiopianDateString();
                        const todayLogs = attendanceHistory.filter(h => h.date === todayStr);
                        
                        // Group logs by user_id, pre-populated with all registered employees of role 'Employee', etc.
                        const groupedTodayLogs: Record<number, {
                          user_id: number;
                          full_name: string;
                          role: string;
                          morning: any;
                          afternoon: any;
                        }> = {};

                        const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];
                        employees.filter(e => employeeRoles.includes(e.role)).forEach(e => {
                          groupedTodayLogs[e.id] = {
                            user_id: e.id,
                            full_name: e.full_name || "Registered Employee",
                            role: e.role || "Employee",
                            morning: null,
                            afternoon: null,
                          };
                        });

                        for (const log of todayLogs) {
                          const uid = log.user_id;
                          if (groupedTodayLogs[uid]) {
                            if (log.session === "Morning") {
                              groupedTodayLogs[uid].morning = log;
                            } else if (log.session === "Afternoon") {
                              groupedTodayLogs[uid].afternoon = log;
                            } else {
                              // Fallback if session is not set
                              if (!groupedTodayLogs[uid].morning) {
                                groupedTodayLogs[uid].morning = log;
                              } else {
                                groupedTodayLogs[uid].afternoon = log;
                              }
                            }
                          }
                        }

                        let groupedList = Object.values(groupedTodayLogs);

                        // Apply the dashboard card filter
                        if (feedFilter === "Present") {
                          groupedList = groupedList.filter(g => g.morning !== null || g.afternoon !== null);
                        } else if (feedFilter === "Late") {
                          groupedList = groupedList.filter(g => g.morning?.status === "Late" || g.afternoon?.status === "Late");
                        } else if (feedFilter === "Absent") {
                          groupedList = groupedList.filter(g => g.morning === null && g.afternoon === null);
                        }

                        if (groupedList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                {feedFilter === "All" 
                                  ? "No employees registered" 
                                  : `No employees are ${feedFilter.toLowerCase()} today.`}
                              </td>
                            </tr>
                          );
                        }

                        return groupedList.map((g) => {
                          const totalHrs = parseFloat(
                            ((g.morning?.total_hours || 0) + (g.afternoon?.total_hours || 0)).toFixed(2)
                          );
                          const currentEthHour = parseInt(getEthiopianTimeString(currentTime).split(":")[0], 10);
                          const isMorningNow = currentEthHour < 6;

                          return (
                            <tr key={g.user_id}>
                              <td className="p-3.5 font-bold text-gray-800">{g.full_name}</td>
                              
                              {/* Morning Session Column */}
                              <td className="p-3.5">
                                {g.morning ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 uppercase font-extrabold w-6">In:</span>
                                      <span className="font-mono text-xs text-slate-800">{g.morning.check_in_time || "--"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 uppercase font-extrabold w-6">Out:</span>
                                      <span className="font-mono text-xs text-slate-800">
                                        {g.morning.check_out_time || (g.morning.check_in_time ? "Active" : "--")}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5 font-bold text-[10px]">Absent</span>
                                )}
                              </td>

                              {/* Afternoon Session Column */}
                              <td className="p-3.5">
                                {g.afternoon ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 uppercase font-extrabold w-6">In:</span>
                                      <span className="font-mono text-xs text-slate-800">{g.afternoon.check_in_time || "--"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-400 uppercase font-extrabold w-6">Out:</span>
                                      <span className="font-mono text-xs text-slate-800">
                                        {g.afternoon.check_out_time || (g.afternoon.check_in_time ? "Active" : "--")}
                                      </span>
                                    </div>
                                  </div>
                                ) : isMorningNow ? (
                                  <span className="text-gray-300 font-normal">-</span>
                                ) : (
                                  <span className="text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5 font-bold text-[10px]">Absent</span>
                                )}
                              </td>

                              <td className="p-3.5 font-bold text-slate-800">{totalHrs} hrs</td>
                              
                              <td className="p-3.5">
                                <div className="flex flex-col gap-1">
                                  {g.morning ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block w-max ${
                                      g.morning.status === "Present" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                      g.morning.status === "Late" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                      "bg-rose-50 text-rose-600 border border-rose-100"
                                    }`}>
                                      AM: {g.morning.status}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold inline-block w-max bg-rose-50 text-rose-600 border border-rose-100">
                                      AM: Absent
                                    </span>
                                  )}
                                  {g.afternoon ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block w-max ${
                                      g.afternoon.status === "Present" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                      g.afternoon.status === "Late" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                      "bg-rose-50 text-rose-600 border border-rose-100"
                                    }`}>
                                      PM: {g.afternoon.status}
                                    </span>
                                  ) : isMorningNow ? null : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold inline-block w-max bg-rose-50 text-rose-600 border border-rose-100">
                                      PM: Absent
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedEmployeeId(g.user_id);
                                    setSelectedEmployeeTab("monthly");
                                    setModalSearchTerm("");
                                    setModalStatusFilter("All");
                                    setModalCustomRate("");
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition text-[11px] hover:shadow-sm"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Module 2: Approvals */}
          {activeTab === "approvals" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Approvals Panel</h2>
                <p className="text-gray-500 text-sm mt-0.5">Approve permission/leave requests and site adjustment hours</p>
              </div>

              {/* 1. Permission Requests List */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <FileText size={18} className="text-purple-600" /> Permission & Leave Approvals
                </h3>

                <div className="border border-gray-100 rounded-xl overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs text-gray-500 min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Request Type</th>
                        <th className="p-3.5">Duration</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {permissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            No leave or permission requests logged
                          </td>
                        </tr>
                      ) : (
                        permissions.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3.5 font-bold text-gray-800">{p.full_name}</td>
                            <td className="p-3.5 font-bold text-purple-600">{p.request_type}</td>
                            <td className="p-3.5 text-gray-500">
                              {p.start_date} to {p.end_date}
                              {p.status === "Approved" && p.approved_from_date && (
                                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                  Approved: {p.approved_from_date} to {p.approved_to_date}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-gray-500 max-w-[200px] truncate" title={p.reason}>{p.reason}</td>
                            <td className="p-3.5">
                              <span className={getStatusPill(p.status)}>{p.status}</span>
                            </td>
                            <td className="p-3.5 text-right">
                              {p.status === "Pending" ? (
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPermission(p);
                                      setAppFromDate(p.start_date);
                                      setAppToDate(p.end_date);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] transition"
                                  >
                                    Approve...
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await approvePermission(p.id, "Rejected");
                                      if (ok) {
                                        triggerNotification("success", "Leave permission rejected.");
                                      } else {
                                        triggerNotification("error", "Failed to reject permission.");
                                      }
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded text-[11px] transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Processed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Attendance Adjustments List */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <MapPin size={18} className="text-teal-600" /> Attendance Adjustment Requests (Site Visits / External Work)
                </h3>

                <div className="border border-gray-100 rounded-xl overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs text-gray-500 min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">Employee</th>
                        <th className="p-3.5">Adjustment Type</th>
                        <th className="p-3.5">Date & Times</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {attendanceRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            No attendance adjustments logged
                          </td>
                        </tr>
                      ) : (
                        attendanceRequests.map((r) => (
                          <tr key={r.id}>
                            <td className="p-3.5 font-bold text-gray-800">{r.full_name}</td>
                            <td className="p-3.5 font-bold text-teal-600">{r.type}</td>
                            <td className="p-3.5 text-gray-500">
                              {r.date} ({r.check_in_time} - {r.check_out_time})
                            </td>
                            <td className="p-3.5 text-gray-500 max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                            <td className="p-3.5">
                              <span className={getStatusPill(r.status)}>{r.status}</span>
                            </td>
                            <td className="p-3.5 text-right">
                              {r.status === "Pending" ? (
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={async () => {
                                      const ok = await approveAttendanceRequest(r.id, "Approved");
                                      if (ok) {
                                        triggerNotification("success", "Attendance adjustment approved.");
                                      } else {
                                        triggerNotification("error", "Action failed.");
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await approveAttendanceRequest(r.id, "Rejected");
                                      if (ok) {
                                        triggerNotification("success", "Attendance adjustment rejected.");
                                      } else {
                                        triggerNotification("error", "Action failed.");
                                      }
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded text-[11px] transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Processed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Permission approval dates config modal/form overlay */}
              {selectedPermission && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-100 shadow-xl space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Set Approved Date Range</h3>
                    <p className="text-xs text-gray-500">
                      Approve leave for <span className="font-bold">{selectedPermission.full_name}</span>. Original requested dates: {selectedPermission.start_date} to {selectedPermission.end_date}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">From Date</label>
                        <input 
                          type="date"
                          value={appFromDate}
                          onChange={(e) => setAppFromDate(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">To Date</label>
                        <input 
                          type="date"
                          value={appToDate}
                          onChange={(e) => setAppToDate(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <button
                        onClick={() => setSelectedPermission(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePermissionApprovalSubmit("Approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs"
                      >
                        Confirm Approval
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employee Details popup modal */}
          {selectedEmployeeId !== null && (() => {
                const selectedEmp = employees.find(e => e.id === selectedEmployeeId) || {
                  id: selectedEmployeeId,
                  full_name: attendanceHistory.find(h => h.user_id === selectedEmployeeId)?.full_name || "Registered Employee",
                  phone_number: attendanceHistory.find(h => h.user_id === selectedEmployeeId)?.phone_number || "No Phone Registered",
                  role: "Employee",
                  hourly_rate: 25.0
                };

                const empLogs = attendanceHistory.filter(h => h.user_id === selectedEmployeeId);
                const now = new Date();
                const todayStr = getEthiopianDateString(now);

                let filteredPeriodLogs: any[] = [];
                let tabTitle = "";
                let description = "";

                if (selectedEmployeeTab === "today") {
                  filteredPeriodLogs = empLogs.filter(l => l.date === todayStr);
                  tabTitle = "Today's Attendance Status";
                  description = "Detailed parameters of today's active shift log.";
                } else if (selectedEmployeeTab === "weekly") {
                  filteredPeriodLogs = empLogs.filter(l => {
                    const logTime = new Date(l.date + 'T00:00:00').getTime();
                    const todayStart = new Date(todayStr + 'T00:00:00').getTime();
                    const diffDays = (todayStart - logTime) / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays < 7;
                  });
                  tabTitle = "Weekly Analytics";
                  description = "Historical performance from the last 7 calendar days.";
                } else if (selectedEmployeeTab === "monthly") {
                  const [currYear, currMonth] = todayStr.split("-").map(Number);
                  let activeDetailMonth = selectedDetailMonth;
                  if (!activeDetailMonth || activeDetailMonth === "all") {
                    activeDetailMonth = String(currMonth).padStart(2, "0");
                  }
                  const activeDetailYear = currYear;

                  filteredPeriodLogs = empLogs.filter(l => {
                    const parts = l.date.split("-");
                    if (parts.length < 2) return false;
                    const logYear = Number(parts[0]);
                    const logMonth = parts[1]; // e.g. "01" or "10"
                    return logMonth === activeDetailMonth && logYear === activeDetailYear;
                  });
                  const monthName = ETHIOPIAN_MONTH_NAMES[Number(activeDetailMonth)] || "Selected Month";
                  tabTitle = `${monthName} ${activeDetailYear} Attendance Matrix`;
                  description = `Monthly breakdown and interactive attendance grid for ${monthName}.`;
                } else if (selectedEmployeeTab === "yearly") {
                  const [currYear, currMonth] = todayStr.split("-").map(Number);
                  const activeDetailMonth = selectedDetailMonth || "all";
                  const activeDetailYear = currYear;

                  filteredPeriodLogs = empLogs.filter(l => {
                    const parts = l.date.split("-");
                    if (parts.length < 2) return false;
                    
                    // Filter within 365 days
                    const logTime = new Date(l.date + 'T00:00:00').getTime();
                    const todayStart = new Date(todayStr + 'T00:00:00').getTime();
                    const diffDays = (todayStart - logTime) / (1000 * 60 * 60 * 24);
                    const withinYear = diffDays >= 0 && diffDays < 365;

                    if (!withinYear) return false;

                    if (activeDetailMonth !== "all") {
                      const logMonth = parts[1];
                      return logMonth === activeDetailMonth;
                    }
                    return true;
                  });

                  if (activeDetailMonth !== "all") {
                    const monthName = ETHIOPIAN_MONTH_NAMES[Number(activeDetailMonth)] || "Selected Month";
                    tabTitle = `Yearly Ledger - ${monthName} Filter`;
                    description = `Attendance metrics for ${monthName} within the past year.`;
                  } else {
                    tabTitle = "Yearly Attendance Ledger";
                    description = `Consolidated performance overview for the last 365 days.`;
                  }
                }

                // Apply interactive search and status filtering on the logs
                let finalLogs = [...filteredPeriodLogs];
                if (modalStatusFilter !== "All") {
                  finalLogs = finalLogs.filter(l => l.status === modalStatusFilter);
                }
                if (modalSearchTerm.trim() !== "") {
                  const query = modalSearchTerm.toLowerCase();
                  finalLogs = finalLogs.filter(l => 
                    l.date.toLowerCase().includes(query) || 
                    (l.check_in_time && l.check_in_time.toLowerCase().includes(query)) ||
                    (l.check_out_time && l.check_out_time.toLowerCase().includes(query)) ||
                    l.status.toLowerCase().includes(query)
                  );
                }

                // Compute stats
                const totalHours = parseFloat(filteredPeriodLogs.reduce((sum, l) => sum + (l.total_hours || 0), 0).toFixed(2));
                const totalDays = filteredPeriodLogs.length;
                const uniqueDaysLogged = new Set(filteredPeriodLogs.map(l => l.date)).size;
                const presentCount = filteredPeriodLogs.filter(l => l.status === "Present").length;
                const lateCount = filteredPeriodLogs.filter(l => l.status === "Late").length;
                const absentCount = filteredPeriodLogs.filter(l => l.status === "Absent").length;
                const punctuality = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

                // Session breakdowns
                const morningLogs = filteredPeriodLogs.filter(l => l.session === "Morning");
                const afternoonLogs = filteredPeriodLogs.filter(l => l.session === "Afternoon");

                const morningHours = parseFloat(morningLogs.reduce((sum, l) => sum + (l.total_hours || 0), 0).toFixed(2));
                const morningPresent = morningLogs.filter(l => l.status === "Present").length;
                const morningLate = morningLogs.filter(l => l.status === "Late").length;
                const morningTotal = morningLogs.length;
                const morningPunctuality = morningTotal > 0 ? Math.round((morningPresent / morningTotal) * 100) : 100;

                const afternoonHours = parseFloat(afternoonLogs.reduce((sum, l) => sum + (l.total_hours || 0), 0).toFixed(2));
                const afternoonPresent = afternoonLogs.filter(l => l.status === "Present").length;
                const afternoonLate = afternoonLogs.filter(l => l.status === "Late").length;
                const afternoonTotal = afternoonLogs.length;
                const afternoonPunctuality = afternoonTotal > 0 ? Math.round((afternoonPresent / afternoonTotal) * 100) : 100;
                
                // Interactive payout calculator (updates live if custom hourly rate is entered)
                const effectiveRate = modalCustomRate !== "" ? parseFloat(modalCustomRate) || 0 : selectedEmp.hourly_rate || 25;
                const estimatedPayout = totalHours * effectiveRate;

                return (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-5xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
                      {/* Modal Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2.5 py-1 rounded-md text-white/90">
                              Interactive Employee Diagnostic
                            </span>
                            <h3 className="text-xl font-bold mt-2">{selectedEmp.full_name}</h3>
                            <p className="text-xs text-blue-100 mt-1">
                              Phone: <span className="font-mono">{selectedEmp.phone_number}</span> • Registered Rate: <span className="font-bold">${selectedEmp.hourly_rate?.toFixed(2)}/hr</span>
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedEmployeeId(null)}
                            className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-white/90"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>

                        {/* Modal Sub-Tabs (Interactive Period selector) */}
                        <div className="flex gap-1 bg-white/10 p-1 rounded-xl mt-6">
                          {(["today", "weekly", "monthly", "yearly"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setSelectedEmployeeTab(t)}
                              className={`flex-1 text-center py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                                selectedEmployeeTab === t
                                  ? "bg-white text-blue-700 shadow-md"
                                  : "text-white/80 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Modal Body (Scrollable) */}
                      <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                        {/* Title block */}
                        <div className="border-b border-gray-100 pb-4">
                          <h4 className="text-base font-bold text-slate-800">{tabTitle}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                        </div>

                        {/* Beautiful 2-Column Responsive Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          
                          {/* LEFT COLUMN: Analytics & Calculator (col-span-4) */}
                          <div className="lg:col-span-4 space-y-6">
                            
                            {/* Ethiopian Month Selector Widget (for monthly & yearly) */}
                            {(selectedEmployeeTab === "monthly" || selectedEmployeeTab === "yearly") && (() => {
                              const [currYear, currMonth] = todayStr.split("-").map(Number);
                              const activeDetailMonth = selectedDetailMonth || String(currMonth).padStart(2, "0");
                              
                              return (
                                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-md space-y-3 relative overflow-hidden">
                                  {/* Decorative top stripe */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                                  
                                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                      <Calendar size={15} />
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">Evaluation Period</h5>
                                      <p className="text-[10px] text-slate-400 font-semibold">Select month to filter logs</p>
                                    </div>
                                  </div>

                                  <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                                    {/* Option for Full Year (only shown or particularly relevant for Yearly) */}
                                    {selectedEmployeeTab === "yearly" && (
                                      <button
                                        onClick={() => setSelectedDetailMonth("all")}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                                          activeDetailMonth === "all"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            activeDetailMonth === "all" ? "bg-white" : "bg-indigo-400"
                                          }`} />
                                          Full Year (All Months)
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                          activeDetailMonth === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                        }`}>
                                          {empLogs.length} logs
                                        </span>
                                      </button>
                                    )}

                                    {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => {
                                      const val = String(m).padStart(2, "0");
                                      const monthName = ETHIOPIAN_MONTH_NAMES[m];
                                      
                                      // Count logs for this specific month in the current active year
                                      const [currYear] = todayStr.split("-").map(Number);
                                      const monthLogCount = empLogs.filter(l => {
                                        const parts = l.date.split("-");
                                        return parts[0] === String(currYear) && parts[1] === val;
                                      }).length;

                                      return (
                                        <button
                                          key={m}
                                          onClick={() => {
                                            setSelectedDetailMonth(val);
                                          }}
                                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                                            activeDetailMonth === val
                                              ? "bg-blue-600 text-white shadow-sm"
                                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                              activeDetailMonth === val ? "bg-white" : "bg-blue-500"
                                            }`} />
                                            {m}. {monthName}
                                          </span>
                                          {monthLogCount > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
                                              activeDetailMonth === val ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                                            }`}>
                                              {monthLogCount} {monthLogCount === 1 ? 'log' : 'logs'}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Bento Statistics Grid (Rearranged as 2x2 compact grid) */}
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Diagnostic Performance Metrics</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hours Tracked</span>
                                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{totalHours} hrs</div>
                                  <span className="text-[8px] text-slate-400 mt-1 block">Total active work</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Punctuality</span>
                                  <div className={`text-lg font-black font-mono mt-1 ${punctuality >= 90 ? "text-emerald-600" : punctuality >= 75 ? "text-amber-500" : "text-rose-600"}`}>
                                    {punctuality}%
                                  </div>
                                  <span className="text-[8px] text-slate-400 mt-1 block">Attendance ratio</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Days Logged</span>
                                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{totalDays} shifts</div>
                                  <span className="text-[8px] text-slate-400 mt-1 block">Total shift count</span>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Payout Rate</span>
                                  <div className="text-lg font-black text-indigo-600 font-mono mt-1">${effectiveRate.toFixed(1)}/hr</div>
                                  <span className="text-[8px] text-slate-400 mt-1 block">Effective multiplier</span>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Payout Calculator Tuning Widget */}
                            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100/50 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                                  <DollarSign size={15} />
                                  Interactive Payout Calculator
                                </span>
                                <span className="text-[9px] text-blue-500 font-extrabold bg-blue-100/60 px-2 py-0.5 rounded">Live Engine</span>
                              </div>
                              <div className="space-y-2.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Tune Hourly Rate ($)</label>
                                  <input
                                    type="number"
                                    value={modalCustomRate}
                                    placeholder={`${selectedEmp.hourly_rate || 25}`}
                                    onChange={(e) => setModalCustomRate(e.target.value)}
                                    className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-500 shadow-sm"
                                  />
                                </div>
                                <div className="pt-2 border-t border-blue-100 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Projected Earnings</span>
                                  <span className="text-xl font-black text-blue-600 font-mono">${estimatedPayout.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Ratio Progress Bars */}
                            {selectedEmployeeTab !== "today" && (
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Distribution</h5>
                                <div className="h-2 rounded-full overflow-hidden bg-slate-100 flex">
                                  <div style={{ width: `${totalDays > 0 ? (presentCount / totalDays) * 100 : 100}%` }} className="bg-emerald-500 h-full" title="Present" />
                                  <div style={{ width: `${totalDays > 0 ? (lateCount / totalDays) * 100 : 0}%` }} className="bg-amber-500 h-full" title="Late" />
                                  <div style={{ width: `${totalDays > 0 ? (absentCount / totalDays) * 100 : 0}%` }} className="bg-rose-500 h-full" title="Absent" />
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold">
                                  <div className="flex items-center gap-1.5 text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Present: {presentCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-amber-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>Late: {lateCount}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-rose-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span>Absent: {absentCount}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Session-Specific Diagnostics (Morning vs. Afternoon summary) */}
                            <div className="space-y-3">
                              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shift Performance Matrix</h5>
                              
                              {/* Morning Session Card */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm space-y-2.5">
                                <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Morning Shift
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold">08:00 AM - 12:00 PM</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">Hours</span>
                                    <span className="text-[10px] font-bold text-slate-700 font-mono">{morningHours.toFixed(1)} hrs</span>
                                  </div>
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">On-Time</span>
                                    <span className="text-[10px] font-bold text-emerald-600 font-mono">{morningPresent}</span>
                                  </div>
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">Late</span>
                                    <span className="text-[10px] font-bold text-amber-500 font-mono">{morningLate}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Afternoon Session Card */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm space-y-2.5">
                                <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Afternoon Shift
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold">01:00 PM - 05:00 PM</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">Hours</span>
                                    <span className="text-[10px] font-bold text-slate-700 font-mono">{afternoonHours.toFixed(1)} hrs</span>
                                  </div>
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">On-Time</span>
                                    <span className="text-[10px] font-bold text-indigo-600 font-mono">{afternoonPresent}</span>
                                  </div>
                                  <div className="bg-slate-50/50 p-1 rounded-lg">
                                    <span className="text-[7px] text-slate-400 font-bold uppercase block">Late</span>
                                    <span className="text-[10px] font-bold text-amber-500 font-mono">{afternoonLate}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: Interactive Month Select, Checked Grid, and Logs Table (col-span-8) */}
                          <div className="lg:col-span-8 space-y-6">
                            
                            {/* Monthly Mode Select and Beautiful Attendance Grid */}
                            {selectedEmployeeTab === "monthly" && (() => {
                              const [currYear, currMonth] = todayStr.split("-").map(Number);
                              const activeDetailMonth = selectedDetailMonth || String(currMonth).padStart(2, "0");
                              const activeDetailYear = currYear;
                              const daysInMonth = Number(activeDetailMonth) === 13 ? 6 : 30;

                              return (
                                <div className="space-y-4">
                                  {/* Active Month Selected Header Banner */}
                                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Calendar size={18} />
                                      </div>
                                      <div>
                                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                          Ethiopian Month Matrix: {ETHIOPIAN_MONTH_NAMES[Number(activeDetailMonth)]}
                                        </h5>
                                        <p className="text-[11px] text-slate-400 font-semibold">
                                          Grid layout ledger for month {activeDetailMonth} of year {activeDetailYear} (Selected on the left)
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-xs font-black text-blue-700 bg-blue-50/50 border border-blue-100 px-3 py-1.5 rounded-lg shrink-0">
                                      {ETHIOPIAN_MONTH_NAMES[Number(activeDetailMonth)]} ({activeDetailMonth})
                                    </span>
                                  </div>

                                  {/* Grid Layout Table Form with checked circles */}
                                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Attendance Grid Matrix</h5>
                                      <div className="flex gap-3 text-[9px] font-bold">
                                        <span className="flex items-center gap-1 text-slate-500">
                                          <span className="w-1.5 h-1.5 rounded-sm bg-slate-200" /> Unattended
                                        </span>
                                        <span className="flex items-center gap-1 text-emerald-600">
                                          <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" /> AM Present
                                        </span>
                                        <span className="flex items-center gap-1 text-indigo-600">
                                          <span className="w-1.5 h-1.5 rounded-sm bg-indigo-500" /> PM Present
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                        const dayStr = String(d).padStart(2, "0");
                                        const fullDateStr = `${activeDetailYear}-${activeDetailMonth}-${dayStr}`;
                                        const dayLogs = empLogs.filter(l => l.date === fullDateStr);
                                        const mRec = dayLogs.find(l => l.session === "Morning");
                                        const aRec = dayLogs.find(l => l.session === "Afternoon");

                                        const isMPresent = mRec && (mRec.status === "Present" || mRec.status === "Late");
                                        const isAPresent = aRec && (aRec.status === "Present" || aRec.status === "Late");

                                        return (
                                          <div 
                                            key={d} 
                                            className="bg-white rounded-xl border border-slate-100 p-2.5 flex flex-col justify-between hover:shadow-md hover:border-blue-100 transition-all duration-200 shadow-sm"
                                          >
                                            <div className="flex justify-between items-center mb-1.5">
                                              <span className="text-[11px] font-black text-slate-700">Day {dayStr}</span>
                                              <span className="text-[9px] text-slate-400 font-mono">{ETHIOPIAN_MONTH_NAMES[Number(activeDetailMonth)].slice(0,3)} {d}</span>
                                            </div>
                                            <div className="space-y-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-slate-500 font-bold">Morning</span>
                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                                  isMPresent 
                                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" 
                                                    : "bg-slate-100 border-slate-200 text-transparent"
                                                }`}>
                                                  <Check size={9} strokeWidth={4} />
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-slate-500 font-bold">Afternoon</span>
                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                                  isAPresent 
                                                    ? "bg-indigo-500 border-indigo-600 text-white shadow-sm" 
                                                    : "bg-slate-100 border-slate-200 text-transparent"
                                                }`}>
                                                  <Check size={9} strokeWidth={4} />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Raw Logs Table and Advanced Search Filters */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Interactive Filter Board</h5>
                                  <p className="text-[10px] text-slate-500 font-medium">Search, filter, or export raw session records</p>
                                </div>
                                <div className="flex gap-1.5 bg-slate-50 border border-gray-200 p-1 rounded-lg self-stretch sm:self-auto">
                                  {(["All", "Present", "Late"] as const).map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => setModalStatusFilter(st)}
                                      className={`flex-1 sm:flex-initial px-3 py-1 text-[10px] font-bold rounded transition-all ${
                                        modalStatusFilter === st
                                          ? "bg-blue-600 text-white shadow-sm"
                                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="flex-1 relative">
                                  <input
                                    type="text"
                                    placeholder="Search logs by date, session or check-in..."
                                    value={modalSearchTerm}
                                    onChange={(e) => setModalSearchTerm(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-gray-700 focus:outline-none focus:border-blue-500 font-semibold shadow-sm"
                                  />
                                  {modalSearchTerm && (
                                    <button 
                                      onClick={() => setModalSearchTerm("")}
                                      className="absolute right-2.5 top-2 py-0.5 text-slate-400 hover:text-slate-600 font-bold text-sm"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Work Logs Table */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <h5 className="text-xs font-bold text-slate-700">Detailed Verification Log ({finalLogs.length} matching)</h5>
                                  {finalLogs.length > 0 && (
                                    <button
                                      onClick={() => {
                                        const headers = ["Date", "Session", "Check-In Time", "Check-Out Time", "Total Hours", "Status"];
                                        const rows = finalLogs.map(log => [log.date, log.session || "Morning", log.check_in_time || "", log.check_out_time || "", log.total_hours || "0", log.status]);
                                        const csvContent = "data:text/csv;charset=utf-8," 
                                          + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                                        const encodedUri = encodeURI(csvContent);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", encodedUri);
                                        link.setAttribute("download", `${selectedEmp.full_name.replace(/\s+/g, '_')}_ledger.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
                                    >
                                      📥 Export CSV Ledger
                                    </button>
                                  )}
                                </div>
                                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto scrollbar-thin shadow-sm max-h-[300px]">
                                  <table className="w-full text-left text-xs text-slate-500 min-w-[500px]">
                                    <thead className="bg-slate-50 border-b border-gray-100 font-bold uppercase text-[9px] tracking-wider text-slate-400 sticky top-0 z-10">
                                      <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Session</th>
                                        <th className="p-3">Check-In</th>
                                        <th className="p-3">Check-Out</th>
                                        <th className="p-3">Total Hours</th>
                                        <th className="p-3 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                                      {finalLogs.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="p-8 text-center text-slate-400">
                                            No verified logs found for this period or filters
                                          </td>
                                        </tr>
                                      ) : (
                                        finalLogs.map((log) => (
                                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                                            <td className="p-3 font-semibold text-slate-800">{log.date}</td>
                                            <td className="p-3">
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                log.session === "Morning" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                              }`}>
                                                {log.session || "Morning"}
                                              </span>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600">{log.check_in_time || "--"}</td>
                                            <td className="p-3 font-mono text-slate-600">{log.check_out_time || "Active"}</td>
                                            <td className="p-3 font-bold text-slate-800">{log.total_hours} hrs</td>
                                            <td className="p-3 text-right">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                log.status === "Present" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                              }`}>
                                                {log.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="bg-slate-100 border-t border-slate-200/60 p-4 shrink-0 flex justify-between items-center">
                        <div className="text-[11px] text-slate-400 font-semibold font-mono">
                          ID: {selectedEmp.id}
                        </div>
                        <button
                          onClick={() => setSelectedEmployeeId(null)}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm"
                        >
                          Close Diagnostic Ledger
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

          {/* Module 3: Admin Attendance */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Admin Attendance</h2>
                <p className="text-gray-500 text-sm mt-0.5">Check-in and check-out to log your administrative worked hours</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-xl text-center space-y-5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600">
                  <Clock size={32} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800">Your Daily Shift Loop</h3>
                  <p className="text-gray-500 text-xs mt-1">
                    Store and view your administrative timing records
                  </p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-5 my-4 inline-block">
                    <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-mono block">
                      {getEthiopianLocalClockTimeString(currentTime)}
                    </span>
                    <div className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider mt-0.5">
                      {getEthiopianTimePeriod(currentTime)}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-wider">
                      {getEthiopianNiceDateString(currentTime)}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                {(() => {
                  const morningRecord = Array.isArray(todayAttendance) ? todayAttendance.find(r => r.session === "Morning") : null;
                  const afternoonRecord = Array.isArray(todayAttendance) ? todayAttendance.find(r => r.session === "Afternoon") : null;
                  
                  const now = currentTime;
                  const currentHour = parseInt(getEthiopianTimeString(now).split(":")[0], 10);
                  const isMorningSession = currentHour < 6;
                  
                  const hasActiveMorningCheckIn = !!(morningRecord && !morningRecord.check_out_time);
                  const hasActiveAfternoonCheckIn = !!(afternoonRecord && !afternoonRecord.check_out_time);
                  
                  const showMorning = isMorningSession || hasActiveMorningCheckIn;
                  const showAfternoon = !isMorningSession || hasActiveAfternoonCheckIn;

                  return (
                    <div className="space-y-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {showMorning && (
                          <div className={`p-3 rounded-xl border text-xs font-bold text-left ${
                            morningRecord 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          }`}>
                            <p className="uppercase text-[10px] text-gray-400 mb-1">Morning Session</p>
                            {morningRecord ? (
                              <div>
                                Checked In: {morningRecord.check_in_time}
                                {morningRecord.check_out_time ? ` | Checked Out: ${morningRecord.check_out_time}` : " (Active)"}
                              </div>
                            ) : "Not Checked In"}
                          </div>
                        )}

                        {showAfternoon && (
                          <div className={`p-3 rounded-xl border text-xs font-bold text-left ${
                            afternoonRecord 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          }`}>
                            <p className="uppercase text-[10px] text-gray-400 mb-1">Afternoon Session</p>
                            {afternoonRecord ? (
                              <div>
                                Checked In: {afternoonRecord.check_in_time}
                                {afternoonRecord.check_out_time ? ` | Checked Out: ${afternoonRecord.check_out_time}` : " (Active)"}
                              </div>
                            ) : "Not Checked In"}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                        {/* Morning controls */}
                        {showMorning && (
                          <div className="flex gap-2">
                            {!morningRecord ? (
                              <button
                                onClick={async () => {
                                  const res = await checkIn(undefined, { session: "Morning" } as any);
                                  if (res.success) {
                                    triggerNotification("success", "Morning Checked In Successfully!");
                                  } else {
                                    triggerNotification("error", res.error || "Failed to check in Morning.");
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Check In Morning
                              </button>
                            ) : !morningRecord.check_out_time ? (
                              <button
                                onClick={async () => {
                                  const res = await checkOut({ session: "Morning" } as any);
                                  if (res.success) {
                                    triggerNotification("success", "Morning Checked Out Successfully!");
                                  } else {
                                    triggerNotification("error", res.error || "Failed to check out Morning.");
                                  }
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Check Out Morning
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold text-xs p-2 bg-emerald-50 border border-emerald-100 rounded-lg">Morning Completed</span>
                            )}
                          </div>
                        )}

                        {/* Afternoon controls */}
                        {showAfternoon && (
                          <div className="flex gap-2">
                            {!afternoonRecord ? (
                              <button
                                onClick={async () => {
                                  const res = await checkIn(undefined, { session: "Afternoon" } as any);
                                  if (res.success) {
                                    triggerNotification("success", "Afternoon Checked In Successfully!");
                                  } else {
                                    triggerNotification("error", res.error || "Failed to check in Afternoon.");
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Check In Afternoon
                              </button>
                            ) : !afternoonRecord.check_out_time ? (
                              <button
                                onClick={async () => {
                                  const res = await checkOut({ session: "Afternoon" } as any);
                                  if (res.success) {
                                    triggerNotification("success", "Afternoon Checked Out Successfully!");
                                  } else {
                                    triggerNotification("error", res.error || "Failed to check out Afternoon.");
                                  }
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Check Out Afternoon
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold text-xs p-2 bg-emerald-50 border border-emerald-100 rounded-lg">Afternoon Completed</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Display Admin's log history */}
                <div className="border-t border-gray-100 pt-6 space-y-3 text-left">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Administrative Log history</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {attendanceHistory.filter(h => ["SuperAdmin", "AdminCreator", "AdminManager", "Bootstrap"].includes(h.role || "")).map((h) => (
                      <div key={h.id} className="bg-slate-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                        <div>
                          <div className="text-gray-800">{h.date}</div>
                          <div className="text-gray-400 font-medium text-[10px]">
                            Shift: {h.check_in_time} to {h.check_out_time || "Active"}
                          </div>
                        </div>
                        <div className="text-blue-600 font-bold">{h.total_hours} worked hours</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module 4: Profile */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Admin Profile</h2>
                <p className="text-gray-500 text-sm mt-0.5">Manage your personal credentials, phone number, and password</p>
              </div>

              <form onSubmit={handleProfileUpdateSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl space-y-4">
                {profSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                    Admin Profile updated successfully!
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">Admin Full Name</label>
                  <input
                    type="text"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">Phone Number (Login ID)</label>
                  <input
                    type="text"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 block">Profile Picture</label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-gray-200">
                    {profPhoto ? (
                      <div className="relative shrink-0">
                        <img 
                          src={profPhoto} 
                          alt="Profile Preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-sm" 
                        />
                        <button
                          type="button"
                          onClick={() => setProfPhoto("")}
                          className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow transition"
                          title="Remove Photo"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <UserIcon size={24} />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-block px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs cursor-pointer transition border border-blue-100">
                        Choose Profile File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfPhoto(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">PNG, JPG, or GIF. Converted to secure base64 string.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Security Credentials</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Current Password</label>
                    <input
                      type="password"
                      placeholder="Required to set a new password"
                      value={profCurrentPass}
                      onChange={(e) => setProfCurrentPass(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">New Password</label>
                      <input
                        type="password"
                        placeholder="Min 4 characters"
                        value={profNewPass}
                        onChange={(e) => setProfNewPass(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={profConfirmPass}
                        onChange={(e) => setProfConfirmPass(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-lg shadow-blue-600/10 transition"
                >
                  Save Profile Settings
                </button>
              </form>
            </div>
          )}

          {/* Module 5: Salary Management */}
          {activeTab === "salary" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Salary Management</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Set hourly rates and view automated payroll earnings</p>
                </div>

                <div className="flex gap-1.5 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  {["Daily", "Weekly", "Monthly", "Yearly"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSalaryFilterChange(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        salaryFilter === opt ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payroll list with edit wage rates */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Employee Wage Sheets ({salaryFilter} breakdown)</h3>

                <div className="border border-gray-100 rounded-xl overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs text-gray-500 min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">Employee Name</th>
                        <th className="p-3.5">Total Worked Hours</th>
                        <th className="p-3.5">Hourly rate ($)</th>
                        <th className="p-3.5">Calculated Salary ($)</th>
                        <th className="p-3.5 text-right">Configure Wage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {salaries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            No employees loaded in database
                          </td>
                        </tr>
                      ) : (
                        salaries.map((s) => (
                          <tr key={s.user_id}>
                            <td className="p-3.5 font-bold text-gray-800">{s.full_name}</td>
                            <td className="p-3.5 font-bold text-gray-500">{s.total_hours || 0} hrs</td>
                            <td className="p-3.5 text-gray-500">
                              {editingEmployeeId === s.user_id ? (
                                <input
                                  type="text"
                                  value={editingRateValue}
                                  onChange={(e) => setEditingRateValue(e.target.value)}
                                  className="w-16 p-1 rounded border border-gray-200 focus:outline-none"
                                />
                              ) : (
                                <span>${s.hourly_rate?.toFixed(2)}/hr</span>
                              )}
                            </td>
                            <td className="p-3.5 font-extrabold text-blue-600 text-sm">
                              ${((s.total_hours || 0) * (s.hourly_rate || 0)).toFixed(2)}
                            </td>
                            <td className="p-3.5 text-right">
                              {editingEmployeeId === s.user_id ? (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={async () => {
                                      const ok = await updateHourlyRate(s.user_id, parseFloat(editingRateValue));
                                      if (ok) {
                                        setEditingEmployeeId(null);
                                        fetchSalaries(salaryFilter);
                                        triggerNotification("success", "Hourly rate updated successfully!");
                                      } else {
                                        triggerNotification("error", "Failed to update hourly rate.");
                                      }
                                    }}
                                    className="bg-emerald-600 text-white px-2 py-1 rounded text-[11px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingEmployeeId(null)}
                                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingEmployeeId(s.user_id);
                                    setEditingRateValue(s.hourly_rate.toString());
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-3 rounded text-[11px] transition"
                                >
                                  Edit Rate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Module 6: Employee Registration & Directory */}
          {activeTab === "registration" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Staff & Employee Registry</h2>
                <p className="text-gray-500 text-sm mt-0.5">Register new accounts, manage system roles, hourly wages, and update login credentials</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Registration Form */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-[#0F172A] pb-2 border-b border-gray-100">Add New Staff Member</h3>
                  
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {regSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                        {regSuccessMsg}
                      </div>
                    )}

                    {regErrorMsg && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                        {regErrorMsg}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe (Site Supervisor)"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">Phone Number (Login ID)</label>
                      <input
                        type="text"
                        placeholder="e.g. 0987654321"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">System Role</label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {user?.role === "Bootstrap" && (
                          <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                        )}
                        {user?.role === "AdminCreator" && (
                          <>
                            <option value="Employee">Employee (Workers, Masons, Operators)</option>
                            <option value="Purchaser">Purchaser</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Engineer">Engineer</option>
                            <option value="HR">HR</option>
                            <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                            <option value="AdminManager">Second Admin (Workspace Manager)</option>
                          </>
                        )}
                        {user?.role === "AdminManager" && (
                          <>
                            <option value="Employee">Employee (Workers, Masons, Operators)</option>
                            <option value="Purchaser">Purchaser</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Engineer">Engineer</option>
                            <option value="HR">HR</option>
                          </>
                        )}
                        {user?.role === "SuperAdmin" && (
                          <>
                            <option value="Employee">Employee (Workers, Masons, Operators)</option>
                            <option value="Purchaser">Purchaser</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Engineer">Engineer</option>
                            <option value="HR">HR</option>
                            <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                            <option value="AdminManager">Second Admin (Workspace Manager)</option>
                            <option value="SuperAdmin">Super Admin (Global)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">Standard Hourly Rate ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={regRate}
                        onChange={(e) => setRegRate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">Security Password</label>
                      <input
                        type="password"
                        placeholder="Specify secure login password"
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-lg shadow-blue-600/10 transition cursor-pointer"
                    >
                      Register Member
                    </button>
                  </form>
                </div>

                {/* Right: Registered Employees Table */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <h3 className="text-sm font-extrabold text-[#0F172A]">Staff & Employee Directory</h3>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search staff members..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="absolute left-2.5 top-2.5 text-slate-400">🔍</span>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-500 min-w-[600px]">
                      <thead className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="p-3">Staff Member</th>
                          <th className="p-3">Phone (ID)</th>
                          <th className="p-3">System Role</th>
                          <th className="p-3">Hourly Rate</th>
                          <th className="p-3">Date Registered</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {(() => {
                          const filtered = employees.filter((emp) =>
                            emp.full_name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                            emp.phone_number.includes(modalSearchTerm)
                          );

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                  No registered staff members found matching search query
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((emp) => {
                            const isCurrentUser = emp.id === user?.id;
                            const employeeRoles = ["Employee", "Purchaser", "Accountant", "Engineer", "HR"];
                            const isEditable = !(user?.role === "AdminManager" && !employeeRoles.includes(emp.role));
                            const isDeletable = !isCurrentUser && !(user?.role === "AdminManager" && !employeeRoles.includes(emp.role));

                            return (
                              <tr key={emp.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 font-bold text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <span>{emp.full_name}</span>
                                    {isCurrentUser && (
                                      <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-gray-500 font-mono text-[11px]">{emp.phone_number}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    !employeeRoles.includes(emp.role) 
                                      ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                      : "bg-slate-50 text-slate-700 border border-slate-100"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${!employeeRoles.includes(emp.role) ? "bg-blue-500" : "bg-slate-500"}`} />
                                    {emp.role}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-gray-600">${emp.hourly_rate?.toFixed(2)}/hr</td>
                                <td className="p-3 text-gray-400 text-[10px]">
                                  {emp.registration_date 
                                    ? getEthiopianFormattedDateString(emp.registration_date)
                                    : "Initial Seed"}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center justify-center gap-2">
                                    {isEditable && (
                                      <button
                                        onClick={() => {
                                          setEditingEmpId(emp.id);
                                          setEditEmpName(emp.full_name);
                                          setEditEmpPhone(emp.phone_number);
                                          setEditEmpRole(emp.role);
                                          setEditEmpRate(emp.hourly_rate?.toString() || "25.00");
                                          setEditEmpPass("");
                                        }}
                                        className="text-indigo-600 hover:text-indigo-900 font-bold text-[11px] hover:underline"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    
                                    {isDeletable && (
                                      <button
                                        onClick={() => {
                                          setDeletingEmployee({ id: emp.id, fullName: emp.full_name });
                                        }}
                                        className="text-rose-600 hover:text-rose-900 font-bold text-[11px] hover:underline"
                                      >
                                        Delete
                                      </button>
                                    )}

                                    {!isEditable && !isDeletable && (
                                      <span className="text-[10px] text-gray-400 italic">No Actions</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Edit Employee Modal */}
              {editingEmpId !== null && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl max-w-md w-full space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h3 className="text-base font-extrabold text-[#0F172A]">Edit Staff Account Details</h3>
                      <button 
                        onClick={() => setEditingEmpId(null)}
                        className="text-gray-400 hover:text-gray-600 font-extrabold text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editEmpName || !editEmpPhone || !editEmpRole) {
                          triggerNotification("error", "Name, phone, and role are required.");
                          return;
                        }
                        const res = await updateEmployee(editingEmpId, {
                          full_name: editEmpName,
                          phone_number: editEmpPhone,
                          role: editEmpRole,
                          hourly_rate: parseFloat(editEmpRate),
                          password: editEmpPass || undefined
                        });
                        if (res.success) {
                          triggerNotification("success", "Account details updated successfully!");
                          setEditingEmpId(null);
                        } else {
                          triggerNotification("error", res.error || "Failed to update profile.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Full Name</label>
                        <input
                          type="text"
                          value={editEmpName}
                          onChange={(e) => setEditEmpName(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Phone Number (Login ID)</label>
                        <input
                          type="text"
                          value={editEmpPhone}
                          onChange={(e) => setEditEmpPhone(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">System Role</label>
                        <select
                          value={editEmpRole}
                          onChange={(e) => setEditEmpRole(e.target.value)}
                          disabled={editingEmpId === user?.id || user?.role === "AdminManager"}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          {user?.role === "Bootstrap" && (
                            <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                          )}
                          {user?.role === "AdminCreator" && (
                            <>
                              <option value="Employee">Employee (Workers, Masons, Operators)</option>
                              <option value="Purchaser">Purchaser</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Engineer">Engineer</option>
                              <option value="HR">HR</option>
                              <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                              <option value="AdminManager">Second Admin (Workspace Manager)</option>
                            </>
                          )}
                          {user?.role === "AdminManager" && (
                            <>
                              <option value="Employee">Employee (Workers, Masons, Operators)</option>
                              <option value="Purchaser">Purchaser</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Engineer">Engineer</option>
                              <option value="HR">HR</option>
                            </>
                          )}
                          {user?.role === "SuperAdmin" && (
                            <>
                              <option value="Employee">Employee (Workers, Masons, Operators)</option>
                              <option value="Purchaser">Purchaser</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Engineer">Engineer</option>
                              <option value="HR">HR</option>
                              <option value="AdminCreator">Normal Admin (Workspace Creator)</option>
                              <option value="AdminManager">Second Admin (Workspace Manager)</option>
                              <option value="SuperAdmin">Super Admin (Global)</option>
                            </>
                          )}
                        </select>
                        {editingEmpId === user?.id && (
                          <span className="text-[10px] text-amber-500 font-bold block mt-0.5">
                            You cannot change your own admin status here to prevent lockouts.
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Standard Hourly Rate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editEmpRate}
                          onChange={(e) => setEditEmpRate(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Change Password (Optional)</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep existing password"
                          value={editEmpPass}
                          onChange={(e) => setEditEmpPass(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingEmpId(null)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-600/10 transition"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Employee Confirmation Modal */}
              {deletingEmployee !== null && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-2xl max-w-md w-full space-y-5 relative overflow-hidden">
                    {/* Decorative red top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />
                    
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Delete Staff Profile?</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                          Are you sure you want to delete <span className="text-slate-800 font-extrabold">{deletingEmployee.fullName}</span>?
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-100 text-[11px] text-slate-500 space-y-1.5 font-semibold">
                      <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-[9px]">
                        <AlertCircle size={11} />
                        Destructive Action Notice
                      </div>
                      <p className="leading-relaxed text-slate-600">
                        Proceeding with this action will permanently purge this employee's profile from the system. This operation cannot be undone and will erase:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 font-medium">
                        <li>All historical attendance sessions and records</li>
                        <li>Calculated attendance and punctuality index scores</li>
                        <li>Active leave request entries & permissions logs</li>
                        <li>Generated payroll ledger history</li>
                      </ul>
                    </div>

                    <div className="flex gap-2.5 justify-end pt-1">
                      <button
                        type="button"
                        disabled={isDeletingLoading}
                        onClick={() => setDeletingEmployee(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Keep Account
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingLoading}
                        onClick={async () => {
                          setIsDeletingLoading(true);
                          try {
                            const res = await deleteEmployee(deletingEmployee.id);
                            if (res.success) {
                              triggerNotification("success", "Staff profile and all related data purged successfully.");
                              setDeletingEmployee(null);
                            } else {
                              triggerNotification("error", res.error || "Failed to delete staff member.");
                            }
                          } catch (err) {
                            triggerNotification("error", "An unexpected error occurred.");
                          } finally {
                            setIsDeletingLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/15 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isDeletingLoading ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Yes, Purge Record"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Module 7: Attendance Score */}
          {activeTab === "scores" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Attendance Scores</h2>
                <p className="text-gray-500 text-sm mt-0.5">Assess workforce reliability, punctuality, and attendance indices</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="border border-gray-100 rounded-xl overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs text-gray-500 min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">Employee Name</th>
                        <th className="p-3.5">Attendance Score</th>
                        <th className="p-3.5">Punctuality Percentage</th>
                        <th className="p-3.5">Lates Registered</th>
                        <th className="p-3.5 text-right">Overall Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {scores.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            No scored employees in database
                          </td>
                        </tr>
                      ) : (
                        scores.map((sc) => (
                          <tr key={sc.id}>
                            <td className="p-3.5 font-bold text-gray-800">{sc.full_name}</td>
                            <td className="p-3.5 font-extrabold text-[#0F172A]">{sc.attendance_score}%</td>
                            <td className="p-3.5 text-gray-500">{sc.punctuality_percentage}%</td>
                            <td className="p-3.5 text-rose-600 font-bold">{sc.late_count} times</td>
                            <td className="p-3.5 text-right">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getRating(sc.attendance_score).color}`}>
                                {getRating(sc.attendance_score).text}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Module 8: QR Code Management & Site Settings */}
          {activeTab === "qr_code" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Site Security & Compliance</h2>
                <p className="text-gray-500 text-sm mt-0.5">Control the active verification token, Wi-Fi subnet boundaries, and GPS geofence rules</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* QR Code Section */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm mx-auto">
                      <QrCode size={22} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">Active Site Verification Token</h3>
                      <p className="text-xs text-gray-400 mt-1">This token must match the scanned string on mobile devices to check in.</p>
                    </div>

                    {qrCode ? (
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center max-w-[320px] mx-auto space-y-4">
                        {/* Real, professional QR Code representation using qrcode.react */}
                        <div className="w-44 h-44 bg-white border border-gray-100 rounded-xl p-3 shadow-md flex flex-col items-center justify-center relative">
                          <QRCodeSVG value={qrCode.code} size={135} level="M" includeMargin={true} />
                          
                          {/* Inner secret indicator */}
                          <span className="absolute bottom-1 text-[8px] font-bold text-gray-400 font-mono tracking-tight">
                            {qrCode.code}
                          </span>
                        </div>

                        <div className="space-y-1 text-center">
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Token Lifetime Status</div>
                          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 inline-block">Active Until Regenerated</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-xs text-gray-400 bg-slate-50 rounded-xl">No active site token. Regenerate below.</div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      const ok = await regenerateQRCode();
                      if (ok) {
                        triggerNotification("success", "New Site QR Code generated successfully!");
                      } else {
                        triggerNotification("error", "Failed to regenerate QR Code.");
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-lg shadow-blue-600/10 transition inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Regenerate QR Token
                  </button>
                </div>

                {/* Office GPS and Network Settings Form */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <Settings size={20} className="text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">Office Geofencing & Wi-Fi Configuration</h3>
                      <p className="text-xs text-gray-400">Specify physical boundaries & IP address rules for check-ins</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await updateSiteSettings({
                        office_name: editOfficeName,
                        latitude: parseFloat(editLatitude) || 9.0227,
                        longitude: parseFloat(editLongitude) || 38.7460,
                        wifi_ssid: editWifiSsid,
                        wifi_ip: editWifiIp,
                        use_wifi_verification: editUseWifi ? 1 : 0
                      });
                      if (ok) {
                        triggerNotification("success", "Compliance settings successfully updated!");
                      } else {
                        triggerNotification("error", "Failed to update site compliance settings.");
                      }
                    }} 
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-500">Site Name / Office Label</label>
                        <input
                          type="text"
                          value={editOfficeName}
                          onChange={(e) => setEditOfficeName(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Office Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={editLatitude}
                          onChange={(e) => setEditLatitude(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Office Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={editLongitude}
                          onChange={(e) => setEditLongitude(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Authorized Office WiFi SSID</label>
                        <input
                          type="text"
                          placeholder="e.g. BsquareY_WiFi"
                          value={editWifiSsid}
                          onChange={(e) => setEditWifiSsid(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Authorized Wi-Fi Public IP</label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.100"
                          value={editWifiIp}
                          onChange={(e) => setEditWifiIp(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-2">
                      <input
                        type="checkbox"
                        id="useWifi"
                        checked={editUseWifi}
                        onChange={(e) => setEditUseWifi(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="useWifi" className="text-xs font-bold text-gray-600 cursor-pointer">
                        Prioritize Wi-Fi verification (bypasses GPS geofence if network SSID matches)
                      </label>
                    </div>

                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-700 leading-normal space-y-1 font-sans">
                      <p className="font-bold">Compliance Rule Logics Implemented:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>If Wi-Fi verification is enabled & matches: check-ins succeed immediately.</li>
                        <li>Fallback: scan restricted to <strong className="text-blue-950">30 meters</strong> around exact location parameters above.</li>
                        <li>High accuracy is required. If device GPS signal quality is low (accuracy &gt; 15m), the boundary automatically expands up to <strong className="text-blue-950">50 meters</strong> to minimize employee locking errors, or fails if larger.</li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-lg shadow-slate-900/10 transition cursor-pointer"
                    >
                      Save Configuration Settings
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>


      </div>
    </div>
  );
}
