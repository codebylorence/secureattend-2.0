import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col ml-60">
        <Navbar title="Admin Dashboard" />
        <main className="flex-1 overflow-auto pt-20 p-6">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
