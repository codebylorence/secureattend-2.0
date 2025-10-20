import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function TeamLeaderLayout() {
  return (
    <div className="grid h-screen pl-5 sm:pl-70 bg-gray-50">
      <Sidebar role="teamleader" />
      <div>
        <Navbar title="TeamLeader Dashboard" />
        <main className="flex-1 mt-30">
          <Outlet /> {/* This is where your pages render */}
        </main>
      </div>
    </div>
  )
}
