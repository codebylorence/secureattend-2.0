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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : !lastAttendance ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No completed attendance records found</td>
                  </tr>
                ) : (
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(lastAttendance.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(lastAttendance.clock_in)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(lastAttendance.clock_out)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lastAttendance.total_hours ? `${lastAttendance.total_hours.toFixed(2)} hrs` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const statusDisplay = {
                          'Present': { label: 'Present', color: 'bg-green-100 text-green-800' },
                          'Late': { label: 'Late', color: 'bg-orange-100 text-orange-800' },
                          'IN': { label: 'Clocked In', color: 'bg-blue-100 text-blue-800' },
                          'COMPLETED': { label: 'Completed', color: 'bg-green-100 text-green-800' },
                        };
                        const display = statusDisplay[lastAttendance.status] || { label: lastAttendance.status, color: 'bg-gray-100 text-gray-800' };
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${display.color}`}>
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
      </div>
    </>
  );
}
