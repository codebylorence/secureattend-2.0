import { useState, useEffect } from "react";
import { FaClock, FaSync, FaExclamationTriangle } from "react-icons/fa";
import { getTodayAttendances } from "../api/AttendanceApi";
import { isAuthenticated } from "../utils/auth";

export default function TodaysAttendance({ statusFilter, zoneFilter, searchTerm, supervisorView = false }) {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setSyncStatus('syncing');
      
      // Check if user is authenticated before making requests
      if (!isAuthenticated()) {
        console.log('📋 TodaysAttendance: User not authenticated, skipping attendance fetch');
        setLoading(false);
        setSyncStatus('error');
        return;
      }
      
      // Get today's attendance using the backend's timezone-aware endpoint
      // Add cache busting to ensure fresh data
      console.log('📋 TodaysAttendance: Fetching attendance data...');
      const attendanceData = await getTodayAttendances();
      console.log('📋 Raw attendance data received:', attendanceData.length, 'records');
      console.log('📋 Full attendance data:', attendanceData);
      
      // Log the actual status for debugging
      if (attendanceData.length > 0) {
        attendanceData.forEach(record => {
          console.log(`📊 Record: ${record.employee_id} - Status: ${record.status} - Date: ${record.date} - Dept: ${record.department}`);
        });
      } else {
        console.log('⚠️ No attendance records received from API');
      }
      
      let filteredAttendanceData = attendanceData;

      // For supervisor view, show all attendance records (no department filtering)
      if (supervisorView) {
        // Supervisors can see all attendance data across all departments
        filteredAttendanceData = attendanceData;
        console.log('📋 Supervisor view: showing all', filteredAttendanceData.length, 'records');
      } else {
        console.log('📋 Non-supervisor view: showing', filteredAttendanceData.length, 'records');
      }
      
      setAttendances(filteredAttendanceData);
      console.log('📋 Final attendances set:', filteredAttendanceData.length, 'records');
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("❌ Error fetching attendance data:", error);
      console.error("❌ Error details:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Filter attendances based on props
  const filteredAttendances = attendances.filter(attendance => {
    // Status filter
    if (statusFilter && attendance.status !== statusFilter) {
      console.log(`📋 Filtered out ${attendance.employee_id} due to status: ${attendance.status} !== ${statusFilter}`);
      return false;
    }
    
    // Zone/Department filter
    if (zoneFilter && attendance.department !== zoneFilter) {
      console.log(`📋 Filtered out ${attendance.employee_id} due to department: ${attendance.department} !== ${zoneFilter}`);
      return false;
    }
    
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = attendance.employee_name?.toLowerCase().includes(searchLower);
      const idMatch = attendance.employee_id?.toLowerCase().includes(searchLower);
      if (!nameMatch && !idMatch) {
        console.log(`📋 Filtered out ${attendance.employee_id} due to search: ${searchTerm}`);
        return false;
      }
    }
    
    return true;
  });

  // Log final filtering results
  console.log('📋 Filtering results:', {
    originalCount: attendances.length,
    filteredCount: filteredAttendances.length,
    statusFilter,
    zoneFilter,
    searchTerm
  });



  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20}/> 
            <h2 className="font-semibold text-white">Today's Attendance</h2>
          </div>
          
          {/* Sync Status Indicator */}
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={fetchData}
              className="flex items-center space-x-1 text-blue-200 hover:text-white px-2 py-1 rounded transition-colors"
              title="Refresh attendance data"
            >
              <FaSync className={syncStatus === 'syncing' ? 'animate-spin' : ''} size={14} />
              <span>Refresh</span>
            </button>
            
            {syncStatus === 'synced' && lastSyncTime && (
              <div className="flex items-center space-x-1 text-green-200">
                <span>Last sync: {lastSyncTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-200">
                <FaExclamationTriangle size={14} />
                <span>Sync error</span>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No attendance records match your filters</td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedAttendances = filteredAttendances.slice(startIndex, endIndex);
                    return paginatedAttendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attendance.employee_name || attendance.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_in)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(attendance.clock_out)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendance.department || "-"}</td>
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
                    ));
                })()
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredAttendances.length > itemsPerPage && (
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
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAttendances.length)} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAttendances.length)} of {filteredAttendances.length} entries
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
    </>
  );
}
