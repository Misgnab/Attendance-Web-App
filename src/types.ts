export interface User {
  id: number;
  full_name: string;
  phone_number: string;
  role: "Bootstrap" | "AdminCreator" | "AdminManager" | "SuperAdmin" | "Employee" | "Purchaser" | "Accountant" | "Engineer" | "HR";
  photo?: string;
  hourly_rate: number;
  registration_date?: string;
  workspace_id?: number | null;
  workspace_name?: string;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  session?: "Morning" | "Afternoon";
  check_in_time?: string;
  check_out_time?: string;
  total_hours: number;
  status: "Present" | "Late" | "Absent";
  full_name?: string;
  phone_number?: string;
  role?: string;
}

export interface AttendanceRequest {
  id: number;
  user_id: number;
  type: "Site Visit" | "External Work" | "Purchaser Visit";
  date: string;
  check_in_time: string;
  check_out_time: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  full_name?: string;
  phone_number?: string;
  created_at?: string;
}

export interface PermissionRequest {
  id: number;
  user_id: number;
  request_type: "Permission" | "Sick Leave" | "Annual Leave";
  reason: string;
  start_date: string;
  end_date: string;
  approved_from_date?: string;
  approved_to_date?: string;
  status: "Pending" | "Approved" | "Rejected";
  full_name?: string;
  phone_number?: string;
  created_at?: string;
}

export interface SalaryPayment {
  user_id: number;
  full_name: string;
  phone_number: string;
  hourly_rate: number;
  total_hours: number;
  calculated_salary: number;
}

export interface AttendanceScoreRecord {
  id: number;
  full_name: string;
  phone_number: string;
  attendance_score: number;
  punctuality_percentage: number;
  late_count: number;
}

export interface QRCodeData {
  id: number;
  code: string;
  generated_at: string;
  expires_at: string;
}

export interface DashboardData {
  summary: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    totalWorkingHours: number;
    avgWorkingHours: number;
  };
  trends: Array<{
    date: string;
    present_count: number;
    working_hours: number;
  }>;
  performance: Array<{
    full_name: string;
    avg_hours: number;
    late_count: number;
  }>;
}

export interface SiteSettings {
  id: number;
  office_name: string;
  latitude: number;
  longitude: number;
  wifi_ssid: string;
  wifi_ip: string;
  use_wifi_verification: number; // 1 or 0
  updated_at?: string;
}

