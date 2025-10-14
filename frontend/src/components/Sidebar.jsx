import { Link } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import { MdGroups } from "react-icons/md";
import { MdCalendarToday } from "react-icons/md";
import { MdOutlineHowToReg } from "react-icons/md";
import { MdIntegrationInstructions } from "react-icons/md";
import { MdOutlineBusiness } from "react-icons/md";
import { MdSettings } from "react-icons/md";

function Sidebar({ role }) {
  return (
    <div className="w-64 bg-blue-900 text-white min-h-screen p-4 mt-5">
      <h2 className="text-xl mb-6">SecureAttend</h2>
      <ul className="space-y-8">
        {/* Common Links for All Roles */}
        {/* <li>
          <Link to="/dashboard" className="hover:text-gray-300">Dashboard</Link>
        </li> */}

        {/* Admin Only */}
        {role === "admin" && (
          <>
            <li className="flex gap-2">
              <MdDashboard size="30"/>
              <Link to="/admin/dashboard" className="hover:text-gray-300 flex items-center">
                Dashboard
              </Link>
            </li>
            <li className="flex gap-2">
              <MdGroups size="30"/>
              <Link to="/admin/employees" className="hover:text-gray-300 flex items-center">
                Employees
              </Link>
            </li>
            <li className="flex gap-2">
              <MdCalendarToday size="30"/>
              <Link to="/admin/schedule" className="hover:text-gray-300 flex items-center">
                Manage Schedule
              </Link>
            </li>
            <li className="flex gap-2">
              <MdOutlineHowToReg size="30"/>
              <Link to="/admin/attendance" className="hover:text-gray-300 flex items-center">
                Attendance
              </Link>
            </li>
            <li className="flex gap-2">
              <MdIntegrationInstructions size="30"/>
              <Link to="/admin/reports" className="hover:text-gray-300 flex items-center">
                Reports
              </Link>
            </li>
            <li className="flex gap-2">
              <MdOutlineBusiness size="30"/>
              <Link to="/admin/departments" className="hover:text-gray-300 flex items-center">
                Departments
              </Link>
            </li>
            <li className="flex gap-2">
              <MdSettings size="30"/>
              <Link to="/admin/settings" className="hover:text-gray-300 flex items-center">
                Settings
              </Link>
            </li>
          </>
        )}

        {/* Team Leader Only */}
        {role === "teamleader" && (
          <>
            <li>
              <Link to="/team/attendance" className="hover:text-gray-300">
                Team Attendance
              </Link>
            </li>
            <li>
              <Link to="/team/schedule" className="hover:text-gray-300">
                Team Schedule
              </Link>
            </li>
          </>
        )}

        {/* Employee Only */}
        {role === "employee" && (
          <>
            <li>
              <Link to="/employee/attendance" className="hover:text-gray-300">
                My Attendance
              </Link>
            </li>
            <li>
              <Link to="/employee/schedule" className="hover:text-gray-300">
                My Schedule
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;
