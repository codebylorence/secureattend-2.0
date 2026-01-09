import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "admin";
  
  // Set title based on role
  const title = userRole === "supervisor" ? "Supervisor Dashboard" : "Admin Dashboard";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={userRole} />
      <div className="flex-1 flex flex-col ml-60">
        <Navbar title={title} />
        <main className="flex-1 overflow-auto pt-20 p-6">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
