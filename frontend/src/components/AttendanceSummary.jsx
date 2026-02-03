import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaClock, FaEye, FaSync, FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getAttendances } from "../api/AttendanceApi";

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("7"); // Default to 7 days (weekly)
  const [attendanceData, setAttendanceData] = useState([
    { name: "Present", value: 0 },
    { name: "Late", value: 0 },
    { name: "Absent", value: 0 },
    { name: "Missed Clock-out", value: 0 },
  ]);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Calculate total records
  const totalRecords = attendanceData.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    fetchAttendanceSummary();
    
    // Auto-refresh every 30 seconds to sync with biometric app data
    const interval = setInterval(() => {
      fetchAttendanceSummary();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [filter]);

  const fetchAttendanceSummary = async () => {
    try {
      setSyncStatus('syncing');
      
      // Get current user's employee_id from localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) {
        setSyncStatus('error');
        return;
      }

      // Get employee's attendances
      const allAttendances = await getAttendances({ employee_id: employeeId });
      
      // Calculate date range based on filter
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parseInt(filter) + 1); // Include today
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // Filter attendances within the date range
      const filteredAttendances = allAttendances.filter(att => {
        const attDate = new Date(att.date);
        return attDate >= startDate && attDate <= endDate;
      });

      // Count by status
      const present = filteredAttendances.filter(att => 
        att.status === "Present" || att.status === "COMPLETED"
      ).length;
      
      const late = filteredAttendances.filter(att => 
        att.status === "Late"
      ).length;

      const absent = filteredAttendances.filter(att => 
        att.status === "Absent" || att.status === "ABSENT"
      ).length;

      const missedClockout = filteredAttendances.filter(att => 
        att.status === "Missed Clock-out"
      ).length;

      console.log('🔍 Attendance Summary Debug:', {
        filter: filter,
        totalAttendances: allAttendances.length,
        filteredAttendances: filteredAttendances.length,
        present,
        late,
        absent,
        missedClockout,
        sampleRecords: filteredAttendances.slice(0, 3).map(att => ({
          date: att.date,
          status: att.status
        }))
      });

      // Calculate total working days in the period (excluding weekends)
      let workingDays = 0;
      const currentDate = new Date(startDate);
      const endDateCopy = new Date(endDate);
      endDateCopy.setHours(0, 0, 0, 0); // Reset to start of day for comparison
      
      while (currentDate <= endDateCopy) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setAttendanceData([
        { name: "Present", value: present },
        { name: "Late", value: late },
        { name: "Absent", value: absent },
        { name: "Missed Clock-out", value: missedClockout },
      ]);
      
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      setSyncStatus('error');
    }
  };

  const handleViewAttendance = () => {
    console.log('🔍 Navigating to My Attendance page...');
    try {
      // Get user role to determine correct route
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userRole = user.role;
      
      // Navigate based on user role
      if (userRole === "teamleader") {
        navigate("/team/myattendance");
      } else {
        navigate("/employee/myattendance");
      }
      
      console.log('✅ Navigation completed successfully to:', userRole === "teamleader" ? "/team/myattendance" : "/employee/myattendance");
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#FCD34D"]; // Green for Present, Amber for Late, Red for Absent, Yellow for Missed Clock-out

  const getFilterLabel = () => {
    switch(filter) {
      case "7": return "Last 7 Days";
      case "30": return "Last 30 Days";
      default: return "Last 7 Days";
    }
  };

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-primary text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Attendance Summary</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync Status Indicator */}
          <div className="flex items-center space-x-1 text-xs">
            {syncStatus === 'syncing' && (
              <div className="flex items-center space-x-1 text-blue-200">
                <FaSync className="animate-spin" size={12} />
                <span>Syncing...</span>
              </div>
            )}
            {syncStatus === 'synced' && lastSyncTime && (
              <div className="flex items-center space-x-1 text-green-200">
                <FaSync size={12} />
                <span>{lastSyncTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-200">
                <FaExclamationTriangle size={12} />
                <span>Error</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleViewAttendance}
            className="flex items-center gap-1 text-sm hover:bg-primary-700 px-2 py-1 rounded transition-colors cursor-pointer"
            title="View Full Attendance"
          >
            <FaEye size={12} />
            View
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Filter Options */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter("7")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === "7" 
                  ? "bg-primary-600 text-white" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setFilter("30")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === "30" 
                  ? "bg-primary-600 text-white" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Period Info */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">{getFilterLabel()}</p>
          <p className="text-xs text-gray-500">
            Total Records: {totalRecords}
          </p>
        </div>

        {/* Chart */}
        <div className="h-40 flex items-center justify-center">
          {attendanceData.every(item => item.value === 0) ? (
            <div className="text-center text-gray-500">
              <p className="text-sm font-medium">No attendance recorded</p>
              <p className="text-xs mt-1">for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData.filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {attendanceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-semibold text-green-600">{attendanceData[0].value}</div>
            <div className="text-xs text-green-600">Present</div>
            {totalRecords > 0 && (
              <div className="text-xs text-green-500">
                {Math.round((attendanceData[0].value / totalRecords) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-yellow-50 p-2 rounded">
            <div className="text-lg font-semibold text-yellow-600">{attendanceData[1].value}</div>
            <div className="text-xs text-yellow-600">Late</div>
            {totalRecords > 0 && (
              <div className="text-xs text-yellow-500">
                {Math.round((attendanceData[1].value / totalRecords) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="text-lg font-semibold text-red-600">{attendanceData[2].value}</div>
            <div className="text-xs text-red-600">Absent</div>
            {totalRecords > 0 && (
              <div className="text-xs text-red-500">
                {Math.round((attendanceData[2].value / totalRecords) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-amber-50 p-2 rounded">
            <div className="text-lg font-semibold text-amber-600">{attendanceData[3].value}</div>
            <div className="text-xs text-amber-600">Missed</div>
            {totalRecords > 0 && (
              <div className="text-xs text-amber-500">
                {Math.round((attendanceData[3].value / totalRecords) * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
