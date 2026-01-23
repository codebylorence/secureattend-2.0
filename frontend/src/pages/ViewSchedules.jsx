import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { MdSchedule, MdPeople, MdClose, MdCalendarToday, MdInfo } from "react-icons/md";
import { getTemplates, getEmployeeSchedules } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";
import { useSocket } from "../context/SocketContext";
import { formatTimeRange24 } from "../utils/timeFormat";

// Helper Functions
const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Zone Details Modal Component
function ZoneDetailsModal({ selectedShift, onClose, employees }) {
  if (!selectedShift) return null;

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    if (!employee) return employeeId;
    
    if (employee.firstname && employee.lastname) {
      return `${employee.firstname} ${employee.lastname}`;
    }
    if (employee.fullname && employee.fullname.trim()) {
      return employee.fullname;
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
              <MdSchedule size={24} />
              {selectedShift.shift_name} - {selectedShift.date}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {formatTimeRange24(selectedShift.start_time, selectedShift.end_time)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            <MdClose />
          </button>
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedShift.zones.map((zone, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getShiftColor(selectedShift.shift_name) }}
                  ></div>
                  {zone.department}
                </h4>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MdPeople size={16} />
                  <span>{zone.assigned_count || 0}/{zone.member_limit || '∞'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>Shift:</strong> {selectedShift.shift_name}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Time:</strong> {formatTimeRange24(selectedShift.start_time, selectedShift.end_time)}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Member Limit:</strong> {zone.member_limit || 'Unlimited'}
                </div>
              </div>

              {/* Assigned Members */}
              {zone.members && zone.members.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Assigned Members:</h5>
                  <div className="space-y-2">
                    {zone.members.map((member, memberIdx) => {
                      const position = getEmployeePosition(member.employee_id);
                      const isTeamLeader = position === "Team Leader";
                      const isSupervisor = position === "Supervisor";

                      return (
                        <div key={memberIdx} className="bg-white border border-gray-200 rounded p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-800">
                              {getEmployeeName(member.employee_id)}
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
                          <div className="text-xs text-gray-600">
                            ID: {member.employee_id} | Position: {position || 'Employee'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!zone.members || zone.members.length === 0) && (
                <div className="mt-4 text-center py-4 text-gray-500 text-sm">
                  No members assigned yet
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedShift.zones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MdSchedule size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No zones scheduled for this shift</p>
          </div>
        )}

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
    </div>
  );
}

export default function ViewSchedules() {
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeSchedules, setEmployeeSchedules] = useState([]);
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
      
      // No more employee schedules from legacy system
      setEmployeeSchedules([]);
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
          zones: []
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
      
      // Add this template as a zone with assigned members
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
        const startTime = convertTo24Hour(shiftData.start_time);
        const endTime = convertTo24Hour(shiftData.end_time);
        const backgroundColor = getShiftColor(shiftName);
        
        // Calculate total assigned members across all zones
        const totalAssigned = shiftData.zones.reduce((sum, zone) => sum + zone.assigned_count, 0);
        
        console.log(`📅 Creating event: ${date} - ${shiftName} (${shiftData.zones.length} zones, ${totalAssigned} assigned)`);
        
        events.push({
          id: `${date}-${shiftName}`,
          title: `${shiftName} (${shiftData.zones.length} zones, ${totalAssigned} assigned)`,
          start: `${date}T${startTime}`,
          end: `${date}T${endTime}`,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          textColor: "white",
          extendedProps: {
            shiftData: shiftData,
            zoneCount: shiftData.zones.length,
            totalAssigned: totalAssigned
          }
        });
      });
    });

    console.log(`📊 Generated ${events.length} calendar events`);
    setCalendarEvents(events);
  };

  const handleEventClick = (info) => {
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
                <MdCalendarToday size={24} className="text-blue-600" />
                View Zone Schedules
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Calendar view of all zone schedules. Click on any shift to see zone details.
              </p>
            </div>
            
            {/* Guidelines Icon */}
            <div className="relative group">
              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                <MdInfo size={24} />
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="space-y-1">
                  <div>• Click on any shift to view zone details</div>
                  <div>• Different colors represent different shift types</div>
                  <div>• Numbers show zone count per shift</div>
                  <div>• View assigned members for each zone</div>
                </div>
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
              </div>
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchData();
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdSchedule size={24} className="text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Schedules</p>
              <p className="text-xl font-bold text-gray-800">{templates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdCalendarToday size={24} className="text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Unique Dates</p>
              <p className="text-xl font-bold text-gray-800">
                {new Set(templates.map(t => t.specific_date)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MdPeople size={24} className="text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-xl font-bold text-gray-800">{employees.length}</p>
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
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer';
          }}
        />
      </div>

      {/* Zone Details Modal */}
      {selectedShift && (
        <ZoneDetailsModal
          selectedShift={selectedShift}
          onClose={() => setSelectedShift(null)}
          employees={employees}
        />
      )}
    </div>
  );
}
