import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { getAttendances, deleteAttendance } from "../api/AttendanceApi";
import { formatDateTime24 } from "../utils/timeFormat";
import ConfirmationModal from "./ConfirmationModal";
import { toast } from "react-toastify";

export default function AttendRec({ zoneFilter = "All Zone", searchTerm = "", startDate = "", endDate = "", statusFilter = "", shiftFilter = "" }) {
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, attendance: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

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

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(attendance => attendance.status === statusFilter);
    }

    // Apply shift filter
    if (shiftFilter) {
      filtered = filtered.filter(attendance => attendance.shift_name === shiftFilter);
    }

    setFilteredAttendances(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [attendances, zoneFilter, searchTerm, startDate, endDate, statusFilter, shiftFilter]);

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

  const handleDelete = async () => {
    const attendance = deleteModal.attendance;
    if (!attendance) return;
    setDeleteLoading(true);
    try {
      await deleteAttendance(attendance.id);
      setAttendances(prev => prev.filter(att => att.id !== attendance.id));
      toast.success("Attendance record deleted.");
      setDeleteModal({ isOpen: false, attendance: null });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Failed to delete attendance record.");
    } finally {
      setDeleteLoading(false);
    }
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
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
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatDate(attendance.date)}</div>
                          {attendance.holiday_name && (
                            <div className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded inline-block ${
                              attendance.holiday_type === 'Regular Holiday'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              🎌 {attendance.holiday_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attendance.employee_name || attendance.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendance.shift_name && attendance.shift_name !== '—' ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {attendance.shift_name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_in)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_out)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Use total_hours from DB (set by biometric app with correct capping logic).
                            // Fall back to clock_out - clock_in only if total_hours is not available.
                            if (attendance.total_hours != null && attendance.total_hours > 0) {
                              return `${parseFloat(attendance.total_hours).toFixed(2)} hrs`;
                            }
                            if (attendance.clock_in && attendance.clock_out) {
                              const clockIn = new Date(attendance.clock_in);
                              const clockOut = new Date(attendance.clock_out);
                              const workedHours = (clockOut - clockIn) / (1000 * 60 * 60);
                              return workedHours > 0 ? `${workedHours.toFixed(2)} hrs` : "-";
                            }
                            return "-";
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
                              'IN': { label: 'Present', color: 'bg-green-100 text-green-800' },
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
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, attendance })}
                                className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm shadow-rose-100"
                                title="Delete record"
                              >
                                <MdDelete size={16} />
                              </button>
                            )}
                          </div>
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
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, attendance: null })}
        onConfirm={handleDelete}
        title="Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
        itemDetails={deleteModal.attendance ? {
          "Employee": deleteModal.attendance.employee_name || deleteModal.attendance.employee_id,
          "Date": formatDate(deleteModal.attendance.date),
          "Status": deleteModal.attendance.status,
          "Department": deleteModal.attendance.department || "—"
        } : null}
      />
    </>
  );
}

