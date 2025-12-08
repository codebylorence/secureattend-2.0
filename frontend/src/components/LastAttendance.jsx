import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa6";
import { getAttendances } from "../api/AttendanceApi";

export default function LastAttendance() {
  const [lastAttendance, setLastAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Get current user's employee_id from localStorage or context
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;
      
      console.log("LastAttendance - User:", user);
      console.log("LastAttendance - Employee ID:", employeeId);
      
      if (employeeId) {
        const data = await getAttendances({ employee_id: employeeId });
        console.log("LastAttendance - Fetched data:", data);
        // Get the most recent completed attendance (Present, Late, or legacy COMPLETED)
        const completed = data.filter(a => a.status === "Present" || a.status === "Late" || a.status === "COMPLETED");
        if (completed.length > 0) {
          setLastAttendance(completed[0]);
        }
      } else {
        console.log("LastAttendance - No employee ID found");
      }
    } catch (error) {
      console.error("Error fetching last attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Last Attendance</h2>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto p-6 bg-[#F3F4F6]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#1E3A8A] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Date</th>
                <th className="py-3 px-4 text-left font-medium">Clock In</th>
                <th className="py-3 px-4 text-left font-medium">Clock Out</th>
                <th className="py-3 px-4 text-left font-medium">Hours Worked</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center">Loading...</td>
                </tr>
              ) : !lastAttendance ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center">No completed attendance records found</td>
                </tr>
              ) : (
                <tr className="border-b-1 bg-white">
                  <td className="py-3 px-4">{formatDate(lastAttendance.date)}</td>
                  <td className="py-3 px-4">{formatTime(lastAttendance.clock_in)}</td>
                  <td className="py-3 px-4">{formatTime(lastAttendance.clock_out)}</td>
                  <td className="py-3 px-4">
                    {lastAttendance.total_hours ? `${lastAttendance.total_hours.toFixed(2)} hrs` : "-"}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {(() => {
                      const statusDisplay = {
                        'Present': { label: 'Present', color: 'text-green-600' },
                        'Late': { label: 'Late', color: 'text-orange-600' },
                        'IN': { label: 'Clocked In', color: 'text-blue-600' },
                        'COMPLETED': { label: 'Completed', color: 'text-green-600' },
                      };
                      const display = statusDisplay[lastAttendance.status] || { label: lastAttendance.status, color: 'text-gray-600' };
                      return (
                        <span className={display.color}>
                          {display.label}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
