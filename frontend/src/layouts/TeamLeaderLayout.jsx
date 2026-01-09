import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function TeamLeaderLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="teamleader" />
      <div className="flex-1 flex flex-col ml-60">
        <Navbar title="TeamLeader Dashboard" />
        <main className="flex-1 overflow-auto pt-20 p-6">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  );
}
