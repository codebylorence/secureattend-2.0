import { useState, useEffect } from "react";
import { MdSchedule, MdDelete } from "react-icons/md";
import { getEmployeeSchedules, deleteEmployeeSchedule } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";

export default function ViewSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesData, employeesData, departmentsData] = await Promise.all([
        getEmployeeSchedules(),
        fetchEmployees(),
        fetchDepartments()
      ]);
      setSchedules(schedulesData);
      setEmployees(employeesData);
      setDepartments(departmentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule assignment?")) return;
    
    try {
      await deleteEmployeeSchedule(id);
      alert("Schedule deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to delete schedule");
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.fullname : employeeId;
  };

  const getEmployeeDepartment = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.department : "";
  };

  const getEmployeePosition = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.position : "";
  };

  const getCreatorName = (createdBy) => {
    if (!createdBy) return "Admin";
    const creator = employees.find((emp) => emp.employee_id === createdBy);
    return creator ? creator.fullname : createdBy;
  };

  // Filter and sort schedules
  const filteredSchedules = (selectedDepartment
    ? schedules.filter((schedule) => getEmployeeDepartment(schedule.employee_id) === selectedDepartment)
    : schedules
  ).sort((a, b) => {
    const deptA = getEmployeeDepartment(a.employee_id);
    const deptB = getEmployeeDepartment(b.employee_id);
    
    if (deptA !== deptB) {
      return deptA.localeCompare(deptB);
    }
    
    const positionOrder = { "Supervisor": 0, "Team Leader": 1 };
    const aOrder = positionOrder[getEmployeePosition(a.employee_id)] ?? 99;
    const bOrder = positionOrder[getEmployeePosition(b.employee_id)] ?? 99;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return getEmployeeName(a.employee_id).localeCompare(getEmployeeName(b.employee_id));
  });

  // Group schedules by employee
  const groupedSchedules = Object.entries(
    filteredSchedules.reduce((acc, schedule) => {
      const empId = schedule.employee_id;
      if (!acc[empId]) {
        acc[empId] = [];
      }
      acc[empId].push(schedule);
      return acc;
    }, {})
  );

  // Pagination calculations
  const totalEmployees = groupedSchedules.length;
  const totalPages = Math.ceil(totalEmployees / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedSchedules = groupedSchedules.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartment, entriesPerPage]);

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">View Assigned Schedules</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and manage all assigned employee schedules
        </p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Zone/Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A]">
            <MdSchedule /> Assigned Schedules
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <span className="text-sm text-gray-600">
              {totalEmployees} employee(s) with schedules
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading schedules...</p>
        ) : filteredSchedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {selectedDepartment
              ? `No schedules found for ${selectedDepartment}`
              : "No schedules assigned yet."}
          </p>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {paginatedSchedules.map(([employeeId, employeeSchedules]) => {
              const position = getEmployeePosition(employeeId);
              const isSupervisor = position === "Supervisor";
              const isTeamLeader = position === "Team Leader";
              
              return (
                <div key={employeeId} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-semibold text-gray-800 text-lg">
                      {getEmployeeName(employeeId)}
                    </p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {getEmployeeDepartment(employeeId)}
                    </span>
                    {isSupervisor && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                        Supervisor
                      </span>
                    )}
                    {isTeamLeader && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                        Team Leader
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 ml-4">
                    {employeeSchedules.map((schedule) => (
                      <div key={schedule.id} className="flex-shrink-0 border-l-4 border-blue-500 pl-3 pr-4 py-2 bg-gray-50 rounded relative group">
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Delete Schedule"
                        >
                          <MdDelete size={14} />
                        </button>
                        <div>
                          <p className="font-medium text-gray-800">{schedule.template.shift_name}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span>⏰</span> {schedule.template.start_time} - {schedule.template.end_time}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span>📅</span> {schedule.days.join(', ')}
                          </p>
                          {schedule.assigned_by && (
                            <p className="text-xs text-purple-600 mt-1">
                              By: {getCreatorName(schedule.assigned_by)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalEmployees)} of {totalEmployees} employees
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 border rounded text-sm ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
