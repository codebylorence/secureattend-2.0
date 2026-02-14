import { useState, useEffect } from "react";
import TeamMetrics from "../components/TeamMetrics";
import DropdownStatus from "../components/DropdownStatus";
import SearchBar from "../components/SearchBar";
import TeamTodaysAttend from "../components/TeamTodaysAttend";

export default function TeamDashboard() {
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    // Try to get department from user.employee first
    let dept = user.employee?.department;
    
    // If no department and we have employeeId, set based on known team leaders
    if (!dept && user.employeeId === 8) {
      // Charles Lopez (employeeId 8) is from Zone A
      dept = "Zone A";
    }
    
    setDepartment(dept || "Unknown");
  }, []);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Team Dashboard - {department}
        </h1>
      </div>

      <TeamMetrics department={department} />

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-heading mr-5">Filter :</p>
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
        </div>
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700"
        />
      </div>

      <TeamTodaysAttend 
        department={department} 
        statusFilter={statusFilter}
        searchTerm={searchTerm}
      />
    </div>
  );
}
