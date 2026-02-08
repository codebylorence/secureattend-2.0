import { MdEditCalendar, MdDelete, MdVisibility } from "react-icons/md";
import { useState, useEffect } from "react";
import { fetchEmployees } from "../api/EmployeeApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { createSchedule, getAllSchedules, deleteSchedule } from "../api/ScheduleApi";

export default function AssignSched() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [formData, setFormData] = useState({
    employee_id: "",
    shift_name: "",
    start_time: "",
    end_time: "",
    days: [],
  });

  // Predefined shift templates
  const shiftTemplates = [
    { name: "Opening Shift", start: "8:00 AM", end: "4:00 PM" },
    { name: "Closing Shift", start: "4:00 PM", end: "12:00 AM" },
    { name: "Graveyard Shift", start: "12:00 AM", end: "8:00 AM" },
  ];

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchEmployeesData();
    fetchSchedules();
    fetchDepartmentsData();
  }, []);

  const fetchEmployeesData = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const data = await getAllSchedules();
      setSchedules(data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const handleShiftChange = (shiftName) => {
    // Find the shift template
    const template = shiftTemplates.find(t => t.name === shiftName);
    
    if (template) {
      setFormData({
        ...formData,
        shift_name: template.name,
        start_time: template.start,
        end_time: template.end
      });
    } else {
      setFormData({
        ...formData,
        shift_name: "",
        start_time: "",
        end_time: ""
      });
    }
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.shift_name || !formData.start_time || !formData.end_time || formData.days.length === 0) {
      return alert("Please fill all fields and select at least one day!");
    }

    try {
      // Get the employee's department
      const employee = employees.find(emp => emp.employee_id === formData.employee_id);
      const department = employee?.department || "";

      // Get current user for created_by
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const createdBy = user.employee?.employee_id || "admin";

      await createSchedule({
        ...formData,
        department: department,
        is_template: false,
        created_by: createdBy
      });
      alert("Schedule assigned successfully!");
      setFormData({
        employee_id: "",
        shift_name: "",
        start_time: "",
        end_time: "",
        days: [],
      });
      fetchSchedules();
    } catch (error) {
      console.error("Error assigning schedule:", error);
      const errorMsg = error.response?.data?.message || "Failed to assign schedule";
      alert(`Failed to assign schedule: ${errorMsg}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    
    try {
      await deleteSchedule(id);
      alert("Schedule deleted successfully!");
      fetchSchedules();
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

  const getCreatorName = (createdBy) => {
    if (!createdBy) return "Admin";
    const creator = employees.find((emp) => emp.employee_id === createdBy);
    return creator ? creator.fullname : createdBy;
  };

  // Sort employees by department, then by position (Supervisor first), then by name
  const sortedEmployees = [...employees].sort((a, b) => {
    // First sort by department
    if (a.department !== b.department) {
      return (a.department || "").localeCompare(b.department || "");
    }
    
    // Then by position (Supervisor first)
    const positionOrder = { "Supervisor": 0, "Team Leader": 1 };
    const aOrder = positionOrder[a.position] ?? 99;
    const bOrder = positionOrder[b.position] ?? 99;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Finally by name
    return (a.fullname || "").localeCompare(b.fullname || "");
  });

  // Filter and sort schedules
  const filteredSchedules = (selectedDepartment
    ? schedules.filter((schedule) => getEmployeeDepartment(schedule.employee_id) === selectedDepartment)
    : schedules
  ).sort((a, b) => {
    const deptA = getEmployeeDepartment(a.employee_id);
    const deptB = getEmployeeDepartment(b.employee_id);
    
    // Sort by department first
    if (deptA !== deptB) {
      return deptA.localeCompare(deptB);
    }
    
    // Then by employee position (Supervisor first)
    const empA = employees.find(e => e.employee_id === a.employee_id);
    const empB = employees.find(e => e.employee_id === b.employee_id);
    
    const positionOrder = { "Supervisor": 0, "Team Leader": 1 };
    const aOrder = positionOrder[empA?.position] ?? 99;
    const bOrder = positionOrder[empB?.position] ?? 99;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Finally by employee name
    return getEmployeeName(a.employee_id).localeCompare(getEmployeeName(b.employee_id));
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
        <MdEditCalendar /> Assign Schedule
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Employee and Shift Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Employee
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Choose Employee</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.employee_id}>
                  {emp.fullname} ({emp.employee_id}) - {emp.department || "No Dept"} - {emp.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Template
            </label>
            <select
              value={formData.shift_name}
              onChange={(e) => handleShiftChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select Shift Template</option>
              {shiftTemplates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name} ({template.start} - {template.end})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display Selected Shift Times */}
        {formData.shift_name && formData.start_time && formData.end_time && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Selected Shift:</strong> {formData.shift_name}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Time:</strong> {formData.start_time} - {formData.end_time}
            </p>
          </div>
        )}

        {/* Days Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Working Days
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.days.includes(day)
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E3A8A] text-white rounded-md hover:bg-blue-900 px-4 py-2 font-medium"
        >
          Assign Schedule
        </button>
      </form>

      {/* View Assigned Schedules Button */}
      <div className="mt-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 px-4 py-3 font-medium"
        >
          <MdVisibility size={20} />
          View Assigned Schedules by Zone
        </button>
      </div>

      {/* Modal for Viewing Schedules */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#1E3A8A]">Assigned Schedules</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Department Filter */}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {filteredSchedules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {selectedDepartment
                    ? `No schedules found for ${selectedDepartment}`
                    : "No schedules assigned yet."}
                </p>
              ) : (
                <div className="space-y-3">
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
                    const employee = employees.find(e => e.employee_id === employeeId);
                    const isSupervisor = employee?.position === "Supervisor";
                    const isTeamLeader = employee?.position === "Team Leader";
                    
                    // Collect all shifts for this employee
                    const allShifts = [];
                    employeeSchedules.forEach(schedule => {
                      if (schedule.shifts && Array.isArray(schedule.shifts)) {
                        schedule.shifts.forEach(shift => {
                          allShifts.push({
                            ...shift,
                            scheduleId: schedule.id,
                            created_by: schedule.created_by
                          });
                        });
                      } else {
                        allShifts.push({
                          shift_name: schedule.shift_name,
                          start_time: schedule.start_time,
                          end_time: schedule.end_time,
                          days: schedule.days,
                          scheduleId: schedule.id,
                          created_by: schedule.created_by
                        });
                      }
                    });
                    
                    return (
                      <div
                        key={employeeId}
                        className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <p className="font-semibold text-gray-800">
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
                            
                            {/* Display all shifts */}
                            <div className="space-y-2 ml-3">
                              {allShifts.map((shift, idx) => (
                                <div key={idx} className="border-l-2 border-blue-300 pl-3">
                                  <p className="text-sm font-medium text-gray-700">
                                    {shift.shift_name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    ⏰ {shift.start_time} - {shift.end_time}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    📅 {shift.days.join(", ")}
                                  </p>
                                  {shift.created_by && (
                                    <p className="text-xs text-purple-600 mt-1">
                                      Assigned by: {getCreatorName(shift.created_by)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              handleDelete(employeeSchedules[0].id);
                            }}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Delete All Schedules for this Employee"
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 px-4 py-2 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
