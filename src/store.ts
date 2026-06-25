import { create } from "zustand";
import { 
  User, 
  AttendanceRecord, 
  AttendanceRequest, 
  PermissionRequest, 
  SalaryPayment, 
  AttendanceScoreRecord, 
  QRCodeData, 
  DashboardData,
  SiteSettings
} from "./types.js";

interface AppState {
  token: string | null;
  user: User | null;
  employees: User[];
  todayAttendance: AttendanceRecord[];
  attendanceHistory: AttendanceRecord[];
  permissions: PermissionRequest[];
  attendanceRequests: AttendanceRequest[];
  salaries: SalaryPayment[];
  scores: AttendanceScoreRecord[];
  qrCode: QRCodeData | null;
  dashboardData: DashboardData | null;
  siteSettings: SiteSettings | null;
  loading: boolean;
  error: string | null;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (phone: string, pass: string) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { full_name: string; phone_number: string; password?: string; current_password?: string; new_password?: string; photo?: string }) => Promise<boolean>;
  checkSetup: () => Promise<boolean>;
  setupAdmin: (fullName: string, phone: string, pass: string) => Promise<boolean>;
  
  // Admin Actions
  registerEmployee: (data: any) => Promise<{ success: boolean; error?: string }>;
  fetchEmployees: () => Promise<void>;
  updateHourlyRate: (id: number, rate: number) => Promise<boolean>;
  updateEmployee: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
  deleteEmployee: (id: number) => Promise<{ success: boolean; error?: string }>;
  fetchDashboard: (filter: string, startDate?: string, endDate?: string) => Promise<void>;
  approvePermission: (id: number, status: "Approved" | "Rejected", from?: string, to?: string) => Promise<boolean>;
  approveAttendanceRequest: (id: number, status: "Approved" | "Rejected") => Promise<boolean>;
  fetchSalaries: (filter: string) => Promise<void>;
  regenerateQRCode: () => Promise<boolean>;

  // Common/Employee Actions
  fetchTodayAttendance: () => Promise<void>;
  checkIn: (qrCode?: string, locData?: { latitude?: number; longitude?: number; accuracy?: number; wifi_ssid?: string; wifi_ip?: string }) => Promise<{ success: boolean; error?: string; session?: string }>;
  checkOut: (locData?: { latitude?: number; longitude?: number; accuracy?: number; wifi_ssid?: string; wifi_ip?: string }) => Promise<{ success: boolean; error?: string; session?: string }>;
  fetchAttendanceHistory: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  submitPermission: (data: { request_type: string; reason: string; start_date: string; end_date: string }) => Promise<boolean>;
  fetchAttendanceRequests: () => Promise<void>;
  submitAttendanceRequest: (data: { type: string; date: string; check_in_time: string; check_out_time: string; reason: string }) => Promise<boolean>;
  fetchScores: () => Promise<void>;
  fetchQRCode: () => Promise<void>;
  fetchSiteSettings: () => Promise<void>;
  updateSiteSettings: (data: Partial<SiteSettings>) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: localStorage.getItem("attendance_token"),
  user: JSON.parse(localStorage.getItem("attendance_user") || "null"),
  employees: [],
  todayAttendance: [],
  attendanceHistory: [],
  permissions: [],
  attendanceRequests: [],
  salaries: [],
  scores: [],
  qrCode: null,
  dashboardData: null,
  siteSettings: null,
  loading: false,
  error: null,

  setToken: (token) => {
    if (token) localStorage.setItem("attendance_token", token);
    else localStorage.removeItem("attendance_token");
    set({ token });
  },

  setUser: (user) => {
    if (user) localStorage.setItem("attendance_user", JSON.stringify(user));
    else localStorage.removeItem("attendance_user");
    set({ user });
  },

  login: async (phone, pass) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || "Login failed", loading: false });
        return false;
      }
      get().setToken(data.token);
      get().setUser(data.user);
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: "Server connection failed", loading: false });
      return false;
    }
  },

  checkSetup: async () => {
    try {
      const res = await fetch("/api/auth/setup-check");
      if (res.ok) {
        const data = await res.json();
        return !!data.empty;
      }
      return false;
    } catch (err) {
      console.error("Check setup failed", err);
      return false;
    }
  },

  setupAdmin: async (fullName, phone, pass) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone_number: phone, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || "Setup failed", loading: false });
        return false;
      }
      get().setToken(data.token);
      get().setUser(data.user);
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: "Server connection failed", loading: false });
      return false;
    }
  },

  logout: () => {
    get().setToken(null);
    get().setUser(null);
    set({
      employees: [],
      todayAttendance: null,
      attendanceHistory: [],
      permissions: [],
      attendanceRequests: [],
      salaries: [],
      scores: [],
      qrCode: null,
      dashboardData: null,
      error: null
    });
  },

  fetchProfile: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        get().setUser(data);
      }
    } catch (err) {
      console.error("Fetch profile failed", err);
    }
  },

  updateProfile: async (data) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        set({ error: resData.error || "Profile update failed", loading: false });
        return false;
      }
      get().setUser(resData.user);
      set({ loading: false });
      return true;
    } catch (err) {
      set({ error: "Failed to update profile", loading: false });
      return false;
    }
  },

  registerEmployee: async (data) => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/employees/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      set({ loading: false });
      if (!res.ok) {
        return { success: false, error: resData.error || "Registration failed" };
      }
      get().fetchEmployees(); // Refresh employee list
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: "Network connection failed" };
    }
  },

  fetchEmployees: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ employees: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  updateHourlyRate: async (id, rate) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`/api/employees/${id}/hourly-rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hourly_rate: rate }),
      });
      if (res.ok) {
        get().fetchEmployees();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateEmployee: async (id, data) => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (res.ok) {
        get().fetchEmployees();
        return { success: true };
      }
      return { success: false, error: resData.error || "Failed to update employee details" };
    } catch (err) {
      console.error(err);
      return { success: false, error: "Network connection failed" };
    }
  },

  deleteEmployee: async (id) => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        get().fetchEmployees();
        return { success: true };
      }
      return { success: false, error: resData.error || "Failed to delete employee" };
    } catch (err) {
      console.error(err);
      return { success: false, error: "Network connection failed" };
    }
  },

  fetchDashboard: async (filter, startDate, endDate) => {
    const { token } = get();
    if (!token) return;
    try {
      let url = `/api/attendance/dashboard?filter=${filter}`;
      if (filter === "Custom" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ dashboardData: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchTodayAttendance: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/attendance/today", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ todayAttendance: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      console.error(err);
    }
  },

  checkIn: async (qrCode, locData) => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          qr_code: qrCode,
          ...locData
        }),
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchTodayAttendance();
        get().fetchAttendanceHistory();
        get().fetchScores();
        return { success: true, session: data.session };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: "Network error during check-in" };
    }
  },

  checkOut: async (locData) => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...locData
        })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchTodayAttendance();
        get().fetchAttendanceHistory();
        get().fetchScores();
        return { success: true, session: data.session };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: "Network error during check-out" };
    }
  },

  fetchAttendanceHistory: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/attendance/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ attendanceHistory: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchPermissions: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ permissions: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  submitPermission: async (data) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchPermissions();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  approvePermission: async (id, status, from, to) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`/api/permissions/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, approved_from_date: from, approved_to_date: to }),
      });
      if (res.ok) {
        get().fetchPermissions();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchAttendanceRequests: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/attendance-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ attendanceRequests: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  submitAttendanceRequest: async (data) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch("/api/attendance-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchAttendanceRequests();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  approveAttendanceRequest: async (id, status) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`/api/attendance-requests/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        get().fetchAttendanceRequests();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchSalaries: async (filter) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`/api/salaries?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ salaries: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchScores: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/scores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ scores: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchQRCode: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/qr-code", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ qrCode: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  regenerateQRCode: async () => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch("/api/qr-code/regenerate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        get().fetchQRCode();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  fetchSiteSettings: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/site-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ siteSettings: data });
      }
    } catch (err) {
      console.error("Error fetching site settings:", err);
    }
  },

  updateSiteSettings: async (data) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch("/api/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        get().fetchSiteSettings();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating site settings:", err);
      return false;
    }
  }
}));
