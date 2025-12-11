import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/adminDashboard";
import Login from "../pages/Login";
import Employees from "../pages/Employees";
import EmployeeLayout from "../layouts/EmployeeLayout";
import EmployeeDashboard from "../pages/EmployeeDashboard";
import MyAttendance from "../pages/MyAttendance";
import MySchedule from "../pages/MySchedule";
import TeamLeaderLayout from "../layouts/TeamLeaderLayout";
import TeamDashboard from "../pages/TeamDashboard";
import TeamSchedule from "../pages/TeamSchedule";
import ManageSchedule from "../pages/ManageSchedule";
import ViewSchedules from "../pages/ViewSchedules";
import EmployeeAttendance from "../pages/EmployeeAttendance";

import Departments from "../pages/Departments";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import EmployeeRegistration from "../pages/EmployeeRegistration";
import RegistrationStatus from "../pages/RegistrationStatus";
import RegistrationManagement from "../pages/RegistrationManagement";
import CheckRegistrationStatus from "../pages/CheckRegistrationStatus";
import PositionManagement from "../pages/PositionManagement";
import AttendanceReports from "../pages/AttendanceReports";

// Component to redirect logged-in users away from login page
function LoginRedirect() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthenticated = !!token && !!user.role;

  if (isAuthenticated) {
    // Already logged in, redirect to dashboard
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "teamleader":
        return <Navigate to="/team/dashboard" replace />;
      case "employee":
        return <Navigate to="/employee/dashboard" replace />;
      default:
        return <Login />;
    }
  }

  return <Login />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginRedirect />} />
        <Route path="/register" element={<EmployeeRegistration />} />
        <Route path="/check-status" element={<CheckRegistrationStatus />} />
        <Route path="/registration-status/:employee_id" element={<RegistrationStatus />} />

        {/* Admin Routes - Protected */}
        <Route element={<PrivateRoute allowedRole="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/schedule" element={<ManageSchedule />} />
            <Route path="/admin/view-schedules" element={<ViewSchedules />} />
            <Route path="/admin/attendance" element={<EmployeeAttendance />} />

            <Route path="/admin/attendance-reports" element={<AttendanceReports />} />
            <Route path="/admin/departments" element={<Departments />} />
            <Route path="/admin/positions" element={<PositionManagement />} />
            <Route path="/admin/registrations" element={<RegistrationManagement />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Employee Routes - Protected */}
        <Route element={<PrivateRoute allowedRole="employee" />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/myattendance" element={<MyAttendance />} />
            <Route path="/employee/schedule" element={<MySchedule />} />
            <Route path="/employee/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Team Leader Routes - Protected */}
        <Route element={<PrivateRoute allowedRole="teamleader" />}>
          <Route element={<TeamLeaderLayout />}>
            <Route path="/team/mydashboard" element={<EmployeeDashboard />} />
            <Route path="/team/myattendance" element={<MyAttendance />} />
            <Route path="/team/myschedule" element={<MySchedule />} />
            <Route path="/team/dashboard" element={<TeamDashboard />} />
            <Route path="/team/schedule" element={<TeamSchedule />} />
            <Route path="/team/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
