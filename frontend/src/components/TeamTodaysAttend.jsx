import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa6";
import { getTodayAttendances } from "../api/AttendanceApi";
import { fetchEmployees } from "../api/EmployeeApi";

export default function TeamTodaysAttend({ department }) {
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (department) {
      fetchData();
    }
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (department) {
        fetchData();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [department]);

  const fetchData = async () => {
    try {
      const [attendanceData, employeeData] = await Promise.all([
        getTodayAttendances(),
        fetchEmployees()
      ]);
      
      // Filter employees by department
      const departmentEmployees = employeeData.filter(emp => emp.department === department);
      const departmentEmployeeIds = new Set(departmentEmployees.map(emp => emp.employee_id));
      
      // Filter attendances to only show employees from this department
      const filteredAttendances = attendanceData.filter(att => 
        departmentEmployeeIds.has(att.employee_id)
      );
      
      const employeeMap = {};
      departmentEmployees.forEach(emp => {
        employeeMap[emp.employee_id] = emp;
      });
      
      setAttendances(filteredAttendances);
      setEmployees(employeeMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const displayedAttendances = attendances.slice(0, limit);

  return (
    <>
      <div className="bg-white shadow rounded-md overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1E3A8A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <FaClock size={20} />
            <h2 className="font-semibold text-white">Today's Attendance</h2>
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
                <th className="py-3 px-4 text-left font-medium">Employee</th>
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
              ) : displayedAttendances.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center">No attendance records for today</td>
                </tr>
              ) : (
                displayedAttendances.map((attendance) => {
                  const employee = employees[attendance.employee_id] || {};
                  return (
                    <tr key={attendance.id} className="border-b-1 bg-white">
                      <td className="py-3 px-4">{employee.fullname || attendance.employee_id}</td>
                      <td className="py-3 px-4">{formatTime(attendance.clock_in)}</td>
                      <td className="py-3 px-4">{formatTime(attendance.clock_out)}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
