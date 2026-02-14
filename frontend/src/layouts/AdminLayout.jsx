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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Sidebar acts as an independent overlay on mobile, fixed left on desktop */}
      <Sidebar
        role={userRole}
        isCollapsed={isCollapsed}
        onToggle={toggle}
      />

      {/* Main Content Wrapper - dynamically adjusts left margin based on sidebar state */}
      <div
        className={`flex flex-col flex-1 w-full min-w-0 h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
          } ml-0`}
      >
        {/* Navbar sits naturally at the top of the flex container */}
        <div className="flex-none z-10">
          <Navbar role={userRole} />
        </div>

        {/* Scrollable Main Area - takes up remaining height without overlapping */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 pt-20">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
