import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  return (
    <div className="grid h-screen pl-5 bg-gray-50">
      <Sidebar role="employee" />
      <div className="lg:pl-60">
        <Navbar title="Employee Dashboard" />
        <main className="flex-1 mt-30">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
