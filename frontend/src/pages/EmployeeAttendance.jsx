import { useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import DropdownZone from "../components/DropdownZone";
import SearchBar from "../components/SearchBar";
import AttendRec from "../components/AttendRec";
import OvertimeModal from "../components/OvertimeModal";

export default function EmployeeAttendance() {
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("All Zone");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Set default date range (current week)
  useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const endOfWeek = new Date(today);
    
    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + daysToMonday);
    
    // Get Sunday of current week
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Attendance Records
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-heading mr-5">Filter :</p>
          <DropdownZone value={zoneFilter} onChange={setZoneFilter} />
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FaCalendarAlt className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
            </div>
            <span className="text-gray-500">to</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FaCalendarAlt className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOvertimeModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-[#2546b3] focus:outline-none focus:ring-2 flex items-center gap-2"
          >
            Add Overtime
          </button>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search attendance..." />
        </div>
      </div>

      <AttendRec 
        zoneFilter={zoneFilter}
        searchTerm={searchTerm}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Overtime Modal */}
      <OvertimeModal 
        isOpen={isOvertimeModalOpen}
        onClose={() => setIsOvertimeModalOpen(false)}
      />
    </div>
  );
}
