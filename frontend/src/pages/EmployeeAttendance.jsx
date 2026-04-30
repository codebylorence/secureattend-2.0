import { useState, useEffect } from "react";
import { FaCalendarAlt, FaFilter, FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";
import DropdownZone from "../components/DropdownZone";
import SearchBar from "../components/SearchBar";
import AttendRec from "../components/AttendRec";
import OvertimeModal from "../components/OvertimeModal";
import { getAttendances } from "../api/AttendanceApi";

const STATUS_CONFIG = [
  { key: "All", label: "All", color: "bg-gray-100 text-gray-700 border-gray-300", active: "bg-gray-700 text-white border-gray-700" },
  { key: "Present", label: "Present", color: "bg-green-50 text-green-700 border-green-300", active: "bg-green-600 text-white border-green-600" },
  { key: "Late", label: "Late", color: "bg-orange-50 text-orange-700 border-orange-300", active: "bg-orange-500 text-white border-orange-500" },
  { key: "Absent", label: "Absent", color: "bg-red-50 text-red-700 border-red-300", active: "bg-red-500 text-white border-red-500" },
  { key: "Overtime", label: "Overtime", color: "bg-purple-50 text-purple-700 border-purple-300", active: "bg-purple-600 text-white border-purple-600" },
  { key: "Missed Clock-out", label: "Missed Clock-out", color: "bg-yellow-50 text-yellow-700 border-yellow-300", active: "bg-yellow-500 text-white border-yellow-500" },
];

export default function EmployeeAttendance() {
  // UI States
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [zoneFilter, setZoneFilter] = useState("All Zone");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");

  // Data States
  const [statusCounts, setStatusCounts] = useState({});
  const [availableShifts, setAvailableShifts] = useState([]);

  // Initialize Default Date Range (Current Week)
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + daysToMonday);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  }, []);

  // Backend/Data Sync Logic
  useEffect(() => {
    const syncData = async () => {
      try {
        const params = {};
        if (startDate && endDate) { 
          params.start_date = startDate; 
          params.end_date = endDate; 
        }
        
        const data = await getAttendances(params);

        // Apply zone filter to the local dataset to calculate counts
        const zoneFilteredData = zoneFilter === "All Zone" 
          ? data 
          : data.filter(r => r.department === zoneFilter);

        // 1. Update Status Counts
        const counts = { All: zoneFilteredData.length };
        STATUS_CONFIG.slice(1).forEach(s => {
          counts[s.key] = zoneFilteredData.filter(r => r.status === s.key).length;
        });
        setStatusCounts(counts);

        // 2. Extract Unique Shifts available in current view
        const shifts = [...new Set(zoneFilteredData.map(r => r.shift_name).filter(s => s && s !== '—'))].sort();
        setAvailableShifts(shifts);
        
      } catch (error) {
        console.error("Data synchronization failed:", error);
      }
    };

    if (startDate && endDate) syncData();
  }, [startDate, endDate, zoneFilter]);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10 px-4 md:px-0">
      {/* Original Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Attendance Records</h1>
      </div>

      {/* Row 1: Status Chips & Toggle Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_CONFIG.map(s => {
            const isActive = statusFilter === s.key;
            const count = statusCounts[s.key] ?? 0;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isActive ? s.active : s.color
                } hover:opacity-90 shadow-sm`}
              >
                {s.label}
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-white/60 text-gray-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            showFilters 
              ? 'bg-gray-800 text-white border-gray-800' 
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaFilter size={12} />
          {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          {showFilters ? <FaChevronUp size={10} className="ml-1" /> : <FaChevronDown size={10} className="ml-1" />}
        </button>
      </div>

      {/* Row 2: Collapsible Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Zone Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Department / Zone</label>
              <DropdownZone value={zoneFilter} onChange={setZoneFilter} />
            </div>

            {/* Shift Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Shift Schedule</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="All">All Shifts</option>
                {availableShifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date Range</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 transition-focus-within focus-within:ring-2 focus-within:ring-blue-500">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none w-full"
                />
                <span className="text-gray-400 font-light">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none w-full"
                />
                <FaCalendarAlt className="text-gray-400 ml-1" size={14} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Row 3: Search & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full sm:w-96">
          <SearchBar 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by employee name..." 
          />
        </div>
        
        <button
          onClick={() => setIsOvertimeModalOpen(true)}
          className="w-full sm:w-auto bg-[#2e4ead] text-white px-6 py-2.5 rounded-lg hover:bg-[#2546b3] transition-all flex items-center justify-center gap-2 font-semibold shadow-md active:scale-95"
        >
          <FaPlus size={12} />
          Add Overtime
        </button>
      </div>

      {/* Table Data Display */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <AttendRec
          zoneFilter={zoneFilter}
          searchTerm={searchTerm}
          startDate={startDate}
          endDate={endDate}
          statusFilter={statusFilter === "All" ? "" : statusFilter}
          shiftFilter={shiftFilter === "All" ? "" : shiftFilter}
        />
      </div>

      {/* Modals */}
      <OvertimeModal 
        isOpen={isOvertimeModalOpen} 
        onClose={() => setIsOvertimeModalOpen(false)} 
      />
    </div>
  );
}