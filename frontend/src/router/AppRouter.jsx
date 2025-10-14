import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/adminDashboard";
import Login from "../pages/Login";
import Employees from "../pages/Employees";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<Employees />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
