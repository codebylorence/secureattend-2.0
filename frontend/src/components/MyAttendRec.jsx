import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa6";
import { getAttendances } from "../api/AttendanceApi";

export default function MyAttendRec() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };



  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Attendance Records</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No attendance records found</td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedAttendances = attendances.slice(startIndex, endIndex);
                    return paginatedAttendances.map((attendance) => (
                    <tr key={attendance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(attendance.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_in)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_out)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getDayOfWeek(attendance.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendance.total_hours ? `${attendance.total_hours.toFixed(2)} hrs` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusDisplay = {
                            'Present': { label: 'Present', color: 'bg-green-100 text-green-800' },
                            'Late': { label: 'Late', color: 'bg-orange-100 text-orange-800' },
                            'Absent': { label: 'Absent', color: 'bg-red-100 text-red-800' },
                            'IN': { label: 'Clocked In', color: 'bg-blue-100 text-blue-800' },
                            'COMPLETED': { label: 'Completed', color: 'bg-green-100 text-green-800' },
                          };
                          const display = statusDisplay[attendance.status] || { label: attendance.status, color: 'bg-gray-100 text-gray-800' };
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${display.color}`}>
                              {display.label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                })()
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {attendances.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">entries</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, attendances.length)} to{' '}
                  {Math.min(currentPage * itemsPerPage, attendances.length)} of {attendances.length} entries
                </span>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {(() => {
                    const totalPages = Math.ceil(attendances.length / itemsPerPage);
                    const pages = [];
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + 4);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === i
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(attendances.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(attendances.length / itemsPerPage)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
    