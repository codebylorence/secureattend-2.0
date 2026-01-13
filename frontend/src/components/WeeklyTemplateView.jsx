import { useState, useEffect } from "react";
import { MdEdit, MdDelete, MdSave, MdContentCopy, MdClose, MdCheck, MdPlayArrow, MdAdd, MdLightbulb, MdLock, MdLockOpen, MdSupervisorAccount, MdPerson } from "react-icons/md";
import { getTemplates, deleteTemplate, updateTemplate, createTemplate, publishSchedules, assignSchedule, getEmployeeSchedules, deleteEmployeeSchedule } from "../api/ScheduleApi";
import { getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate } from "../api/ShiftTemplateApi";
import { fetchDepartments } from "../api/DepartmentApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { toast } from 'react-toastify';
import { confirmAction } from "../utils/confirmToast.jsx";

// Day Schedule Modal Component
function DayScheduleModal({ day, schedules, departments, shiftTemplates, onClose, onAddDepartment, onEdit, onDelete, onDeleteFromDay }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSchedules, setLocalSchedules] = useState(schedules); // Local state for real-time updates
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorSchedules, setSupervisorSchedules] = useState([]);
  const [formData, setFormData] = useState({
    departments: [], // Changed to array for multiple selection
    shift_name: "",
    start_time: "",
    end_time: "",
    member_limit: 1
  });

  // Update local schedules when prop changes
  useEffect(() => {
    setLocalSchedules(schedules);
  }, [schedules]);

  // Fetch supervisors and their schedules
  useEffect(() => {
    fetchSupervisors();
    fetchSupervisorSchedules();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const allEmployees = await fetchEmployees();
      const supervisorList = allEmployees.filter(emp => 
        emp.role === 'supervisor' || emp.role === 'team_leader'
      );
      setSupervisors(supervisorList);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  };

  const fetchSupervisorSchedules = async () => {
    try {
      const allSchedules = await getEmployeeSchedules();
      const allEmployees = await fetchEmployees();
      
      // Filter schedules for supervisors only
      const supervisorScheduleList = allSchedules.filter(schedule => {
        const employee = allEmployees.find(emp => emp.employee_id === schedule.employee_id);
        return employee && (employee.role === 'supervisor' || employee.role === 'team_leader');
      });

      setSupervisorSchedules(supervisorScheduleList);
    } catch (error) {
      console.error("Error fetching supervisor schedules:", error);
    }
  };

  const assignSupervisorToShift = async (shiftName, startTime, endTime, supervisorId) => {
    try {
      // Create a template for the supervisor
      const templateData = {
        shift_name: shiftName,
        start_time: startTime,
        end_time: endTime,
        days: [day],
        department: "Supervisor",
        member_limit: 1,
        publish_status: "published"
      };

      const template = await createTemplate(templateData);
      
      if (template) {
        await assignSchedule({
          employee_id: supervisorId,
          template_id: template.id,
          days: [day],
          assigned_by: "admin"
        });

        await fetchSupervisorSchedules();
        toast.success("Supervisor assigned to shift!");
      }
    } catch (error) {
      console.error("Error assigning supervisor:", error);
      toast.error("Failed to assign supervisor");
    }
  };

  const removeSupervisorFromShift = async (scheduleId, supervisorName) => {
    try {
      await deleteEmployeeSchedule(scheduleId);
      await fetchSupervisorSchedules();
      toast.success(`${supervisorName} removed from shift!`);
    } catch (error) {
      console.error("Error removing supervisor:", error);
      toast.error("Failed to remove supervisor");
    }
  };

  const getSupervisorForShift = (shiftName, startTime, endTime) => {
    const supervisorSchedule = supervisorSchedules.find(schedule => 
      schedule.template.shift_name === shiftName &&
      schedule.template.start_time === startTime &&
      schedule.template.end_time === endTime &&
      schedule.days.includes(day)
    );

    if (supervisorSchedule) {
      const supervisor = supervisors.find(s => s.employee_id === supervisorSchedule.employee_id);
      return {
        schedule: supervisorSchedule,
        supervisor: supervisor
      };
    }
    return null;
  };

  const getAvailableSupervisors = (shiftName, startTime, endTime) => {
    // Get supervisors already assigned to this day
    const assignedSupervisorIds = supervisorSchedules
      .filter(schedule => schedule.days.includes(day))
      .map(schedule => schedule.employee_id);

    // Return supervisors not assigned to any shift on this day
    return supervisors.filter(supervisor => 
      !assignedSupervisorIds.includes(supervisor.employee_id)
    );
  };

  // Helper function to parse time string to minutes since midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to get day of week name
  const getDayOfWeek = (date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  // Check if the shift has started or ended for today
  const isShiftTimePassedForToday = (startTime, endTime) => {
    // TEMPORARILY DISABLED FOR TESTING - Always return false to allow scheduling
    return false;
    
    // Original logic (commented out):
    // const now = new Date();
    // const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // const shiftStartMinutes = parseTimeToMinutes(startTime);
    // 
    // // Return true if shift has started (ongoing or ended)
    // return currentMinutes >= shiftStartMinutes;
  };

  const handleShiftTemplateChange = (shiftName) => {
    const selectedShift = shiftTemplates.find(s => s.name === shiftName);
    if (selectedShift) {
      setFormData({
        ...formData,
        shift_name: selectedShift.name,
        start_time: selectedShift.start,
        end_time: selectedShift.end
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.departments.length === 0 || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please select at least one department and fill all fields!");
      return;
    }

    // Check if trying to schedule for today and shift time has already started
    const today = new Date();
    const todayDayName = getDayOfWeek(today);
    
    if (day === todayDayName && isShiftTimePassedForToday(formData.start_time, formData.end_time)) {
      toast.error(
        `Cannot schedule ${formData.shift_name} (${formData.start_time} - ${formData.end_time}) for today. ` +
        `The shift has already started or is ongoing. Please schedule for another day.`
      );
      return;
    }

    // Add each selected department
    const results = [];
    const newSchedules = [];
    
    for (const department of formData.departments) {
      const result = await onAddDepartment({
        department,
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        member_limit: formData.member_limit
      });
      results.push(result);
      
      // If successful, add to local state immediately
      if (result.success && result.schedule) {
        newSchedules.push(result.schedule);
      }
    }
    
    // Update local schedules immediately
    if (newSchedules.length > 0) {
      setLocalSchedules(prev => [...prev, ...newSchedules]);
    }
    
    // Show summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length > 0 && failed.length === 0) {
      toast.success(`Successfully added ${successful.length} zone(s)`);
    } else if (successful.length > 0 && failed.length > 0) {
      toast.warning(`Added ${successful.length} zone(s), but ${failed.length} failed`);
    } else if (failed.length > 0) {
      toast.error(`Failed to add ${failed.length} zone(s)`);
    }
    
    setFormData({
      departments: [],
      shift_name: "",
      start_time: "",
      end_time: "",
      member_limit: 1
    });
    setShowAddForm(false);
  };

  // Get available departments (not already scheduled on this day)
  // Filter out pending deletion schedules - they're being deleted
  const scheduledDepartments = localSchedules
    .filter(s => !s.pending_deletion)
    .map(s => s.department);
  
  // Available departments = not already scheduled
  const availableDepartments = departments.filter(d => !scheduledDepartments.includes(d.name));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-2xl font-semibold text-primary">{day} Schedule</h2>
            {(() => {
              const today = new Date();
              const todayDayName = getDayOfWeek(today);
              return day === todayDayName && (
                <span className="px-2 md:px-3 py-1 bg-primary-100 text-primary-800 text-xs md:text-sm font-medium rounded-full">
                  Today
                </span>
              );
            })()}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl"
          >
            ×
          </button>
        </div>

        {/* Current Schedules - Grouped by Shift */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Zones</h3>
          {localSchedules.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-md text-center">
              No zones scheduled for {day} yet. Click "Add Department" to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Group schedules by shift name */}
              {Object.entries(
                localSchedules.reduce((groups, schedule) => {
                  const shiftName = schedule.shift_name;
                  if (!groups[shiftName]) {
                    groups[shiftName] = [];
                  }
                  groups[shiftName].push(schedule);
                  return groups;
                }, {})
              ).map(([shiftName, shiftSchedules]) => (
                <div key={shiftName} className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Shift Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-lg">{shiftName}</h4>
                      <span className="text-sm opacity-90">
                        {shiftSchedules[0].start_time} - {shiftSchedules[0].end_time}
                      </span>
                    </div>
                  </div>

                  {/* Supervisor Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 p-3">
                    {(() => {
                      const supervisorInfo = getSupervisorForShift(shiftName, shiftSchedules[0].start_time, shiftSchedules[0].end_time);
                      const availableSupervisors = getAvailableSupervisors(shiftName, shiftSchedules[0].start_time, shiftSchedules[0].end_time);
                      
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MdSupervisorAccount size={20} className="text-purple-600" />
                            <span className="font-semibold text-purple-800">Supervisor:</span>
                            {supervisorInfo ? (
                              <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1 border border-purple-200">
                                <MdPerson size={16} className="text-purple-600" />
                                <span className="text-purple-900 font-semibold">
                                  {supervisorInfo.supervisor?.fullname || 
                                   `${supervisorInfo.supervisor?.firstname} ${supervisorInfo.supervisor?.lastname}` ||
                                   supervisorInfo.schedule.employee_id}
                                </span>
                                <button
                                  onClick={() => {
                                    confirmAction(
                                      `Remove ${supervisorInfo.supervisor?.fullname || supervisorInfo.schedule.employee_id} from this shift?`,
                                      () => removeSupervisorFromShift(
                                        supervisorInfo.schedule.id, 
                                        supervisorInfo.supervisor?.fullname || supervisorInfo.schedule.employee_id
                                      )
                                    );
                                  }}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded"
                                  title="Remove Supervisor"
                                >
                                  <MdDelete size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 italic bg-white px-2 py-1 rounded border border-gray-200">Not assigned</span>
                                {availableSupervisors.length > 0 && (
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        assignSupervisorToShift(
                                          shiftName, 
                                          shiftSchedules[0].start_time, 
                                          shiftSchedules[0].end_time, 
                                          e.target.value
                                        );
                                        e.target.value = ""; // Reset selection
                                      }
                                    }}
                                    className="text-sm border border-purple-300 rounded px-3 py-1 bg-white hover:border-purple-400 focus:border-purple-500 focus:outline-none"
                                  >
                                    <option value="">Assign Supervisor</option>
                                    {availableSupervisors.map(supervisor => (
                                      <option key={supervisor.employee_id} value={supervisor.employee_id}>
                                        {supervisor.fullname || `${supervisor.firstname} ${supervisor.lastname}`}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {availableSupervisors.length === 0 && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">(No available supervisors)</span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-purple-700 bg-purple-200 px-2 py-1 rounded font-medium">
                            Max: 1 Supervisor
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Zones in this shift */}
                  <div className="bg-primary-50 p-3 space-y-2">
                    {shiftSchedules.map((schedule, idx) => {
                      // Get limit with proper fallback (default to 1 if not set)
                      const dayLimit = schedule.day_limits?.[day];
                      const limit = dayLimit !== undefined && dayLimit !== null 
                        ? dayLimit 
                        : (schedule.member_limit !== undefined && schedule.member_limit !== null 
                            ? schedule.member_limit 
                            : 1); // Default to 1 if no limit is set
                      const isDeleted = schedule.pending_deletion === true;
                      const isDraft = schedule.publish_status === "Draft";
                      const isEdited = schedule.is_edited === true; // Use backend field
                      
                      return (
                        <div
                          key={idx}
                          className={`bg-white border rounded-md p-3 flex justify-between items-center hover:shadow-sm transition-shadow ${
                            isDeleted 
                              ? 'border-red-300 bg-red-50 opacity-75' 
                              : isEdited
                                ? 'border-yellow-300 bg-yellow-50'
                                : isDraft 
                                  ? 'border-orange-300 bg-orange-50' 
                                  : 'border-primary-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-2 h-2 rounded-full ${
                              isDeleted 
                                ? 'bg-red-600' 
                                : isEdited
                                  ? 'bg-yellow-600'
                                  : isDraft 
                                    ? 'bg-orange-600' 
                                    : 'bg-primary-600'
                            }`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-semibold ${
                                  isDeleted 
                                    ? 'text-red-900 line-through' 
                                    : isEdited
                                      ? 'text-yellow-900'
                                      : isDraft 
                                        ? 'text-orange-900' 
                                        : 'text-blue-900'
                                }`}>
                                  {schedule.department}
                                </p>
                                {isDeleted && (
                                  <span className="text-[10px] bg-red-200 text-red-800 px-1 py-0.5 rounded font-medium">
                                    DELETED
                                  </span>
                                )}
                                {isEdited && !isDeleted && (
                                  <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded font-medium">
                                    EDITED
                                  </span>
                                )}
                                {isDraft && !isDeleted && !isEdited && (
                                  <span className="text-[10px] bg-orange-200 text-orange-800 px-1 py-0.5 rounded font-medium">
                                    DRAFT
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm font-medium ${
                                isDeleted 
                                  ? 'text-gray-500 line-through' 
                                  : 'text-green-700'
                              }`}>
                                Max Members: {limit}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                onEdit(schedule, day);
                                onClose();
                              }}
                              className={`p-2 rounded ${
                                isDeleted 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-primary-600 hover:text-primary-800 hover:bg-primary-100'
                              }`}
                              title={isDeleted ? "Cannot edit deleted schedule" : "Edit"}
                              disabled={isDeleted}
                            >
                              <MdEdit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                // Remove from local state immediately
                                setLocalSchedules(prev => prev.filter(s => s.id !== schedule.id));
                                // Then call the actual delete function
                                onDeleteFromDay(schedule.id, day, schedule.department);
                              }}
                              className={`p-2 rounded ${
                                isDeleted 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              }`}
                              title={isDeleted ? "Already marked for deletion" : "Delete"}
                              disabled={isDeleted}
                            >
                              <MdDelete size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-600 mt-2 px-2">
                      <strong>{shiftSchedules.length}</strong> zone{shiftSchedules.length !== 1 ? 's' : ''} assigned to this shift
                      {(() => {
                        const supervisorInfo = getSupervisorForShift(shiftName, shiftSchedules[0].start_time, shiftSchedules[0].end_time);
                        return supervisorInfo ? (
                          <span className="ml-2 text-purple-600">+ 1 supervisor</span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Department Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-md hover:bg-green-700 font-semibold text-sm md:text-base"
          >
            <MdAdd size={18} className="md:w-5 md:h-5" /> Add Department to {day}
          </button>
        )}

        {/* Add Department Form */}
        {showAddForm && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Add New Department</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Departments/Zones (Multiple Selection)
                </label>
                {availableDepartments.length === 0 ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-center">
                    <p className="text-sm text-orange-600">
                      All departments are already scheduled for {day}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border border-gray-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {availableDepartments.map((dept) => (
                          <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.departments.includes(dept.name)}
                              onChange={() => handleDepartmentToggle(dept.name)}
                              className="w-4 h-4 text-primary-600"
                            />
                            <span className="text-sm flex-1">{dept.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {formData.departments.length > 0 && (
                      <p className="text-sm text-primary-600 mt-2">
                        Selected: {formData.departments.join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Template
                </label>
                <select
                  value={formData.shift_name}
                  onChange={(e) => handleShiftTemplateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select Shift Template</option>
                  {shiftTemplates.map((shift, index) => (
                    <option key={index} value={shift.name}>
                      {shift.name} ({shift.start} - {shift.end})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Members
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.member_limit}
                  onChange={(e) => setFormData({ ...formData, member_limit: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Warning if shift time has started for today */}
              {(() => {
                const today = new Date();
                const todayDayName = getDayOfWeek(today);
                const isToday = day === todayDayName;
                const shiftPassed = formData.start_time && formData.end_time && isShiftTimePassedForToday(formData.start_time, formData.end_time);
                
                return isToday && shiftPassed && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-md">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ Cannot schedule for today: The shift ({formData.start_time} - {formData.end_time}) has already started or is ongoing.
                    </p>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formData.departments.length === 0}
                  className="flex-1 bg-primary text-white rounded-md px-4 py-2 hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add {formData.departments.length > 0 ? `${formData.departments.length} Zone${formData.departments.length > 1 ? 's' : ''}` : 'Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      departments: [],
                      shift_name: "",
                      start_time: "",
                      end_time: "",
                      member_limit: 1
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeeklyTemplateView() {
  const [templates, setTemplates] = useState([]);
  const [weeklyView, setWeeklyView] = useState({});
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [viewingSavedTemplate, setViewingSavedTemplate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Helper function to parse time string to minutes since midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to get day of week name
  const getDayOfWeek = (date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  // Check if the shift has started or ended for today
  const isShiftTimePassedForToday = (startTime, endTime) => {
    // TEMPORARILY DISABLED FOR TESTING - Always return false to allow scheduling
    return false;
    
    // Original logic (commented out):
    // const now = new Date();
    // const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // const shiftStartMinutes = parseTimeToMinutes(startTime);
    // 
    // // Return true if shift has started (ongoing or ended)
    // return currentMinutes >= shiftStartMinutes;
  };

  useEffect(() => {
    fetchTemplatesData();
    loadSavedTemplates();
    fetchDepartmentsData();
    fetchShiftTemplatesData();
  }, []);

  useEffect(() => {
    organizeWeeklyView();
  }, [templates]);

  const fetchTemplatesData = async () => {
    try {
      console.log("📥 Fetching templates from API...");
      const data = await getTemplates();
      console.log(`📊 Received ${data.length} template(s) from API:`);
      data.forEach(t => {
        console.log(`  - ${t.department} | ${t.shift_name} | ${t.publish_status} | Days: ${t.days?.join(',') || 'none'}`);
      });
      setTemplates(data);
      console.log("✅ Templates state updated");
    } catch (error) {
      console.error("❌ Error fetching templates:", error);
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

  const fetchShiftTemplatesData = async () => {
    try {
      const data = await getShiftTemplates();
      // Convert backend format to frontend format
      const formattedTemplates = data.map(template => ({
        id: template.id,
        name: template.name,
        start: template.start_time.substring(0, 5), // Convert "08:00:00" to "08:00"
        end: template.end_time.substring(0, 5)
      }));
      setShiftTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      toast.error("Failed to load shift templates");
    }
  };

  const loadSavedTemplates = () => {
    const saved = localStorage.getItem("savedScheduleTemplates");
    if (saved) {
      setSavedTemplates(JSON.parse(saved));
    }
  };

  const organizeWeeklyView = () => {
    const organized = {};
    
    daysOfWeek.forEach(day => {
      organized[day] = [];
    });

    let skippedCount = 0;
    templates.forEach(template => {
      // Show ALL templates including those marked for deletion
      // We'll add visual indicators in the UI instead of hiding them
      
      template.days.forEach(day => {
        // Check if there's a draft version of this department on this day
        const hasDraftVersion = templates.some(t => 
          t.department === template.department &&
          t.days.includes(day) &&
          t.publish_status === "Draft" &&
          t.pending_deletion !== true &&
          t.id !== template.id
        );
        
        // If this is published and there's a draft version, hide it (show only the draft)
        if (template.publish_status === "Published" && hasDraftVersion) {
          console.log(`Hiding published ${template.id} for ${template.department} on ${day} (draft version exists)`);
          return;
        }
        
        organized[day].push({
          id: template.id,
          department: template.department,
          shift_name: template.shift_name,
          start_time: template.start_time,
          end_time: template.end_time,
          day_limits: template.day_limits,
          member_limit: template.member_limit,
          pending_deletion: template.pending_deletion,
          publish_status: template.publish_status,
          is_edited: template.is_edited,
          original_template_id: template.original_template_id,
          edited_at: template.edited_at,
          edited_by: template.edited_by
        });
      });
    });

    setWeeklyView(organized);
  };

  const handleDeleteTemplate = async (id) => {
    const template = templates.find(t => t.id === id);
    confirmAction(`Delete ${template?.department}?`, async () => {
      try {
        await deleteTemplate(id);
        toast.success("Deleted!");
        fetchTemplatesData();
      } catch (error) {
        console.error("Error deleting template:", error);
        toast.error("Delete failed");
      }
    });
  };

  const handleDeleteFromDay = async (scheduleId, day, department) => {
    confirmAction(`Remove ${department} from ${day}?`, async () => {
      try {
      const template = templates.find(t => t.id === scheduleId);
      
      if (!template) {
        toast.error("Template not found");
        return;
      }

      // Check if this template has multiple days
      if (template.days.length > 1) {
        // Remove only this day from the template
        const updatedDays = template.days.filter(d => d !== day);
        const updatedDayLimits = { ...template.day_limits };
        delete updatedDayLimits[day];

        await updateTemplate(scheduleId, {
          days: updatedDays,
          day_limits: updatedDayLimits
        });

        toast.success(`${department} removed from ${day}. Click "Publish Schedule" to apply changes.`);
      } else {
        // This is the only day, mark entire template for deletion
        await deleteTemplate(scheduleId);
        toast.success(`${department} marked for deletion. Click "Publish Schedule" to permanently delete.`);
      }
      
      await fetchTemplatesData();
    } catch (error) {
        console.error("Error removing schedule from day:", error);
        toast.error("Remove failed");
      }
    });
  };

  const handleDeleteFromDayInModal = async (scheduleId, day, department) => {
    confirmAction(`Remove ${department}?`, async () => {
      try {
      const template = templates.find(t => t.id === scheduleId);
      
      if (!template) {
        toast.error("Template not found");
        return;
      }

      // Remove from local state immediately
      setLocalSchedules(prev => prev.filter(s => s.id !== scheduleId));

      // Check if this template has multiple days
      if (template.days.length > 1) {
        // Remove only this day from the template
        const updatedDays = template.days.filter(d => d !== day);
        const updatedDayLimits = { ...template.day_limits };
        delete updatedDayLimits[day];

        await updateTemplate(scheduleId, {
          days: updatedDays,
          day_limits: updatedDayLimits
        });

        toast.success(`${department} removed from ${day}`);
      } else {
        // This is the only day, delete the entire template
        await deleteTemplate(scheduleId);
        toast.success(`${department} schedule deleted`);
      }
      
      fetchTemplatesData();
    } catch (error) {
        console.error("Error removing schedule from day:", error);
        toast.error("Remove failed");
        // Revert local state on error
        setLocalSchedules(schedules);
      }
    });
  };

  const handlePublishSchedules = async () => {
    confirmAction("Publish all schedules? Team leaders will be notified.", async () => {

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const publishedBy = user.employee?.employee_id || "admin";

      const result = await publishSchedules(publishedBy);

      if (result.count === 0) {
        toast.info("No changes to publish. All schedules are up to date.");
      } else {
        toast.success(`Schedule Changes Published! ${result.published} published, ${result.deleted} deleted`);
        // Team leaders have been notified
      }

      fetchTemplatesData(); // Refresh to show published status
    } catch (error) {
        console.error("Error publishing schedules:", error);
        toast.error("Publish failed");
      }
    });
  };

  const handleSaveAsReusable = () => {
    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      weeklySchedule: { ...weeklyView },
      createdAt: new Date().toISOString()
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem("savedScheduleTemplates", JSON.stringify(updated));
    toast.success(`Template "${templateName}" saved successfully!`);
  };

  const handleLoadTemplate = (savedTemplate) => {
    setViewingSavedTemplate(savedTemplate);
  };

  const handleApplyTemplate = async (savedTemplate) => {
    confirmAction(`Apply "${savedTemplate.name}"?`, async () => {

    try {
      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Iterate through each day in the saved template
      for (const [day, schedules] of Object.entries(savedTemplate.weeklySchedule)) {
        if (!schedules || schedules.length === 0) continue;

        // Create templates for each schedule on this day
        for (const schedule of schedules) {
          try {
            // Check if this exact template already exists
            const exists = templates.find(t => 
              t.department === schedule.department &&
              t.shift_name === schedule.shift_name &&
              t.days.includes(day)
            );

            if (exists) {
              skippedCount++;
              continue;
            }

            // Create the template
            await createTemplate({
              shift_name: schedule.shift_name,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              department: schedule.department,
              days: [day], // Apply to this specific day
              day_limits: schedule.day_limits || {},
              member_limit: schedule.member_limit,
              created_by: "admin"
            });

            createdCount++;
          } catch (error) {
            console.error(`Error creating template for ${schedule.department} on ${day}:`, error);
            errors.push(`${schedule.department} on ${day}`);
          }
        }
      }

      // Show results
      if (createdCount > 0 && errors.length === 0) {
        toast.success(`Template Applied! Created ${createdCount} schedule(s)${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}`);
      } else if (createdCount > 0 && errors.length > 0) {
        toast.warning(`Created ${createdCount} schedule(s), but ${errors.length} failed`);
      } else if (errors.length > 0) {
        toast.error(`Failed to create schedules: ${errors.join(", ")}`);
      }
      fetchTemplatesData();
      setViewingSavedTemplate(null);
    } catch (error) {
        console.error("Error applying template:", error);
        toast.error("Apply failed");
      }
    });
  };

  const handleEditSchedule = (schedule, day) => {
    // Get the current member limit for this specific day
    const dayLimit = schedule.day_limits?.[day];
    const currentLimit = dayLimit !== undefined && dayLimit !== null 
      ? dayLimit 
      : (schedule.member_limit !== undefined && schedule.member_limit !== null 
          ? schedule.member_limit 
          : 1);
    
    setEditingSchedule({
      ...schedule,
      day: day,
      originalId: schedule.id,
      member_limit: currentLimit // Set the current limit for this day
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    console.log("💾 Saving edit for schedule:", editingSchedule);

    // Check if trying to edit today's schedule and shift time has already started
    const today = new Date();
    const todayDayName = getDayOfWeek(today);
    
    if (editingSchedule.day === todayDayName && isShiftTimePassedForToday(editingSchedule.start_time, editingSchedule.end_time)) {
      toast.error(
        `Cannot edit ${editingSchedule.shift_name} (${editingSchedule.start_time} - ${editingSchedule.end_time}) for today. ` +
        `The shift has already started or is ongoing. Changes can only be made to future shifts.`
      );
      return;
    }

    const updatePayload = {
      shift_name: editingSchedule.shift_name,
      start_time: editingSchedule.start_time,
      end_time: editingSchedule.end_time,
      day_limits: {
        ...editingSchedule.day_limits,
        [editingSchedule.day]: editingSchedule.member_limit
      },
      edited_by: JSON.parse(localStorage.getItem("user") || "{}")?.employee?.employee_id || "admin"
      // Note: We're NOT updating the 'days' array here, only the day_limits
      // The 'days' array should remain unchanged
    };

    console.log("📤 Sending update payload to API:", updatePayload);

    try {
      const result = await updateTemplate(editingSchedule.originalId, updatePayload);
      
      console.log("✅ Update result:", result);
      console.log("   Template ID:", result.template?.id);
      console.log("   Publish Status:", result.template?.publish_status);
      
      // Show appropriate message based on publish status
      if (result.template && result.template.publish_status === "Draft") {
        if (result.template.is_edited) {
          toast.info("✏️ Schedule edited! The original stays visible to team leaders. Click 'Publish Schedule' to apply changes.", {
            autoClose: 5000
          });
        } else {
          toast.info("📝 Draft created! Click 'Publish Schedule' to make it visible to team leaders.", {
            autoClose: 5000
          });
        }
      } else if (result.template && result.template.publish_status === "Published") {
        toast.success("Schedule updated! Team leaders can see the changes immediately.");
      } else {
        toast.success("Schedule updated successfully!");
      }
      
      setEditingSchedule(null);
      
      // Refresh the templates data
      console.log("🔄 Refreshing templates data...");
      await fetchTemplatesData();
      console.log("✅ Templates refreshed");
    } catch (error) {
      console.error("❌ Error updating schedule:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error("Failed to update schedule");
    }
  };

  const handleDeleteSavedTemplate = (id) => {
    const template = savedTemplates.find(t => t.id === id);
    confirmAction(`Delete "${template?.name}"?`, () => {
      const updated = savedTemplates.filter(t => t.id !== id);
      setSavedTemplates(updated);
      localStorage.setItem("savedScheduleTemplates", JSON.stringify(updated));
      toast.success("Deleted!");
    });
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
  };

  const handleAddDepartmentToDay = async (departmentData) => {
    try {
      
      console.log("🔍 Adding department:", departmentData.department, "to", selectedDay);
      console.log("📋 Current templates:", templates.length);
      
      // Check if this department already has a shift on this day
      // Ignore schedules marked for deletion - they're being removed
      const matchingTemplates = templates.filter(t => 
        t.department === departmentData.department &&
        t.days.includes(selectedDay)
      );
      
      console.log("🔎 Matching templates:", matchingTemplates.map(t => ({
        id: t.id,
        dept: t.department,
        days: t.days,
        pending_deletion: t.pending_deletion
      })));
      
      const exists = templates.find(t => 
        t.department === departmentData.department &&
        t.days.includes(selectedDay) &&
        t.pending_deletion !== true  // Explicitly check it's not true
      );

      console.log("❓ Exists (not pending deletion):", exists ? "YES - BLOCKING" : "NO - ALLOWING");

      if (exists) {
        throw new Error(`${departmentData.department} already scheduled`);
      }
      
      console.log("✅ Creating new template...");

      const newTemplate = await createTemplate({
        shift_name: departmentData.shift_name,
        start_time: departmentData.start_time,
        end_time: departmentData.end_time,
        department: departmentData.department,
        days: [selectedDay],
        day_limits: { [selectedDay]: departmentData.member_limit || 1 },
        created_by: "admin"
      });

      console.log("✅ Template created successfully:", newTemplate);

      // Immediately refresh templates to update the main view
      await fetchTemplatesData();

      // Return the created schedule for real-time display in modal
      return { 
        success: true, 
        department: departmentData.department,
        schedule: {
          id: newTemplate.id,
          department: departmentData.department,
          shift_name: departmentData.shift_name,
          start_time: departmentData.start_time,
          end_time: departmentData.end_time,
          day_limits: { [selectedDay]: departmentData.member_limit || 1 },
          member_limit: departmentData.member_limit
        }
      };
    } catch (error) {
      console.error("❌ Error adding department to day:", error);
      console.error("❌ Error details:", error.message, error.response?.data);
      return { success: false, department: departmentData.department, error: error.message };
    }
  };

  const handleAddShiftTemplate = async () => {
    if (!shiftTemplateForm.name || !shiftTemplateForm.start || !shiftTemplateForm.end) {
      toast.warning("Please fill all fields!");
      return;
    }

    try {
      if (editingShiftIndex !== null) {
        // Edit existing
        const templateToEdit = shiftTemplates[editingShiftIndex];
        await updateShiftTemplate(templateToEdit.id, {
          name: shiftTemplateForm.name,
          start_time: shiftTemplateForm.start + ":00", // Convert "08:00" to "08:00:00"
          end_time: shiftTemplateForm.end + ":00"
        });
        toast.success("Shift template updated!");
      } else {
        // Add new
        await createShiftTemplate({
          name: shiftTemplateForm.name,
          start_time: shiftTemplateForm.start + ":00",
          end_time: shiftTemplateForm.end + ":00",
          created_by: JSON.parse(localStorage.getItem("user") || "{}")?.employee?.employee_id || "admin"
        });
        toast.success("Shift template created!");
      }

      // Refresh the shift templates list
      await fetchShiftTemplatesData();
      
      setShiftTemplateForm({ name: "", start: "", end: "" });
      setEditingShiftIndex(null);
      setShowShiftTemplateModal(false);
    } catch (error) {
      console.error("Error saving shift template:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save shift template");
      }
    }
  };

  const handleEditShiftTemplate = (index) => {
    const template = shiftTemplates[index];
    setShiftTemplateForm({
      name: template.name,
      start: template.start,
      end: template.end
    });
    setEditingShiftIndex(index);
    setShowShiftTemplateModal(true);
  };

  const handleDeleteShiftTemplate = async (index) => {
    const template = shiftTemplates[index];
    
    confirmAction(`Delete "${template.name}"?`, async () => {
      try {
        await deleteShiftTemplate(template.id);
        toast.success("Shift template deleted!");
        
        // Refresh the shift templates list
        await fetchShiftTemplatesData();
      } catch (error) {
        console.error("Error deleting shift template:", error);
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error("Failed to delete shift template");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Shift Template Management Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShiftTemplateForm({ name: "", start: "", end: "" });
            setEditingShiftIndex(null);
            setShowShiftTemplateModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-3 md:px-4 py-2 rounded-md hover:bg-purple-700 transition text-sm md:text-base"
        >
          <MdAdd size={18} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">Manage Shift Templates</span>
          <span className="sm:hidden">Shifts</span>
        </button>
      </div>

      {/* Shift Template Modal */}
      {showShiftTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingShiftIndex !== null ? "Edit" : "Manage"} Shift Templates
              </h3>
              <button
                onClick={() => {
                  setShowShiftTemplateModal(false);
                  setShiftTemplateForm({ name: "", start: "", end: "" });
                  setEditingShiftIndex(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Add/Edit Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-700 mb-3">
                {editingShiftIndex !== null ? "Edit Shift Template" : "Add New Shift Template"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift Name
                  </label>
                  <input
                    type="text"
                    value={shiftTemplateForm.name}
                    onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, name: e.target.value })}
                    placeholder="e.g., Morning Shift"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftTemplateForm.start}
                    onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, start: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={shiftTemplateForm.end}
                    onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, end: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddShiftTemplate}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  <MdCheck size={18} />
                  {editingShiftIndex !== null ? "Update" : "Add"} Template
                </button>
                {editingShiftIndex !== null && (
                  <button
                    onClick={() => {
                      setShiftTemplateForm({ name: "", start: "", end: "" });
                      setEditingShiftIndex(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Existing Templates List */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Existing Shift Templates</h4>
              <div className="space-y-2">
                {shiftTemplates.map((shift, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:border-purple-300"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{shift.name}</p>
                      <p className="text-sm text-gray-600">{shift.start} - {shift.end}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditShiftTemplate(index)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-md"
                        title="Edit"
                      >
                        <MdEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteShiftTemplate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Schedule Modal */}
      {selectedDay && (
        <DayScheduleModal
          day={selectedDay}
          schedules={weeklyView[selectedDay] || []}
          departments={departments}
          shiftTemplates={shiftTemplates}
          onClose={() => {
            setSelectedDay(null);
            fetchTemplatesData(); // Refresh weekly view when modal closes
          }}
          onAddDepartment={handleAddDepartmentToDay}
          onEdit={handleEditSchedule}
          onDelete={handleDeleteTemplate}
          onDeleteFromDay={handleDeleteFromDay}
        />
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Schedule - {editingSchedule.department} ({editingSchedule.day})
            </h3>
            
            {/* Warning if shift time has started for today */}
            {(() => {
              const today = new Date();
              const todayDayName = getDayOfWeek(today);
              const isToday = editingSchedule.day === todayDayName;
              const shiftPassed = isToday && isShiftTimePassedForToday(editingSchedule.start_time, editingSchedule.end_time);
              
              return shiftPassed && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Cannot edit today's schedule: The shift ({editingSchedule.start_time} - {editingSchedule.end_time}) has already started or is ongoing.
                  </p>
                </div>
              );
            })()}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Shift</label>
                <select
                  value={editingSchedule.shift_name}
                  onChange={(e) => {
                    const selectedShift = shiftTemplates.find(s => s.name === e.target.value);
                    if (selectedShift) {
                      setEditingSchedule({
                        ...editingSchedule,
                        shift_name: selectedShift.name,
                        start_time: selectedShift.start,
                        end_time: selectedShift.end
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  {shiftTemplates.map((shift, index) => (
                    <option key={index} value={shift.name}>
                      {shift.name} ({shift.start} - {shift.end})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {editingSchedule.shift_name} ({editingSchedule.start_time} - {editingSchedule.end_time})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                <input
                  type="number"
                  min="1"
                  value={editingSchedule.member_limit || 1}
                  onChange={(e) => setEditingSchedule({...editingSchedule, member_limit: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={(() => {
                    const today = new Date();
                    const todayDayName = getDayOfWeek(today);
                    const isToday = editingSchedule.day === todayDayName;
                    return isToday && isShiftTimePassedForToday(editingSchedule.start_time, editingSchedule.end_time);
                  })()}
                  className={`flex-1 rounded-md px-4 py-2 flex items-center justify-center gap-2 ${
                    (() => {
                      const today = new Date();
                      const todayDayName = getDayOfWeek(today);
                      const isToday = editingSchedule.day === todayDayName;
                      const shiftPassed = isToday && isShiftTimePassedForToday(editingSchedule.start_time, editingSchedule.end_time);
                      return shiftPassed 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-primary text-white hover:bg-primary-hover";
                    })()
                  }`}
                >
                  <MdCheck /> Save Changes
                </button>
                <button
                  onClick={() => setEditingSchedule(null)}
                  className="flex-1 bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <MdClose /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Template View Modal */}
      {viewingSavedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Template: {viewingSavedTemplate.name}
              </h3>
              <button
                onClick={() => setViewingSavedTemplate(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Apply Template Button */}
            <div className="mb-4">
              <button
                onClick={() => handleApplyTemplate(viewingSavedTemplate)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
              >
                <MdPlayArrow size={20} /> Apply This Template to Current Schedule
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will create new schedule templates based on this configuration. Existing schedules will be skipped.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
              {daysOfWeek.map(day => (
                <div key={day} className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-purple-600 text-white p-2 text-center font-semibold text-sm">
                    {day}
                  </div>
                  <div className="p-2 space-y-2 min-h-[150px] bg-gray-50">
                    {viewingSavedTemplate.weeklySchedule[day]?.length > 0 ? (
                      viewingSavedTemplate.weeklySchedule[day].map((schedule, idx) => {
                        // Get limit with proper fallback (default to 1 if not set)
                        const dayLimit = schedule.day_limits?.[day];
                        const limit = dayLimit !== undefined && dayLimit !== null 
                          ? dayLimit 
                          : (schedule.member_limit !== undefined && schedule.member_limit !== null 
                              ? schedule.member_limit 
                              : 1); // Default to 1 if no limit is set
                        return (
                          <div key={idx} className="bg-white border border-purple-200 rounded-md p-2">
                            <p className="font-semibold text-xs text-purple-800">{schedule.department}</p>
                            <p className="text-xs text-gray-700">{schedule.shift_name}</p>
                            <p className="text-xs text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                            <p className="text-xs text-green-700 font-medium mt-1">
                              Max: {limit} {limit === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-xs text-center mt-4">No schedules</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions Banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 md:p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm md:text-base">
          <MdLightbulb size={18} className="md:w-5 md:h-5" /> How to Create Schedules
        </h3>
        <ul className="text-xs md:text-sm text-primary-800 space-y-1">
          <li>• <strong>Click on any day</strong> (Monday-Sunday) to open the schedule manager</li>
          <li>• <strong>Add departments/zones</strong> to that specific day with shift details</li>
          <li>• <strong>Edit or delete</strong> schedules directly from the day view</li>
          <li>• <strong>Save as template</strong> to reuse this weekly configuration later</li>
        </ul>
      </div>

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-primary">Weekly Schedule Overview</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handlePublishSchedules}
              className="flex items-center justify-center gap-2 bg-primary text-white px-3 md:px-4 py-2 rounded-md hover:bg-primary-700 font-semibold text-sm md:text-base"
            >
              <MdCheck size={16} className="md:w-5 md:h-5" /> Publish Schedule
            </button>
            <button
              onClick={handleSaveAsReusable}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 md:px-4 py-2 rounded-md hover:bg-green-700 text-sm md:text-base"
            >
              <MdSave size={16} className="md:w-5 md:h-5" /> Save as Template
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Schedule Status Legend:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-200 bg-white rounded flex-shrink-0"></div>
              <span className="text-gray-600">Published Schedule</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-300 bg-orange-50 rounded flex-shrink-0"></div>
              <span className="text-orange-800 font-medium">DRAFT</span>
              <span className="text-gray-600 hidden sm:inline">- New schedule</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-300 bg-yellow-50 rounded flex-shrink-0"></div>
              <span className="text-yellow-800 font-medium">EDITED</span>
              <span className="text-gray-600 hidden sm:inline">- Modified schedule</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-300 bg-red-50 rounded opacity-75 flex-shrink-0"></div>
              <span className="text-red-800 font-medium">DELETED</span>
              <span className="text-gray-600 hidden sm:inline">- Marked for removal</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click "Publish Schedule" to apply all draft changes and remove deleted schedules permanently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3">
          {daysOfWeek.map(day => (
            <div key={day} className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-primary-500 transition-all">
              <button
                onClick={() => handleDayClick(day)}
                className="w-full bg-primary text-white p-2 md:p-3 text-center font-semibold hover:bg-primary-hover transition-colors cursor-pointer text-sm md:text-base"
                title={`Click to manage ${day} schedule`}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 3)}</span>
              </button>
              <div className="p-2 md:p-3 space-y-2 min-h-[150px] md:min-h-[200px] bg-gray-50">
                {weeklyView[day]?.length > 0 ? (
                  weeklyView[day].map((schedule, idx) => {
                    // Get limit with proper fallback (default to 1 if not set)
                    const dayLimit = schedule.day_limits?.[day];
                    const limit = dayLimit !== undefined && dayLimit !== null 
                      ? dayLimit 
                      : (schedule.member_limit !== undefined && schedule.member_limit !== null 
                          ? schedule.member_limit 
                          : 1); // Default to 1 if no limit is set
                    const isDraft = schedule.publish_status === "Draft";
                    const isDeleted = schedule.pending_deletion === true;
                    const isEdited = schedule.is_edited === true; // Use backend field
                    
                    return (
                      <div
                        key={idx}
                        className={`bg-white rounded-md p-2 hover:shadow-md transition-shadow ${
                          isDeleted 
                            ? 'border-2 border-red-300 bg-red-50 opacity-75' 
                            : isEdited
                              ? 'border-2 border-yellow-300 bg-yellow-50'
                              : isDraft 
                                ? 'border-2 border-orange-300 bg-orange-50' 
                                : 'border border-primary-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <p className={`font-semibold text-xs md:text-sm truncate ${
                              isDeleted 
                                ? 'text-red-800 line-through' 
                                : isEdited
                                  ? 'text-yellow-800'
                                  : isDraft 
                                    ? 'text-orange-800' 
                                    : 'text-primary-800'
                            }`}>
                              {schedule.department}
                            </p>
                            {isDeleted && (
                              <span className="text-[8px] md:text-[10px] bg-red-200 text-red-800 px-1 py-0.5 rounded font-medium whitespace-nowrap">
                                DEL
                              </span>
                            )}
                            {isEdited && !isDeleted && (
                              <span className="text-[8px] md:text-[10px] bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded font-medium whitespace-nowrap">
                                EDIT
                              </span>
                            )}
                            {isDraft && !isDeleted && !isEdited && (
                              <span className="text-[8px] md:text-[10px] bg-orange-200 text-orange-800 px-1 py-0.5 rounded font-medium whitespace-nowrap">
                                DRAFT
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 ml-1">
                            <button
                              onClick={() => handleEditSchedule(schedule, day)}
                              className={`p-1 ${
                                isDeleted 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-primary-600 hover:text-primary-800'
                              }`}
                              title={isDeleted ? "Cannot edit deleted schedule" : "Edit"}
                              disabled={isDeleted}
                            >
                              <MdEdit size={12} className="md:w-3.5 md:h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFromDay(schedule.id, day, schedule.department)}
                              className={`p-1 ${
                                isDeleted 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-800'
                              }`}
                              title={isDeleted ? "Already marked for deletion" : "Delete from this day"}
                              disabled={isDeleted}
                            >
                              <MdDelete size={12} className="md:w-3.5 md:h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className={`text-[10px] md:text-xs font-medium truncate ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                          {schedule.shift_name}
                        </p>
                        <p className={`text-[10px] md:text-xs truncate ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                        <p className={`text-[10px] md:text-xs font-medium mt-1 ${isDeleted ? 'text-gray-500 line-through' : 'text-green-700'}`}>
                          Max: {limit}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-[10px] md:text-xs text-center mt-4 md:mt-8">No schedules</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Templates */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Saved Reusable Templates</h3>
        {savedTemplates.length === 0 ? (
          <p className="text-gray-500 text-sm">No saved templates yet. Create a schedule and save it as a template.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {savedTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm md:text-base truncate">{template.name}</h4>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="text-primary-600 hover:text-primary-800 p-1"
                      title="View & Apply Template"
                    >
                      <MdContentCopy size={14} className="md:w-4 md:h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSavedTemplate(template.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete"
                    >
                      <MdDelete size={14} className="md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-3 max-h-20 overflow-y-auto">
                  {Object.entries(template.weeklySchedule).map(([day, schedules]) => (
                    schedules.length > 0 && (
                      <div key={day} className="mb-1">
                        <span className="font-medium">{day.slice(0, 3)}:</span> {schedules.length} zone(s)
                      </div>
                    )
                  ))}
                </div>
                <button
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-xs md:text-sm font-medium"
                >
                  <MdPlayArrow size={14} className="md:w-4 md:h-4" /> Apply Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
