import { useState, useEffect } from "react";
import { MdSchedule, MdPeople, MdDelete } from "react-icons/md";
import { getDepartmentTemplates, createSchedule, getAllSchedules, deleteSchedule } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";

export default function TeamSchedule() {
  const [templates, setTemplates] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedSchedules, setAssignedSchedules] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    if (userDepartment) {
      fetchTemplates();
      fetchTeamMembers();
      fetchAssignedSchedules();
    }
  }, [userDepartment]);

  const fetchTemplates = async () => {
    try {
      const data = await getDepartmentTemplates(userDepartment);
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const allEmployees = await fetchEmployees();
      // Filter employees from the same department
      const teamMembers = allEmployees.filter(
        (emp) => emp.department === userDepartment && emp.employee_id !== user.employee?.employee_id
      );
      setTeamMembers(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchAssignedSchedules = async () => {
    try {
      const allSchedules = await getAllSchedules();
      const allEmployees = await fetchEmployees();
      
      // Filter schedules for team members in the same department
      // Exclude the team leader's own schedule
      const teamSchedules = allSchedules.filter(
        (schedule) => {
          // Skip if this is the team leader's own schedule
          if (schedule.employee_id === user.employee?.employee_id) {
            return false;
          }
          
          const employee = allEmployees.find(emp => emp.employee_id === schedule.employee_id);
          return employee && employee.department === userDepartment;
        }
      );
      setAssignedSchedules(teamSchedules);
    } catch (error) {
      console.error("Error fetching assigned schedules:", error);
    }
  };

  const hasScheduleConflict = (employeeId) => {
    if (!selectedTemplate) return false;
    
    // Check if employee already has a schedule with overlapping days
    const employeeSchedules = assignedSchedules.filter(
      (schedule) => schedule.employee_id === employeeId
    );
    
    return employeeSchedules.some((schedule) => {
      // Check if any day overlaps
      return schedule.days.some((day) => selectedTemplate.days.includes(day));
    });
  };

  const handleEmployeeToggle = (employeeId) => {
    // Check for conflicts before allowing selection
    if (!selectedEmployees.includes(employeeId) && hasScheduleConflict(employeeId)) {
      const conflictDays = getConflictDays(employeeId);
      alert(`Cannot assign: ${getEmployeeName(employeeId)} already has a schedule on ${conflictDays.join(", ")}`);
      return;
    }
    
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const getConflictDays = (employeeId) => {
    if (!selectedTemplate) return [];
    
    const employeeSchedules = assignedSchedules.filter(
      (schedule) => schedule.employee_id === employeeId
    );
    
    const conflictDays = [];
    employeeSchedules.forEach((schedule) => {
      schedule.days.forEach((day) => {
        if (selectedTemplate.days.includes(day) && !conflictDays.includes(day)) {
          conflictDays.push(day);
        }
      });
    });
    
    return conflictDays;
  };

  const handleAssignSchedule = async () => {
    if (!selectedTemplate) {
      return alert("Please select a schedule template!");
    }
    if (selectedEmployees.length === 0) {
      return alert("Please select at least one team member!");
    }

    try {
      // Create schedule for each selected employee
      for (const employeeId of selectedEmployees) {
        try {
          await createSchedule({
            employee_id: employeeId,
            shift_name: selectedTemplate.shift_name,
            start_time: selectedTemplate.start_time,
            end_time: selectedTemplate.end_time,
            days: selectedTemplate.days,
            department: userDepartment,
            is_template: false,
            created_by: user.employee?.employee_id || "teamleader"
          });
        } catch (err) {
          // Show specific error message from backend
          const errorMsg = err.response?.data?.message || "Failed to assign schedule";
          alert(`Error assigning to ${getEmployeeName(employeeId)}: ${errorMsg}`);
          throw err; // Stop the loop
        }
      }
      
      alert(`Schedule assigned to ${selectedEmployees.length} team member(s) successfully!`);
      setSelectedTemplate(null);
      setSelectedEmployees([]);
      fetchAssignedSchedules();
    } catch (error) {
      console.error("Error assigning schedule:", error);
      // Error already shown in the loop
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to remove this schedule?")) return;
    
    try {
      await deleteSchedule(id);
      alert("Schedule removed successfully!");
      fetchAssignedSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to remove schedule");
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = teamMembers.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.fullname : employeeId;
  };

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">Team Schedule Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Assign schedule templates to your team members in {userDepartment}
        </p>
      </div>

      {/* Available Templates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
          <MdSchedule /> Available Schedule Templates
        </h2>
        
        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No schedule templates available for your department. Contact admin to create templates.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? "border-[#1E3A8A] bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <h3 className="font-semibold text-gray-800 mb-2">{template.shift_name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  ⏰ {template.start_time} - {template.end_time}
                </p>
                <p className="text-xs text-gray-500">
                  {template.day_limits ? (
                    <>📅 {Object.entries(template.day_limits).map(([day, limit]) => `${day}(${limit})`).join(", ")}</>
                  ) : (
                    <>📅 {template.days.join(", ")}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign to Team Members */}
      {selectedTemplate && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
            <MdPeople /> Select Team Members
          </h2>
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Selected Template:</strong> {selectedTemplate.shift_name} ({selectedTemplate.start_time} - {selectedTemplate.end_time})
            </p>
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-gray-500 text-sm">No team members found in your department.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {teamMembers.map((member) => {
                  const hasConflict = hasScheduleConflict(member.employee_id);
                  const conflictDays = hasConflict ? getConflictDays(member.employee_id) : [];
                  
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleEmployeeToggle(member.employee_id)}
                      className={`border-2 rounded-lg p-3 transition-all ${
                        hasConflict
                          ? "border-red-300 bg-red-50 cursor-not-allowed opacity-60"
                          : selectedEmployees.includes(member.employee_id)
                          ? "border-green-500 bg-green-50 cursor-pointer"
                          : "border-gray-200 hover:border-gray-400 cursor-pointer"
                      }`}
                    >
                      <p className="font-medium text-gray-800">{member.fullname}</p>
                      <p className="text-sm text-gray-600">{member.employee_id}</p>
                      <p className="text-xs text-gray-500">{member.position}</p>
                      {hasConflict && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          ⚠️ Conflict: {conflictDays.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleAssignSchedule}
                disabled={selectedEmployees.length === 0}
                className={`w-full py-3 rounded-md font-medium transition-colors ${
                  selectedEmployees.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1E3A8A] text-white hover:bg-blue-900"
                }`}
              >
                Assign Schedule to {selectedEmployees.length} Member(s)
              </button>
            </>
          )}
        </div>
      )}

      {/* Assigned Schedules */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
          <MdSchedule /> Assigned Team Schedules
        </h2>
        
        {assignedSchedules.length === 0 ? (
          <p className="text-gray-500 text-sm">No schedules assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex justify-between items-center border border-gray-200 rounded-md p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {getEmployeeName(schedule.employee_id)} - {schedule.shift_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ⏰ {schedule.start_time} - {schedule.end_time}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    📅 {schedule.days.join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Remove Schedule"
                >
                  <MdDelete size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
