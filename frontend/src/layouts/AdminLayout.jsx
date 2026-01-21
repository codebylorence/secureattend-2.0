import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useSidebar } from "../hooks/useSidebar";

export default function AdminLayout() {
  const { isCollapsed, toggle } = useSidebar();
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "admin";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        role={userRole} 
        isCollapsed={isCollapsed}
        onToggle={toggle}
      />
      
      <div 
        className={`flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20 ml-0' : 'lg:ml-72 ml-0'
        }`}
      >
        {/* Navbar - Fixed positioning is handled within the Navbar component */}
        <Navbar role={userRole} />

        {/* Main Content -

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 pt-16 p-4 md:p-6 lg:mt-[60px]">
          <div className="max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
