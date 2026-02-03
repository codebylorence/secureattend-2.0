import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { MdSchedule, MdPeople, MdClose, MdCalendarToday, MdLocationOn } from "react-icons/md";
import { getTemplates } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { useSocket } from "../context/SocketContext";
import { formatTimeRange24, formatTime24Short } from "../utils/timeFormat";

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

// Zone Details Modal Component
function ShiftDetailsModal({ selectedShift, onClose, employees }) {
  if (!selectedShift) return null;

  console.log('📋 Modal opened with shift data:', {
    shift: selectedShift.shift_name,
    date: selectedShift.date,
    zones: selectedShift.zones?.length || 0,
    employees: employees?.length || 0
  });

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    if (!employee) return employeeId;
    
    if (employee.firstname && employee.lastname) {
      return `${employee.firstname} ${employee.lastname}`;
    }
    if (employee.firstname && employee.firstname.trim()) {
      return employee.firstname;
    }
    
    return employeeId;
  };

  const getEmployeePosition = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.position : "";
  };

  const getEmployeeRole = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.role : "";
  };

  // Separate zones and roles, and merge all Role-Based zones into one
  const zones = selectedShift.zones.filter(zone => zone.department !== 'Role-Based');
  
  const roleBasedZones = selectedShift.zones.filter(zone => zone.department === 'Role-Based');
  
  // Merge all Role-Based zones into a single logical role group
  const roles = roleBasedZones.length > 0 ? [{
    department: 'Role-Based',
    template_id: roleBasedZones[0].template_id, // Use the first template_id for operations
    member_limit: null, // Role-Based templates don't have member limits
    assigned_count: roleBasedZones.reduce((sum, zone) => sum + zone.assigned_count, 0),
    members: roleBasedZones.reduce((allMembers, zone) => [...allMembers, ...(zone.members || [])], [])
  }] : [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getShiftColor(selectedShift.shift_name) }}
            >
              <MdSchedule size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedShift.shift_name} - {selectedShift.date}
              </h3>
              <p className="text-sm text-gray-600">
                {formatTimeRange24(selectedShift.start_time, selectedShift.end_time)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            <MdClose />
          </button>
        </div>

        {/* Scheduled Zones Header */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
            <MdLocationOn size={20} />
            Scheduled Zones ({zones.length + roles.length})
          </h4>
        </div>

        {/* Zone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Management Roles - Single Card */}
          {roles.length > 0 && (
            <div className="border-2 border-purple-300 bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full bg-purple-500"
                  ></div>
                  <span className="font-semibold text-gray-800">Management Roles</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-white px-2 py-1 rounded border">
                  <MdPeople size={16} />
                  <span>{roles[0].assigned_count || 0}</span>
                </div>
              </div>

              <div className="mb-3">
                <h6 className="text-sm font-semibold text-gray-700 mb-2">Assigned Members:</h6>
              </div>

              {roles[0].members && roles[0].members.length > 0 ? (
                <div className="space-y-2">
                  {roles[0].members.map((member, memberIdx) => {
                    const employee = employees.find(emp => emp.employee_id === member.employee_id);
                    const employeeName = getEmployeeName(member.employee_id);
                    const employeeRole = employee?.role;
                    const roleTitle = employeeRole === 'supervisor' ? 'Supervisor' : 'Warehouse Admin';
                    const position = getEmployeePosition(member.employee_id);

                    return (
                      <div key={memberIdx} className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800">{employeeName}</span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                employeeRole === 'supervisor' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {roleTitle}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              ID: {member.employee_id} | Position: {position || roleTitle}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No members assigned
                </div>
              )}
            </div>
          )}

          {/* Zone Assignments */}
          {zones.map((zone, index) => (
            <div key={`zone-${index}`} className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getShiftColor(selectedShift.shift_name) }}
                  ></div>
                  <span className="font-semibold text-gray-800">{zone.department}</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-white px-2 py-1 rounded border">
                  <MdPeople size={16} />
                  <span>{zone.assigned_count || 0}/{zone.member_limit || '∞'}</span>
                </div>
              </div>

              <div className="mb-3">
                <h6 className="text-sm font-semibold text-gray-700 mb-2">Assigned Members:</h6>
              </div>

              {zone.members && zone.members.length > 0 ? (
                <div className="space-y-2">
                  {zone.members.map((member, memberIdx) => {
                    const position = getEmployeePosition(member.employee_id);
                    const employeeRole = getEmployeeRole(member.employee_id);
                    const isTeamLeader = position === "Team Leader";
                    const employeeName = getEmployeeName(member.employee_id);

                    return (
                      <div key={memberIdx} className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800">{employeeName}</span>
                              {isTeamLeader && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                  Team Leader
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              ID: {member.employee_id} | Position: {position || 'Team Leader'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm bg-white border border-gray-200 rounded">
                  <MdPeople size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>No members assigned yet</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{zones.length + roles.length}</p>
              <p className="text-sm text-gray-600">Total Zones</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {zones.reduce((sum, zone) => sum + (zone.assigned_count || 0), 0) + 
                 roles.reduce((sum, role) => sum + (role.members?.length || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Total Assigned</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ViewSchedules() {
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('template:created', () => {
      console.log('📡 ViewSchedules: Template created - refreshing...');
      fetchData();
    });

    socket.on('template:updated', () => {
      console.log('📡 ViewSchedules: Template updated - refreshing...');
      fetchData();
    });

    socket.on('template:deleted', () => {
      console.log('📡 ViewSchedules: Template deleted - refreshing...');
      fetchData();
    });

    socket.on('employee:assigned', (data) => {
      console.log('📡 ViewSchedules: Employee assigned - refreshing...', data);
      // Force refresh with a small delay to ensure backend has processed
      setTimeout(() => {
        fetchData();
      }, 500);
    });

    socket.on('employee:removed', (data) => {
      console.log('📡 ViewSchedules: Employee removed - refreshing...', data);
      fetchData();
    });

    socket.on('schedules:published', () => {
      console.log('📡 ViewSchedules: Schedules published - refreshing...');
      fetchData();
    });

    return () => {
      socket.off('template:created');
      socket.off('template:updated');
      socket.off('template:deleted');
      socket.off('employee:assigned');
      socket.off('employee:removed');
      socket.off('schedules:published');
    };
  }, [socket]);

  // Generate calendar events from templates
  useEffect(() => {
    generateCalendarEvents();
  }, [templates]);

  const fetchData = async () => {
    try {
      const [templatesData, employeesData] = await Promise.all([
        getTemplates(), // Get all active templates (no more published vs draft distinction)
        fetchEmployees()
      ]);
      
      console.log(`📊 ViewSchedules: Loaded ${templatesData.length} templates`);
      console.log(`👥 ViewSchedules: Loaded ${employeesData.length} employees`);
      
      // Debug: Log templates with assignments
      templatesData.forEach(template => {
        if (template.assigned_employees) {
          try {
            const assignments = typeof template.assigned_employees === 'string' 
              ? JSON.parse(template.assigned_employees) 
              : template.assigned_employees;
            console.log(`📋 Template ${template.id} (${template.department} - ${template.shift_name}): ${assignments.length} assignments`);
          } catch (e) {
            console.error(`❌ Error parsing assignments for template ${template.id}:`, e);
          }
        } else {
          console.log(`📋 Template ${template.id} (${template.department} - ${template.shift_name}): No assignments`);
        }
      });
      
      setTemplates(templatesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarEvents = () => {
    const events = [];
    const shiftsByDate = {};

    console.log(`🗓️ Generating calendar events from ${templates.length} templates`);

    // Group templates by date and shift (all active templates from API)
    templates.forEach(template => {
      if (!template.specific_date) {
        console.log(`⏭️ Skipping template ${template.id} - no specific date`);
        return; // Skip templates without specific dates
      }

      const dateKey = template.specific_date;
      
      if (!shiftsByDate[dateKey]) {
        shiftsByDate[dateKey] = {};
      }
      
      if (!shiftsByDate[dateKey][template.shift_name]) {
        shiftsByDate[dateKey][template.shift_name] = {
          shift_name: template.shift_name,
          start_time: template.start_time,
          end_time: template.end_time,
          date: dateKey,
          zones: [],
          roles: []
        };
      }
      
      // Find assigned employees for this template from template.assigned_employees
      let templateAssignedEmployees = [];
      if (template.assigned_employees) {
        try {
          const assignedEmployeesData = typeof template.assigned_employees === 'string' 
            ? JSON.parse(template.assigned_employees) 
            : template.assigned_employees;
          
          templateAssignedEmployees = assignedEmployeesData.map(assignment => ({
            employee_id: assignment.employee_id,
            assigned_date: assignment.assigned_date,
            assigned_by: assignment.assigned_by,
            template_id: template.id
          }));
        } catch (e) {
          console.error('Error parsing assigned_employees for template', template.id, e);
        }
      }
      
      console.log(`📋 Template ${template.id} (${template.shift_name} - ${template.department}):`, {
        assigned_count: templateAssignedEmployees.length,
        assigned_employees: templateAssignedEmployees.map(emp => emp.employee_id)
      });
      
      // All templates are treated as zones now (no more role-based separation)
      shiftsByDate[dateKey][template.shift_name].zones.push({
        department: template.department,
        template_id: template.id,
        member_limit: template.member_limit,
        assigned_count: templateAssignedEmployees.length,
        members: templateAssignedEmployees
      });
    });

    console.log(`📅 Shifts by date:`, Object.keys(shiftsByDate).length, 'dates');

    // Create calendar events for each shift
    Object.entries(shiftsByDate).forEach(([date, shifts]) => {
      Object.entries(shifts).forEach(([shiftName, shiftData]) => {
        const startTime = formatTime24Short(shiftData.start_time);
        const endTime = formatTime24Short(shiftData.end_time);
        
        console.log(`🕐 Time conversion for ${shiftName}:`, {
          original_start: shiftData.start_time,
          original_end: shiftData.end_time,
          converted_start: startTime,
          converted_end: endTime
        });
        const backgroundColor = getShiftColor(shiftName);
        
        // Check if this is a past date
        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = eventDate < today;
        
        // Calculate total assigned members across all zones and roles
        const totalZoneAssigned = shiftData.zones.reduce((sum, zone) => sum + zone.assigned_count, 0);
        const totalRoleAssigned = shiftData.roles.reduce((sum, role) => sum + role.assigned_count, 0);
        const totalAssigned = totalZoneAssigned + totalRoleAssigned;
        
        // Count total zones and roles
        const totalItems = shiftData.zones.length + shiftData.roles.length;
        
        console.log(`� Creating event: ${date} - ${shiftName} (${shiftData.zones.length} zones, ${shiftData.roles.length} roles, ${totalAssigned} assigned)`);
        
        events.push({
          id: `${date}-${shiftName}`,
          title: `${startTime} - ${endTime} ${shiftName}`,
          start: `${date}T${startTime}`,
          end: `${date}T${endTime}`,
          backgroundColor: isPastDate ? '#9ca3af' : backgroundColor, // Gray for past dates
          borderColor: isPastDate ? '#6b7280' : backgroundColor,
          textColor: "white",
          classNames: isPastDate ? ['past-event'] : [],
          extendedProps: {
            shiftData: shiftData,
            zoneCount: shiftData.zones.length,
            roleCount: shiftData.roles.length,
            totalAssigned: totalAssigned,
            totalItems: totalItems,
            isPast: isPastDate // Keep track for visual styling
          }
        });
      });
    });

    console.log(`📊 Generated ${events.length} calendar events`);
    setCalendarEvents(events);
  };

  const handleEventClick = (info) => {
    // Allow viewing all events, including past ones
    console.log('🖱️ Event clicked:', {
      isPast: info.event.extendedProps.isPast,
      shiftData: info.event.extendedProps.shiftData,
      title: info.event.title
    });
    
    const shiftData = info.event.extendedProps.shiftData;
    setSelectedShift(shiftData);
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading schedules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-heading text-[21px] font-semibold flex items-center gap-2">
                View Shift Schedules
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <style jsx>{`
          .fc-day-past {
            background-color: #f3f4f6 !important;
            color: #9ca3af !important;
          }
          .fc-day-past .fc-daygrid-day-number {
            color: #9ca3af !important;
          }
          .fc-day-past:hover {
            background-color: #f3f4f6 !important;
            /* Removed cursor: not-allowed to allow clicking */
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "", // Removed week and day views, only month view available
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDisplay="block"
          displayEventTime={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          height="auto"
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventMouseEnter={(info) => {
            // Allow pointer cursor for all events, including past ones
            info.el.style.cursor = 'pointer';
          }}
          eventDidMount={(info) => {
            // Add opacity to past events but keep them clickable
            if (info.event.extendedProps.isPast) {
              info.el.style.opacity = '0.6';
              info.el.style.cursor = 'pointer'; // Keep pointer cursor for past events
              // Removed pointerEvents = 'none' to allow clicking on past events
            }
          }}
          dayCellDidMount={(info) => {
            // Gray out past dates but keep them clickable
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDate = new Date(info.date);
            
            if (cellDate < today) {
              info.el.classList.add('fc-day-past');
              // Removed cursor: not-allowed to allow clicking on past events
            }
          }}
        />
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <ShiftDetailsModal
          selectedShift={selectedShift}
          onClose={() => setSelectedShift(null)}
          employees={employees}
        />
      )}
    </div>
  );
}
