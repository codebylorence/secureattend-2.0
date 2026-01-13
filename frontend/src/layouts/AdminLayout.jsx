import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useSidebar } from "../hooks/useSidebar";

export default function AdminLayout() {
  const { isCollapsed, toggle } = useSidebar();
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "admin";
  
  // Set title based on role
  const title = userRole === "supervisor" ? "Supervisor Dashboard" : 
                userRole === "superadmin" ? "Super Admin Dashboard" : "Admin Dashboard";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        role={userRole} 
        isCollapsed={isCollapsed}
        onToggle={toggle}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        // Desktop: adjust margin based on sidebar state
        // Mobile: no margin (sidebar is overlay)
        isCollapsed 
          ? 'lg:ml-16 ml-0' 
          : 'lg:ml-60 ml-0'
      }`}>
        <Navbar role={userRole} />
        <main className="flex-1 overflow-auto pt-20 p-6">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
