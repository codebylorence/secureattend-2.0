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
import Reports from "../pages/Reports";
import Departments from "../pages/Departments";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";

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
        {/* Public Route - Redirects if already logged in */}
        <Route path="/" element={<LoginRedirect />} />

        {/* Admin Routes - Protected */}
        <Route element={<PrivateRoute allowedRole="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/schedule" element={<ManageSchedule />} />
            <Route path="/admin/view-schedules" element={<ViewSchedules />} />
            <Route path="/admin/attendance" element={<EmployeeAttendance />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/departments" element={<Departments />} />
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
