import { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { 
  MdAdd, MdEdit, MdDelete, MdClose, MdCalendarToday,
  MdLightbulb, MdSupervisorAccount, MdPerson, MdAdminPanelSettings, MdAssignment
} from "react-icons/md";
import { toast } from 'react-toastify';

// API Imports
import { 
  getEmployeeSchedules, assignSchedule, deleteEmployeeSchedule 
} from "../api/ScheduleApi";
import { 
  getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate 
} from "../api/ShiftTemplateApi";
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

const getRoleColor = (role) => {
  switch (role) {
    case 'supervisor':
      return '#8b5cf6'; // Purple
    case 'admin':
      return '#3b82f6'; // Blue
    default:
      return '#6b7280'; // Gray
  }
};

const getRoleIcon = (role) => {
  switch (role) {
    case 'supervisor':
      return MdSupervisorAccount;
    case 'admin':
      return MdAdminPanelSettings;
    default:
      return MdPerson;
  }
};

// ==========================================
// Role Assignment Modal Component
// ==========================================

function RoleAssignmentModal({ selectedDate, onClose, onSave, shiftTemplates, availableEmployees }) {
  const [formData, setFormData] = useState({
    employee_id: "",
    shift_template_id: "",
    shift_name: "",
    start_time: "",
    end_time: ""
  });
  const [loading, setLoading] = useState(false);

  const dateStr = selectedDate ? formatDateForAPI(selectedDate) : "";
  const dayName = selectedDate ? getDayName(selectedDate) : "";

  const handleShiftTemplateChange = (templateId) => {
    const selected = shiftTemplates.find(s => s.id === parseInt(templateId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        shift_template_id: templateId,
        shift_name: selected.name,
        start_time: selected.start_time.substring(0, 5),
        end_time: selected.end_time.substring(0, 5)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.warning("Please fill all fields!");
      return;
    }

    setLoading(true);
    
    try {
      // Create a template-like structure for the assignment
      await assignSchedule({
        employee_id: formData.employee_id,
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        days: [dayName],
        assigned_by: "admin"
      });

      toast.success(`Role assigned for ${dateStr}`);
      onSave();
      onClose();
    } catch (error) {
      console.error("Error creating role assignment:", error);
      toast.error("Failed to create role assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
              <MdAssignment size={24} />
              Assign Role for {dateStr}
            </h2>
            <p className="text-sm text-gray-600">{dayName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <MdClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee (Supervisor/Admin)
            </label>
            {availableEmployees.length === 0 ? (
              <div className="text-orange-600 text-sm p-3 bg-orange-50 border border-orange-200 rounded">
                No available supervisors or admins for this date.
              </div>
            ) : (
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Employee</option>
                {availableEmployees.map(emp => {
                  const IconComponent = getRoleIcon(emp.role);
                  return (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.fullname || `${emp.firstname} ${emp.lastname}`} - {emp.role?.toUpperCase()} ({emp.employee_id})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Shift Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift Template
            </label>
            <select
              value={formData.shift_template_id}
              onChange={(e) => handleShiftTemplateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Shift Template</option>
              {shiftTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)})
                </option>
              ))}
            </select>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.employee_id || availableEmployees.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <MdAdd size={18} />
                  Assign Role
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Main Component: CalendarRoleScheduleView
// ==========================================

export default function CalendarRoleScheduleView() {
  // State
  const [assignments, setAssignments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: "", start: "", end: "" });
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchAssignmentsData();
    fetchEmployeesData();
    fetchShiftTemplatesData();
  }, []);

  // Generate calendar events from assignments
  useEffect(() => {
    generateCalendarEvents();
  }, [assignments, employees]);

  // Data Fetchers
  const fetchAssignmentsData = async () => {
    try {
      setLoading(true);
      const schedules = await getEmployeeSchedules();
      
      // Filter for supervisor and admin assignments only
      const roleBasedSchedules = schedules.filter(schedule => {
        // We'll check the employee role when we have the employees data
        return true; // For now, get all schedules and filter later
      });

      setAssignments(roleBasedSchedules);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load role assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesData = async () => {
    try {
      const data = await fetchEmployees();
      // Filter for supervisors and admins only
      const roleBasedEmployees = data.filter(emp => 
        emp.role === 'supervisor' || emp.role === 'admin'
      );
      setEmployees(roleBasedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter assignments to only include supervisors and admins
    const roleBasedAssignments = assignments.filter(assignment => {
      const employee = employees.find(emp => emp.employee_id === assignment.employee_id);
      return employee && (employee.role === 'supervisor' || employee.role === 'admin');
    });

    // Generate events for the next 60 days
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      
      const dayName = getDayName(date);
      const dateStr = formatDateForAPI(date);

      // Find assignments for this day
      const dayAssignments = roleBasedAssignments.filter(assignment => 
        assignment.days.includes(dayName)
      );

      dayAssignments.forEach(assignment => {
        const employee = employees.find(emp => emp.employee_id === assignment.employee_id);
        if (!employee) return;

        const template = assignment.template;
        if (!template) return;

        const startTime = convertTo24Hour(template.start_time);
        const endTime = convertTo24Hour(template.end_time);
        
        const backgroundColor = getRoleColor(employee.role);
        const IconComponent = getRoleIcon(employee.role);
        
        events.push({
          id: `${assignment.id}-${dateStr}`,
          title: `${employee.fullname || employee.firstname} ${employee.lastname} (${employee.role.toUpperCase()})`,
          start: `${dateStr}T${startTime}`,
          end: `${dateStr}T${endTime}`,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          textColor: "white",
          extendedProps: {
            assignmentId: assignment.id,
            employeeId: assignment.employee_id,
            employeeName: employee.fullname || `${employee.firstname} ${employee.lastname}`,
            employeeRole: employee.role,
            shiftName: template.shift_name,
            startTime: template.start_time,
            endTime: template.end_time,
            dayName: dayName,
            date: dateStr
          }
        });
      });
    }

    setCalendarEvents(events);
  }, [assignments, employees]);

  // Event Handlers
  const handleDateClick = (info) => {
    const clickedDate = new Date(info.date);
    const dayName = getDayName(clickedDate);
    
    // Get already assigned employee IDs for this day
    const assignedIds = assignments
      .filter(assignment => assignment.days.includes(dayName))
      .map(assignment => assignment.employee_id);
    
    // Filter available employees (not already assigned on this day)
    const available = employees.filter(emp => 
      !assignedIds.includes(emp.employee_id)
    );
    
    setSelectedDate(clickedDate);
    setShowAssignmentModal(true);
  };

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    
    const message = `
      Employee: ${props.employeeName}
      Role: ${props.employeeRole.toUpperCase()}
      Shift: ${props.shiftName}
      Time: ${props.startTime} - ${props.endTime}
      Date: ${props.date}
    `;
    
    toast.info(message, { autoClose: 5000 });
  };

  const handleDeleteAssignment = async (assignmentId, employeeName) => {
    confirmAction(`Remove ${employeeName} from schedule?`, async () => {
      try {
        await deleteEmployeeSchedule(assignmentId);
        toast.success(`${employeeName} removed from schedule`);
        fetchAssignmentsData();
      } catch (error) {
        console.error("Error deleting assignment:", error);
        toast.error("Failed to delete assignment");
      }
    });
  };

  // Shift Template Handlers
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

  // Get available employees for selected date
  const getAvailableEmployees = () => {
    if (!selectedDate) return [];
    
    const dayName = getDayName(selectedDate);
    const assignedIds = assignments
      .filter(assignment => assignment.days.includes(dayName))
      .map(assignment => assignment.employee_id);
    
    return employees.filter(emp => !assignedIds.includes(emp.employee_id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading role assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdSupervisorAccount size={28} className="text-blue-600" />
            Calendar-Based Role Scheduling
          </h2>
          <p className="text-gray-600 mt-1">Click on any date to assign supervisors and admins. Manage role-based schedules visually.</p>
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

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <MdLightbulb size={20} /> How to Use Role-Based Calendar Scheduling
        </h3>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Click on any date to assign supervisors or admins to that specific day</li>
          <li>Purple events are supervisors, blue events are admins</li>
          <li>Click on existing events to view details</li>
          <li>Each employee can only be assigned to one shift per day</li>
        </ul>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdSupervisorAccount size={24} className="text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Supervisors</p>
              <p className="text-xl font-bold text-gray-800">
                {employees.filter(emp => emp.role === 'supervisor').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdAdminPanelSettings size={24} className="text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Admins</p>
              <p className="text-xl font-bold text-gray-800">
                {employees.filter(emp => emp.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdAssignment size={24} className="text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Active Assignments</p>
              <p className="text-xl font-bold text-gray-800">{assignments.length}</p>
            </div>
          </div>
        </div>
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
      {showAssignmentModal && selectedDate && (
        <RoleAssignmentModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedDate(null);
          }}
          onSave={fetchAssignmentsData}
          shiftTemplates={shiftTemplates}
          availableEmployees={getAvailableEmployees()}
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