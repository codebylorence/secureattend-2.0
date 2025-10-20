import { Link } from "react-router-dom";
import {
  MdDashboard,
  MdGroups,
  MdCalendarToday,
  MdOutlineHowToReg,
  MdIntegrationInstructions,
  MdOutlineBusiness,
  MdSettings,
  MdCalendarMonth,
} from "react-icons/md";

function Sidebar({ role }) {
  return (
    <div className="w-60 bg-[#1E3A8A] text-white min-h-screen p-4 mt-25 flex inset-x-0 top-0 bottom-0 fixed">
      <ul className="space-y-8">

        {/* ================= ADMIN ================= */}
        {role === "admin" && (
          <>
            <SidebarItem icon={<MdDashboard size={30} />} to="/admin/dashboard" text="Dashboard" />
            <SidebarItem icon={<MdGroups size={30} />} to="/admin/employees" text="Employees" />
            <SidebarItem icon={<MdCalendarToday size={30} />} to="/admin/schedule" text="Manage Schedule" />
            <SidebarItem icon={<MdOutlineHowToReg size={30} />} to="/admin/attendance" text="Attendance" />
            <SidebarItem icon={<MdIntegrationInstructions size={30} />} to="/admin/reports" text="Reports" />
            <SidebarItem icon={<MdOutlineBusiness size={30} />} to="/admin/departments" text="Departments" />
            <SidebarItem icon={<MdSettings size={30} />} to="/admin/settings" text="Settings" />
          </>
        )}

        {/* ================= TEAM LEADER ================= */}
        {role === "teamleader" && (
          <>
            {/* Employee features (inherited) */}
            <SidebarItem icon={<MdDashboard size={30} />} to="/team/mydashboard" text="Dashboard" />
            <SidebarItem icon={<MdOutlineHowToReg size={30} />} to="/team/myattendance" text="My Attendance" />
            <SidebarItem icon={<MdCalendarToday size={30} />} to="/team/myschedule" text="My Schedule" />

            {/* Extra team leader tools */}
            <div className="border-t border-gray-400 my-4 opacity-50"></div>
            <SidebarItem icon={<MdGroups size={30} />} to="/team/dashboard" text="Team Dashboard" />
            <SidebarItem icon={<MdCalendarMonth size={30} />} to="/team/schedule" text="Team Schedule" />
          </>
        )}

        {/* ================= EMPLOYEE ================= */}
        {role === "employee" && (
          <>
            <SidebarItem icon={<MdDashboard size={30} />} to="/employee/dashboard" text="Dashboard" />
            <SidebarItem icon={<MdOutlineHowToReg size={30} />} to="/employee/myattendance" text="My Attendance" />
            <SidebarItem icon={<MdCalendarToday size={30} />} to="/employee/schedule" text="My Schedule" />
          </>
        )}
      </ul>
    </div>
  );
}

// ✅ Reusable sidebar item component
function SidebarItem({ icon, to, text }) {
  return (
    <li className="flex gap-2 items-center">
      {icon}
      <Link to={to} className="hover:text-gray-300 flex items-center">
        {text}
      </Link>
    </li>
  );
}

export default Sidebar;
