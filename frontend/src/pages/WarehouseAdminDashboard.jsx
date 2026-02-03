import { useState, useEffect } from "react";
import AdminMetrics from "../components/AdminMetrics";
import TodaysAttendance from "../components/TodaysAttendance";
import WelcomeSection from "../components/WelcomeSection";
import { fetchDepartments } from "../api/DepartmentApi";

export default function WarehouseAdminDashboard() {
  // State for filters
  const [statusFilter, setStatusFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;
  
  // Warehouse admin has supervisor-like view for attendance
  const isSupervisor = true;

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
    <div className="pr-10 bg-gray-50">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Warehouse Admin Dashboard
        </h1>
      </div>
      
      <WelcomeSection />
      <AdminMetrics />

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-heading mr-5">Filter :</p>
          {/* For now, use simple dropdowns - can be enhanced later */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700"
          >
            <option value="">All Status</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
          <select 
            value={zoneFilter} 
            onChange={(e) => setZoneFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700"
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
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700"
        />
      </div>

      <TodaysAttendance 
        supervisorView={isSupervisor} 
        statusFilter={statusFilter}
        zoneFilter={zoneFilter}
        searchTerm={searchTerm}
      />
    </div>
  );
}