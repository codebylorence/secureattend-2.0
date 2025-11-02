import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import EmployeeAttendance from "../pages/EmployeeAttendance";
import Reports from "../pages/Reports";
import Departments from "../pages/Departments";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<Profile />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<Employees />} />
          <Route path="/admin/schedule" element={<ManageSchedule />} />
          <Route path="/admin/attendance" element={<EmployeeAttendance />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/settings" element={<Settings />} />

        </Route>

        <Route element={<EmployeeLayout />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/myattendance" element={<MyAttendance />} />
          <Route path="/employee/schedule" element={<MySchedule />} />
        </Route>

        <Route element={<TeamLeaderLayout />}>
          <Route path="/team/mydashboard" element={<EmployeeDashboard />} />
          <Route path="/team/myattendance" element={<MyAttendance />} />
          <Route path="/team/myschedule" element={<MySchedule />} />
          <Route path="/team/dashboard" element={<TeamDashboard />} />
          <Route path="/team/schedule" element={<TeamSchedule />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
