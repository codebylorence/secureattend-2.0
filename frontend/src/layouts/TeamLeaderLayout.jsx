import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useSidebar } from "../hooks/useSidebar";

export default function TeamLeaderLayout() {
  const { isCollapsed, toggle } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        role="teamleader" 
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
        <Navbar role="teamleader" />
        <main className="flex-1 overflow-auto pt-20 p-6">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
