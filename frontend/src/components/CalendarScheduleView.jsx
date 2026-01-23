import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { 
  MdAdd, MdEdit, MdDelete, MdClose, MdCalendarToday,
  MdInfo, MdCheck, MdPeople, MdPersonAdd
} from "react-icons/md";
import { toast } from 'react-toastify';

// API Imports
import { 
  getTemplates, deleteTemplate, updateTemplate, createTemplate, assignEmployees
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate 
} from "../api/ShiftTemplateApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { confirmAction } from "../utils/confirmToast.jsx";

// ==========================================
// Helper Functions
// ==========================================

const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

const convertTo24Hour = (time12h) => {
  if (!time12h) return "00:00";
  
  // If already in 24-hour format (HH:MM)
  if (/^\d{2}:\d{2}$/.test(time12h)) {
    return time12h;
  }
  
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const getShiftColor = (shiftName) => {
  const colors = {
    'Opening': '#22c55e',
    'Closing': '#3b82f6', 
    'Graveyard': '#8b5cf6',
    'Morning': '#f59e0b',
    'Afternoon': '#ef4444',
    'Evening': '#6366f1',
    'Night': '#7c3aed',
  };
  
  for (const [key, color] of Object.entries(colors)) {
    if (shiftName.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  
  return '#6b7280'; // Default gray
};

// ==========================================
// Schedule Modal Component
// ==========================================

function ScheduleModal({ selectedDate, onClose, onSave, departments, shiftTemplates, existingSchedules, onEditSchedule, onDeleteSchedule }) {
  const [formData, setFormData] = useState({
    departments: [],
    shift_name: "",
    start_time: "",
    end_time: "",
    member_limit: 1
  });
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedScheduleForAssign, setSelectedScheduleForAssign] = useState(null);

  // Fetch employees when modal opens
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeesData = await fetchEmployees();
        setEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    loadEmployees();
  }, []);

  const dateStr = selectedDate ? formatDateForAPI(selectedDate) : "";
  const dayName = selectedDate ? getDayName(selectedDate) : "";
  
  // Get existing schedules for this specific date
  const daySchedules = existingSchedules.filter(schedule => 
    schedule.specific_date === dateStr
  );
  
  // Filter out departments already scheduled for this date
  const scheduledDepts = daySchedules.map(schedule => schedule.department);
  const availableDepartments = departments.filter(dept => 
    !scheduledDepts.includes(dept.name)
  );

  const handleShiftTemplateChange = (shiftName) => {
    const selected = shiftTemplates.find(s => s.name === shiftName);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        shift_name: selected.name,
        start_time: selected.start_time.substring(0, 5),
        end_time: selected.end_time.substring(0, 5)
      }));
    }
  };

  const handleDepartmentToggle = (deptName) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(deptName)
        ? prev.departments.filter(d => d !== deptName)
        : [...prev.departments, deptName]
    }));
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      setLoading(true);
      const updatePayload = {
        shift_name: editingSchedule.shift_name,
        start_time: editingSchedule.start_time,
        end_time: editingSchedule.end_time,
        member_limit: editingSchedule.member_limit,
        edited_by: "admin"
      };

      await updateTemplate(editingSchedule.id, updatePayload);
      toast.success("Schedule updated!");
      setEditingSchedule(null);
      onSave();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployees = (schedule) => {
    setSelectedScheduleForAssign(schedule);
    setShowAssignModal(true);
  };

  const handleDeleteSchedule = async (scheduleId, department) => {
    confirmAction(`Delete ${department} schedule for ${dateStr}?`, async () => {
      try {
        await onDeleteSchedule(scheduleId, dayName, department);
        onSave();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.departments.length || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please fill all fields!");
      return;
    }

    setLoading(true);
    
    try {
      const results = [];
      
      for (const department of formData.departments) {
        try {
          const templateData = {
            shift_name: formData.shift_name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            department: department,
            specific_date: dateStr, // Use specific date instead of days array
            member_limit: formData.member_limit,
            created_by: "admin"
          };
          
          const result = await createTemplate(templateData);
          results.push({ success: true, department, result });
        } catch (error) {
          console.error(`Error creating schedule for ${department}:`, error);
          results.push({ success: false, department, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} schedule(s) for ${dateStr}`);
        onSave();
      }
      if (failCount > 0) {
        toast.error(`Failed to create ${failCount} schedule(s)`);
      }
      
      onClose();
    } catch (error) {
      console.error("Error creating schedules:", error);
      toast.error("Failed to create schedules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-blue-600">
              Manage Schedule for {dateStr}
            </h2>
            <p className="text-sm text-gray-600">{dayName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <MdClose />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Create New Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Create New Schedule</h3>
            
            {editingSchedule ? (
              /* Edit Schedule Form */
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <MdEdit size={18} />
                  Editing: {editingSchedule.department}
                </h4>
                
                <div className="space-y-3">
                  {/* Shift Template for Edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Template</label>
                    <select
                      value={editingSchedule.shift_name}
                      onChange={(e) => {
                        const selected = shiftTemplates.find(s => s.name === e.target.value);
                        if (selected) {
                          setEditingSchedule(prev => ({
                            ...prev,
                            shift_name: selected.name,
                            start_time: selected.start_time.substring(0, 5),
                            end_time: selected.end_time.substring(0, 5)
                          }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {shiftTemplates.map((template) => (
                        <option key={template.id} value={template.name}>
                          {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time and Member Limit for Edit */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={editingSchedule.start_time}
                        onChange={e => setEditingSchedule(prev => ({...prev, start_time: e.target.value}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={editingSchedule.end_time}
                        onChange={e => setEditingSchedule(prev => ({...prev, end_time: e.target.value}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Member Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={editingSchedule.member_limit || 1}
                        onChange={e => setEditingSchedule(prev => ({
                          ...prev,
                          member_limit: parseInt(e.target.value)
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Edit Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <MdCheck size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-400 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create New Schedule Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Departments
                  </label>
                  {availableDepartments.length === 0 ? (
                    <div className="text-orange-600 text-sm p-3 bg-orange-50 border border-orange-200 rounded">
                      All departments are already scheduled for this day.
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto space-y-2">
                      {availableDepartments.map(dept => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.departments.includes(dept.name)}
                            onChange={() => handleDepartmentToggle(dept.name)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shift Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Template
                  </label>
                  <select
                    value={formData.shift_name}
                    onChange={(e) => handleShiftTemplateChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Shift Template</option>
                    {shiftTemplates.map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time and Member Limit */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={e => setFormData({...formData, start_time: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData({...formData, end_time: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Member Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.member_limit}
                      onChange={e => setFormData({...formData, member_limit: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Create Action Button */}
                <button
                  type="submit"
                  disabled={loading || !formData.departments.length || availableDepartments.length === 0}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <MdAdd size={18} />
                      Create {formData.departments.length || ''} Schedule(s)
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Side - Scheduled Zones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Scheduled Zones for {dayName}</h3>
            
            {daySchedules.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <MdCalendarToday size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">No zones scheduled</p>
                <p className="text-gray-400 text-sm">Create schedules using the form on the left</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {daySchedules.map((schedule, index) => {
                  const limit = schedule.member_limit ?? 1;
                  
                  // Parse assigned employees
                  let assignedEmployees = [];
                  if (schedule.assigned_employees) {
                    try {
                      assignedEmployees = typeof schedule.assigned_employees === 'string' 
                        ? JSON.parse(schedule.assigned_employees) 
                        : schedule.assigned_employees;
                    } catch (e) {
                      assignedEmployees = [];
                    }
                  }
                  
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getShiftColor(schedule.shift_name) }}
                            ></div>
                            {schedule.department}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {schedule.shift_name}
                          </p>
                          <p className="text-sm text-green-700 font-medium">
                            {schedule.start_time} - {schedule.end_time}
                          </p>
                          <p className="text-xs text-gray-500">
                            Assigned: {assignedEmployees.length}/{limit}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleAssignEmployees(schedule)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Assign Employees"
                          >
                            <MdPersonAdd size={16} />
                          </button>
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Edit Schedule"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id, schedule.department)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete Schedule"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Show assigned employees */}
                      {assignedEmployees.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-600 mb-2">Assigned Employees:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedEmployees.map((assignment, idx) => {
                              const employee = employees.find(emp => emp.employee_id === assignment.employee_id);
                              const employeeName = employee ? 
                                (employee.firstname && employee.lastname ? 
                                  `${employee.firstname} ${employee.lastname}` : 
                                  employee.fullname || assignment.employee_id) : 
                                assignment.employee_id;
                              
                              return (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {employeeName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Employee Assignment Modal */}
      {showAssignModal && selectedScheduleForAssign && (
        <EmployeeAssignmentModal
          schedule={selectedScheduleForAssign}
          employees={employees}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedScheduleForAssign(null);
          }}
          onSave={() => {
            setShowAssignModal(false);
            setSelectedScheduleForAssign(null);
            onSave();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Employee Assignment Modal Component
// ==========================================

function EmployeeAssignmentModal({ schedule, employees, onClose, onSave }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get currently assigned employees
  useEffect(() => {
    if (schedule.assigned_employees) {
      try {
        const assignedEmployees = typeof schedule.assigned_employees === 'string' 
          ? JSON.parse(schedule.assigned_employees) 
          : schedule.assigned_employees;
        setSelectedEmployees(assignedEmployees.map(emp => emp.employee_id));
      } catch (e) {
        setSelectedEmployees([]);
      }
    }
  }, [schedule]);

  // Filter employees by department and position (only show regular employees)
  const departmentEmployees = employees.filter(emp => {
    // Only include employees from the same department or Company-wide
    const isDepartmentMatch = emp.department === schedule.department || emp.department === "Company-wide";
    
    // Only include regular employees (exclude supervisors, warehouse admins, team leaders)
    const isRegularEmployee = emp.position && 
      !emp.position.toLowerCase().includes('supervisor') &&
      !emp.position.toLowerCase().includes('admin') &&
      !emp.position.toLowerCase().includes('team leader') &&
      !emp.position.toLowerCase().includes('teamleader') &&
      !emp.position.toLowerCase().includes('team-leader') &&
      !emp.position.toLowerCase().includes('manager');
    
    console.log(`🔍 Employee filter - ${emp.employee_id} (${emp.position}):`, {
      department: emp.department,
      isDepartmentMatch,
      isRegularEmployee,
      included: isDepartmentMatch && isRegularEmployee
    });
    
    return isDepartmentMatch && isRegularEmployee;
  });

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await assignEmployees({
        template_id: schedule.id,
        employee_ids: selectedEmployees,
        assigned_by: 'admin'
      });

      toast.success('Employees assigned successfully!');
      onSave();
    } catch (error) {
      console.error('Error assigning employees:', error);
      toast.error('Failed to assign employees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <MdPeople size={20} />
              Assign Employees to {schedule.department}
            </h3>
            <p className="text-sm text-gray-600">
              {schedule.shift_name} • {schedule.start_time} - {schedule.end_time}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            <MdClose />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Select employees to assign to this schedule (Limit: {schedule.member_limit || 'Unlimited'}):
          </p>
          
          {departmentEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MdPeople size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No employees found in {schedule.department}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {departmentEmployees.map(employee => {
                const employeeName = employee.firstname && employee.lastname 
                  ? `${employee.firstname} ${employee.lastname}`
                  : employee.fullname || employee.employee_id;
                
                const isSelected = selectedEmployees.includes(employee.employee_id);
                const isTeamLeader = employee.position === "Team Leader";
                const isSupervisor = employee.position === "Supervisor";
                
                return (
                  <label key={employee.employee_id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEmployeeToggle(employee.employee_id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{employeeName}</span>
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
                      <div className="text-sm text-gray-600">
                        ID: {employee.employee_id} | Position: {employee.position || 'Employee'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedEmployees.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <MdCheck size={16} />
                Assign {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Component: CalendarScheduleView
// ==========================================

export default function CalendarScheduleView() {
  // State
  const [templates, setTemplates] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchTemplatesData();
    fetchDepartmentsData();
    fetchShiftTemplatesData();
  }, []);

  // Generate calendar events from templates
  useEffect(() => {
    generateCalendarEvents();
  }, [templates]);

  // Data Fetchers
  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchShiftTemplatesData = async () => {
    try {
      const data = await getShiftTemplates();
      setShiftTemplates(data);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      toast.error("Failed to load shift templates");
    }
  };

  const generateCalendarEvents = useCallback(() => {
    const events = [];

    // Generate events from templates with specific dates
    templates.forEach(template => {
      if (!template.specific_date) return; // Skip templates without specific dates

      const startTime = convertTo24Hour(template.start_time);
      const endTime = convertTo24Hour(template.end_time);
      
      // Determine event styling
      let backgroundColor = getShiftColor(template.shift_name);
      let borderColor = backgroundColor;
      let textColor = "white";
      let title = `${template.department} - ${template.shift_name}`;

      events.push({
        id: `${template.id}-${template.specific_date}`,
        title: title,
        start: `${template.specific_date}T${startTime}`,
        end: `${template.specific_date}T${endTime}`,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: textColor,
        extendedProps: {
          templateId: template.id,
          department: template.department,
          shiftName: template.shift_name,
          startTime: template.start_time,
          endTime: template.end_time,
          memberLimit: template.member_limit,
          specificDate: template.specific_date,
          date: template.specific_date
        }
      });
    });

    setCalendarEvents(events);
  }, [templates]);

  // Event Handlers
  const handleDateClick = (info) => {
    const clickedDate = new Date(info.date);
    setSelectedDate(clickedDate);
    setShowScheduleModal(true);
  };

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    
    const message = `
      Department: ${props.department}
      Shift: ${props.shiftName}
      Time: ${props.startTime} - ${props.endTime}
      Members: ${props.memberLimit}
      Date: ${props.date}
    `;
    
    // Show event details
    toast.info(message, { autoClose: 5000 });
  };

  const handleDeleteEvent = async (templateId, specificDate, department) => {
    confirmAction(`Remove ${department} schedule?`, async () => {
      try {
        // Since we're using specific dates, we can just delete the entire template
        await deleteTemplate(templateId);
        
        toast.success(`${department} schedule removed`);
        fetchTemplatesData();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    });
  };

  const handleEditSchedule = (schedule, day) => {
    // This will be handled within the modal
    console.log("Edit schedule:", schedule, day);
  };
  const handleShiftTemplateSubmit = async () => {
    if (!shiftTemplateForm.name || !shiftTemplateForm.start || !shiftTemplateForm.end) {
      toast.warning("Fill all fields");
      return;
    }

    const payload = {
      name: shiftTemplateForm.name,
      start_time: shiftTemplateForm.start + ":00",
      end_time: shiftTemplateForm.end + ":00",
      created_by: "admin"
    };

    try {
      if (editingShiftIndex !== null) {
        await updateShiftTemplate(shiftTemplates[editingShiftIndex].id, payload);
        toast.success("Shift template updated!");
      } else {
        await createShiftTemplate(payload);
        toast.success("Shift template created!");
      }
      
      await fetchShiftTemplatesData();
      setShiftTemplateForm({ name: "", start: "", end: "" });
      setEditingShiftIndex(null);
      setShowShiftTemplateModal(false);
    } catch (error) {
      console.error("Error saving shift template:", error);
      toast.error("Failed to save shift template");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MdCalendarToday size={28} className="text-blue-600" />
              Calendar-Based Zone Scheduling
            </h2>
            <p className="text-gray-600 mt-1">Click on any date to create schedules. Drag and manage shifts visually.</p>
          </div>
          
          {/* Guidelines Icon */}
          <div className="relative group">
            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
              <MdInfo size={24} />
            </button>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="space-y-1">
                <div>• Click any date to create schedules</div>
                <div>• Click events to view details</div>
                <div>• Use modal to manage zones</div>
                <div>• Edit/delete from scheduled zones panel</div>
              </div>
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setShiftTemplateForm({name:"",start:"",end:""});
            setEditingShiftIndex(null);
            setShowShiftTemplateModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <MdAdd size={20} />
          <span className="hidden sm:inline">Manage Shift Templates</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDisplay="block"
          displayEventTime={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          height="auto"
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer';
          }}
        />
      </div>

      {/* Modals */}
      {showScheduleModal && selectedDate && (
        <ScheduleModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedDate(null);
          }}
          onSave={fetchTemplatesData}
          departments={departments}
          shiftTemplates={shiftTemplates}
          existingSchedules={templates}
          onEditSchedule={handleEditSchedule}
          onDeleteSchedule={handleDeleteEvent}
        />
      )}

      {/* Shift Template Modal */}
      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MdAdd size={20} />
              {editingShiftIndex !== null ? "Edit" : "Manage"} Shift Templates
            </h3>
            
            <div className="space-y-3 mb-4">
              <input
                placeholder="Shift Name (e.g., Morning Shift)"
                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={shiftTemplateForm.name}
                onChange={e => setShiftTemplateForm({...shiftTemplateForm, name: e.target.value})}
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={shiftTemplateForm.start}
                  onChange={e => setShiftTemplateForm({...shiftTemplateForm, start: e.target.value})}
                />
                <input
                  type="time"
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={shiftTemplateForm.end}
                  onChange={e => setShiftTemplateForm({...shiftTemplateForm, end: e.target.value})}
                />
              </div>
              <button
                onClick={handleShiftTemplateSubmit}
                className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 font-medium transition-colors"
              >
                {editingShiftIndex !== null ? "Update" : "Create"} Shift Template
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 border-t pt-4">
              <h4 className="font-semibold text-gray-700 mb-2">Existing Templates</h4>
              {shiftTemplates.map((template, i) => (
                <div key={i} className="flex justify-between items-center border p-2 rounded-md bg-gray-50">
                  <span className="text-sm">
                    {template.name} ({template.start_time?.substring(0, 5)} - {template.end_time?.substring(0, 5)})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShiftTemplateForm({
                          name: template.name,
                          start: template.start_time?.substring(0, 5) || "",
                          end: template.end_time?.substring(0, 5) || ""
                        });
                        setEditingShiftIndex(i);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <MdEdit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        confirmAction("Delete shift template?", async () => {
                          try {
                            await deleteShiftTemplate(template.id);
                            await fetchShiftTemplatesData();
                            toast.success("Shift template deleted!");
                          } catch (error) {
                            console.error("Error deleting template:", error);
                            toast.error("Failed to delete template");
                          }
                        });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {shiftTemplates.length === 0 && (
                <p className="text-gray-500 text-center py-4">No shift templates created yet</p>
              )}
            </div>
            
            <button
              onClick={() => setShowShiftTemplateModal(false)}
              className="w-full mt-4 bg-gray-300 text-gray-700 p-2 rounded-md hover:bg-gray-400 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}