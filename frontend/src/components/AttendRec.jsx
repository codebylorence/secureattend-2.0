import { useState, useEffect } from "react";
import { FaClock, FaEdit } from "react-icons/fa";
import { getAttendances } from "../api/AttendanceApi";
import { formatDateTime24 } from "../utils/timeFormat";
import OvertimeHoursModal from "./OvertimeHoursModal";

export default function AttendRec({ zoneFilter = "All Zone", searchTerm = "", startDate = "", endDate = "" }) {
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [overtimeHoursModal, setOvertimeHoursModal] = useState({ isOpen: false, attendance: null });

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter attendances based on filters
  useEffect(() => {
    let filtered = attendances;

    // Apply zone filter
    if (zoneFilter && zoneFilter !== "All Zone") {
      filtered = filtered.filter(attendance => 
        attendance.department === zoneFilter
      );
    }

    // Apply date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(attendance => {
        const attendanceDate = new Date(attendance.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return attendanceDate >= start && attendanceDate <= end;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(attendance =>
        attendance.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendance.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendance.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendance.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAttendances(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [attendances, zoneFilter, searchTerm, startDate, endDate]);

  const fetchData = async () => {
    try {
      const attendanceData = await getAttendances();
      setAttendances(attendanceData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    return formatDateTime24(dateString);
  };

  const handleEditOvertimeHours = (attendance) => {
    setOvertimeHoursModal({ isOpen: true, attendance });
  };

  const handleOvertimeHoursUpdate = (updatedAttendance) => {
    // Update the attendance in the local state
    setAttendances(prev => prev.map(att => 
      att.id === updatedAttendance.id 
        ? { ...att, overtime_hours: updatedAttendance.new_overtime_hours }
        : att
    ));
    setOvertimeHoursModal({ isOpen: false, attendance: null });
  };



  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-primary text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Attendance Records ({filteredAttendances.length})</h2>
          </div>


        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                      {zoneFilter !== "All Zone" || searchTerm || startDate || endDate 
                        ? "No attendance records match your filters" 
                        : "No attendance records found"
                      }
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedAttendances = filteredAttendances.slice(startIndex, endIndex);
                    return paginatedAttendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(attendance.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attendance.employee_name || attendance.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_in)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_out)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Calculate total hours including overtime
                            let totalHours = 0;
                            
                            // Regular hours from clock in/out
                            if (attendance.clock_in && attendance.clock_out) {
                              const clockIn = new Date(attendance.clock_in);
                              const clockOut = new Date(attendance.clock_out);
                              const regularHours = (clockOut - clockIn) / (1000 * 60 * 60);
                              totalHours += regularHours;
                            }
                            
                            // Add overtime hours if status is Overtime
                            if (attendance.status === 'Overtime' && attendance.overtime_hours) {
                              totalHours += parseFloat(attendance.overtime_hours);
                            }
                            
                            return totalHours > 0 ? `${totalHours.toFixed(2)} hrs` : "-";
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendance.department || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const statusDisplay = {
                              'Present': { label: 'Present', color: 'bg-green-100 text-green-800' },
                              'Late': { label: 'Late', color: 'bg-orange-100 text-orange-800' },
                              'Absent': { label: 'Absent', color: 'bg-red-100 text-red-800' },
                              'Overtime': { label: 'Overtime', color: 'bg-purple-100 text-purple-800' },
                              'IN': { label: 'Clocked In', color: 'bg-primary-100 text-primary-800' },
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.status === 'Overtime' && attendance.clock_out ? (
                            <button
                              onClick={() => handleEditOvertimeHours(attendance)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded hover:bg-purple-200"
                              title="Edit overtime hours"
                            >
                              <FaEdit className="w-3 h-3 mr-1" />
                              Edit Hours
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ));
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
                    const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage);
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
                              ? 'bg-primary-500 text-white border-primary-500'
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAttendances.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredAttendances.length / itemsPerPage)}
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
      
      {/* Overtime Hours Modal */}
      <OvertimeHoursModal
        isOpen={overtimeHoursModal.isOpen}
        onClose={() => setOvertimeHoursModal({ isOpen: false, attendance: null })}
        attendance={overtimeHoursModal.attendance}
        onUpdate={handleOvertimeHoursUpdate}
      />
    </>
  );
}

