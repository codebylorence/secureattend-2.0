import { useState, useEffect } from "react";
import { MdSchedule, MdDelete } from "react-icons/md";
import { getAllSchedules, deleteSchedule } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";

export default function ViewSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesData, employeesData, departmentsData] = await Promise.all([
        getAllSchedules(),
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
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    
    try {
      await deleteSchedule(id);
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
          <span className="text-sm text-gray-600">
            {/* Count unique employees instead of schedule records */}
            {new Set(filteredSchedules.map(s => s.employee_id)).size} employee(s) with schedules
          </span>
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
          <div className="space-y-4">
            {/* Group schedules by employee */}
            {Object.entries(
              filteredSchedules.reduce((acc, schedule) => {
                const empId = schedule.employee_id;
                if (!acc[empId]) {
                  acc[empId] = [];
                }
                acc[empId].push(schedule);
                return acc;
              }, {})
            ).map(([employeeId, employeeSchedules]) => {
              const position = getEmployeePosition(employeeId);
              const isSupervisor = position === "Supervisor";
              const isTeamLeader = position === "Team Leader";
              
              // Group shifts by shift name for multi-shift records
              const shiftGroups = {};
              employeeSchedules.forEach(schedule => {
                if (schedule.shifts && Array.isArray(schedule.shifts)) {
                  schedule.shifts.forEach(shift => {
                    if (!shiftGroups[shift.shift_name]) {
                      shiftGroups[shift.shift_name] = {
                        shift_name: shift.shift_name,
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        days: shift.days,
                        created_by: schedule.created_by,
                        id: schedule.id
                      };
                    }
                  });
                } else {
                  if (!shiftGroups[schedule.shift_name]) {
                    shiftGroups[schedule.shift_name] = {
                      shift_name: schedule.shift_name,
                      start_time: schedule.start_time,
                      end_time: schedule.end_time,
                      days: schedule.days,
                      created_by: schedule.created_by,
                      id: schedule.id
                    };
                  }
                }
              });
              
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
                  
                  <div className="space-y-2 ml-4">
                    {Object.values(shiftGroups).map((shift, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-700">
                            <span className="font-medium">{shift.shift_name}</span>
                            <span className="text-gray-500"> - </span>
                            <span className="text-gray-600">{shift.days.join(', ')}</span>
                          </p>
                          <p className="text-sm text-gray-500 ml-4">
                            {shift.start_time} - {shift.end_time}
                          </p>
                          {shift.created_by && (
                            <p className="text-xs text-purple-600 ml-4">
                              Assigned by: {getCreatorName(shift.created_by)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="text-red-600 hover:text-red-800 p-2 transition-colors"
                          title="Delete Schedule"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
