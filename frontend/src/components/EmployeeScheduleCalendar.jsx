import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { MdCalendarToday, MdTableChart } from "react-icons/md";
import { getEmployeeScheduleById } from "../api/ScheduleApi";

const EmployeeScheduleCalendar = () => {
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "table"
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = user.employee?.employee_id || "";
  const userRole = user.role || "";
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeSchedules();
    }
  }, [employeeId]);

  const fetchEmployeeSchedules = async () => {
    try {
      // Fetch employee schedules (includes template data via join)
      const employeeSchedules = await getEmployeeScheduleById(employeeId);
      
      // Show all assigned schedules - they will be filtered dynamically in generateCalendarEvents
      // This allows for recurring schedules that continue to update as weeks progress
      setSchedules(employeeSchedules);
      generateCalendarEvents(employeeSchedules);
    } catch (error) {
      console.error("Error fetching employee schedules:", error);
    }
  };

  const generateCalendarEvents = (scheduleData) => {
    const calendarEvents = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    scheduleData.forEach((schedule) => {
      // Handle template-based schedules with specific dates
      if (schedule.specific_date) {
        const startTime = convertTo24Hour(schedule.start_time);
        const endTime = convertTo24Hour(schedule.end_time);
        
        calendarEvents.push({
          title: schedule.shift_name,
          start: `${schedule.specific_date}T${startTime}`,
          end: `${schedule.specific_date}T${endTime}`,
          backgroundColor: getShiftColor(schedule.shift_name),
          borderColor: getShiftColor(schedule.shift_name),
          textColor: "white",
          extendedProps: {
            shiftName: schedule.shift_name,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            department: schedule.department,
            specificDate: schedule.specific_date,
            isSpecificDate: true
          }
        });
        return;
      }
      
      // Handle legacy template-based schedules
      if (schedule.template) {
        const template = schedule.template;
        
        // Check if this is a specific date schedule from template
        if (template.specific_date) {
          const startTime = convertTo24Hour(template.start_time);
          const endTime = convertTo24Hour(template.end_time);
          
          calendarEvents.push({
            title: template.shift_name,
            start: `${template.specific_date}T${startTime}`,
            end: `${template.specific_date}T${endTime}`,
            backgroundColor: getShiftColor(template.shift_name),
            borderColor: getShiftColor(template.shift_name),
            textColor: "white",
            extendedProps: {
              shiftName: template.shift_name,
              startTime: template.start_time,
              endTime: template.end_time,
              department: template.department,
              specificDate: template.specific_date,
              isSpecificDate: true
            }
          });
          return;
        }
        
        // Fallback for legacy day-based schedules (show next 7 days only for recurring schedules)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
          const date = new Date(today);
          date.setDate(today.getDate() + dayOffset);
          
          const dayName = dayNames[date.getDay()];
          
          if (schedule.days && schedule.days.includes(dayName)) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const startTime = convertTo24Hour(template.start_time);
            const endTime = convertTo24Hour(template.end_time);
            
            calendarEvents.push({
              title: template.shift_name,
              start: `${dateStr}T${startTime}`,
              end: `${dateStr}T${endTime}`,
              backgroundColor: getShiftColor(template.shift_name),
              borderColor: getShiftColor(template.shift_name),
              textColor: "white",
              extendedProps: {
                shiftName: template.shift_name,
                startTime: template.start_time,
                endTime: template.end_time,
                department: template.department,
                dayName: dayName,
                isLegacy: true
              }
            });
          }
        }
      }
    });
    
    setEvents(calendarEvents);
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

  // Generate table data from all events (excluding past schedules)
  const getTableData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Group events by date, excluding past dates
    const eventsByDate = {};
    
    events.forEach(event => {
      const dateStr = event.start.split('T')[0]; // Extract YYYY-MM-DD
      const eventDate = new Date(dateStr);
      eventDate.setHours(0, 0, 0, 0);
      
      // Skip past dates
      if (eventDate < today) {
        return;
      }
      
      if (!eventsByDate[dateStr]) {
        const date = new Date(dateStr);
        eventsByDate[dateStr] = {
          date: dateStr,
          dateObj: date,
          dayName: dayNames[date.getDay()],
          displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          events: []
        };
      }
      
      eventsByDate[dateStr].events.push(event);
    });
    
    // Convert to array and sort by date (oldest to newest)
    const tableData = Object.values(eventsByDate).sort((a, b) => 
      a.dateObj.getTime() - b.dateObj.getTime()
    );
    
    return tableData;
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 font-sans w-full">
      {schedules.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-gray-500 font-medium">
            No schedules assigned yet. Contact your team leader.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Controls Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight self-start sm:self-center">
              Calendar Schedule
            </h2>
            
            {/* View Toggle Button */}
            <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 w-full sm:w-auto overflow-hidden">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === "calendar"
                    ? "bg-white text-blue-600 shadow-sm font-semibold"
                    : "text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-200/50"
                }`}
              >
                <MdCalendarToday size={18} />
                <span className="text-sm">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-sm font-semibold"
                    : "text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-200/50"
                }`}
              >
                <MdTableChart size={18} />
                <span className="text-sm">Table</span>
              </button>
            </div>
          </div>
          
          {/* Calendar View */}
          {viewMode === "calendar" && (
            <div className="w-full overflow-x-auto custom-scrollbar pb-2">
              <style>
                {`
                  .fc-day-past {
                    background-color: #f3f4f6 !important;
                    opacity: 0.6;
                  }
                  .fc-day-past .fc-daygrid-day-number {
                    color: #9ca3af !important;
                  }
                `}
              </style>
              <div className="min-w-[700px]">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "", // Removed week view, only month view available
                  }}
                  events={events}
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
                  contentHeight="auto"
                  dayCellClassNames={(arg) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const cellDate = new Date(arg.date);
                    cellDate.setHours(0, 0, 0, 0);
                    
                    return cellDate < today ? 'fc-day-past' : '';
                  }}
                />
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Day
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Shift
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Department
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {getTableData().map((row, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">
                        {row.displayDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {row.dayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {row.events.map((event, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider shadow-sm w-max"
                                style={{ backgroundColor: event.backgroundColor }}
                              >
                                {event.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No shift scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {row.events.map((event, idx) => (
                              <span key={idx} className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-max text-xs">
                                {event.extendedProps.startTime} - {event.extendedProps.endTime}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {row.events.map((event, idx) => (
                              <span key={idx} className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                {event.extendedProps.department}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeScheduleCalendar;