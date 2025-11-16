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

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Generate time options (12-hour format)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 1; hour <= 12; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        times.push(`${hour}:${min} AM`);
      }
    }
    for (let hour = 1; hour <= 12; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        times.push(`${hour}:${min} PM`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

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
      await createSchedule(formData);
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
      alert("Failed to assign schedule");
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

  const filteredSchedules = selectedDepartment
    ? schedules.filter((schedule) => getEmployeeDepartment(schedule.employee_id) === selectedDepartment)
    : schedules;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
        <MdEditCalendar /> Assign Schedule
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Employee Selection */}
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
              {employees.map((emp) => (
                <option key={emp.id} value={emp.employee_id}>
                  {emp.fullname} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Name
            </label>
            <select
              value={formData.shift_name}
              onChange={(e) => setFormData({ ...formData, shift_name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select Shift</option>
              <option value="Opening Shift">Opening Shift</option>
              <option value="Closing Shift">Closing Shift</option>
              <option value="Graveyard Shift">Graveyard Shift</option>
            </select>
          </div>
        </div>

        {/* Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <select
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select Start Time</option>
              {timeOptions.map((time) => (
                <option key={`start-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <select
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select End Time</option>
              {timeOptions.map((time) => (
                <option key={`end-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                  {filteredSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex justify-between items-center border border-gray-200 rounded-md p-4 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-800">
                            {getEmployeeName(schedule.employee_id)}
                          </p>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {getEmployeeDepartment(schedule.employee_id)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {schedule.shift_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          ⏰ {schedule.start_time} - {schedule.end_time}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {schedule.days.join(", ")}
                        </p>
                        {schedule.created_by && (
                          <p className="text-xs text-purple-600 mt-1">
                            👤 Assigned by: {getCreatorName(schedule.created_by)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          handleDelete(schedule.id);
                        }}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete Schedule"
                      >
                        <MdDelete size={20} />
                      </button>
                    </div>
                  ))}
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
