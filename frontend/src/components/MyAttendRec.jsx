import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa6";
import { getAttendances } from "../api/AttendanceApi";

export default function MyAttendRec() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

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
      
      console.log("MyAttendRec - User:", user);
      console.log("MyAttendRec - Employee ID:", employeeId);
      
      if (employeeId) {
        const data = await getAttendances({ employee_id: employeeId });
        console.log("MyAttendRec - Fetched data:", data);
        setAttendances(data);
      } else {
        console.log("MyAttendRec - No employee ID found");
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
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

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const displayedAttendances = attendances.slice(0, limit);

  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Attendance Records</h2>
          </div>

          <div className="flex items-center text-sm">
            <span className="mr-2">Show</span>
            <input
              type="number"
              min="1"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
              className="w-12 text-center border border-gray-300 rounded-md text-black bg-white"
            />
            <span className="ml-2">Entries</span>
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
                <th className="py-3 px-4 text-left font-medium">Day</th>
                <th className="py-3 px-4 text-left font-medium">Hours</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-4 px-4 text-center">Loading...</td>
                </tr>
              ) : displayedAttendances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-4 px-4 text-center">No attendance records found</td>
                </tr>
              ) : (
                displayedAttendances.map((attendance) => (
                  <tr key={attendance.id} className="border-b-1 bg-white">
                    <td className="py-3 px-4">{formatDate(attendance.date)}</td>
                    <td className="py-3 px-4">{formatTime(attendance.clock_in)}</td>
                    <td className="py-3 px-4">{formatTime(attendance.clock_out)}</td>
                    <td className="py-3 px-4">{getDayOfWeek(attendance.date)}</td>
                    <td className="py-3 px-4">
                      {attendance.total_hours ? `${attendance.total_hours.toFixed(2)} hrs` : "-"}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {(() => {
                        const statusDisplay = {
                          'Present': { label: 'Present', color: 'text-green-600' },
                          'Late': { label: 'Late', color: 'text-orange-600' },
                          'Absent': { label: 'Absent', color: 'text-red-600' },
                          'IN': { label: 'Clocked In', color: 'text-blue-600' },
                          'COMPLETED': { label: 'Completed', color: 'text-green-600' },
                        };
                        const display = statusDisplay[attendance.status] || { label: attendance.status, color: 'text-gray-600' };
                        return (
                          <span className={display.color}>
                            {display.label}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
    