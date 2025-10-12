import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col">
        <Navbar title="Admin Dashboard" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
