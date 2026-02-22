import { useState, useEffect } from "react";
import AdminMetrics from "../components/AdminMetrics";
import TodaysAttendance from "../components/TodaysAttendance";
import WelcomeSection from "../components/WelcomeSection";
import { fetchDepartments } from "../api/DepartmentApi";

export default function AdminDashboard() {
  // State for filters
  const [statusFilter, setStatusFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;

  // Check for admin, supervisor, or teamleader roles
  const isSupervisor = userRole === "supervisor" || userRole === "admin" || userRole === "teamleader";

  // Fetch departments on component mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const departmentData = await fetchDepartments();
        setDepartments(departmentData);
      } catch (error) {
        console.error("Error fetching departments:", error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Dashboard
        </h1>
      </div>

      <WelcomeSection />
      <AdminMetrics />

      {/* Responsive Filter Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between my-6 gap-4">

        {/* Filters Group */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Hide the "Filter:" label on very small screens to save space */}
          <p className="text-gray-600 font-medium whitespace-nowrap hidden sm:block">
            Filter:
          </p>

          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>

            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-xl px-4 py-2.5 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
              disabled={loadingDepartments}
            >
              <option value="">All Departments</option>
              {loadingDepartments ? (
                <option disabled>Loading departments...</option>
              ) : (
                departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full lg:w-72 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Content Component */}
      <div className="mt-4">
        <TodaysAttendance
          supervisorView={isSupervisor}
          statusFilter={statusFilter}
          zoneFilter={zoneFilter}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}