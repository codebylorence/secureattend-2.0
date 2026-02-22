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

      {/* Responsive Filters & Actions Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between my-6 gap-4 lg:gap-6">
        
        {/* Left Side: Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-1">
          <p className="text-heading font-medium whitespace-nowrap hidden sm:block">Filter :</p>
          
          <div className="w-full sm:w-auto">
            <DropdownZone value={zoneFilter} onChange={setZoneFilter} />
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            
            <span className="text-gray-500 text-sm font-medium py-1 sm:py-0">to</span>
            
            <div className="relative w-full sm:w-auto">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Right Side: Actions (Button & Search) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
          <button
            onClick={() => setIsOvertimeModalOpen(true)}
            className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 sm:py-2 rounded-lg hover:bg-[#2546b3] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 font-medium shadow-sm transition-all whitespace-nowrap"
          >
            Add Overtime
          </button>
          <div className="w-full sm:w-auto">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search attendance..." />
          </div>
        </div>
      </div>

      {/* Main Table Component */}
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