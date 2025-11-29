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
      
      // Show only the employee's assigned schedules (no templates)
      setSchedules(employeeSchedules);
      generateCalendarEvents(employeeSchedules);
    } catch (error) {
      console.error("Error fetching employee schedules:", error);
    }
  };

  const generateCalendarEvents = (scheduleData) => {
    const calendarEvents = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Calculate 7 days from today
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 6); // +6 because today counts as day 1
    
    // Format dates as YYYY-MM-DD for comparison
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const endYear = sevenDaysLater.getFullYear();
    const endMonth = String(sevenDaysLater.getMonth() + 1).padStart(2, '0');
    const endDay = String(sevenDaysLater.getDate()).padStart(2, '0');
    const sevenDaysStr = `${endYear}-${endMonth}-${endDay}`;
    
    scheduleData.forEach((schedule) => {
      // Skip if no template (shouldn't happen with new structure)
      if (!schedule.template) return;
      
      const template = schedule.template;
      
      // Use schedule_dates if available (new structure)
      if (schedule.schedule_dates) {
        // Iterate through each day and its dates
        Object.entries(schedule.schedule_dates).forEach(([dayName, dates]) => {
          dates.forEach(dateStr => {
            // Only show dates within the next 7 days (today to today+6)
            if (dateStr < todayStr || dateStr > sevenDaysStr) return;
            
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
                scheduleDate: dateStr
              }
            });
          });
        });
      } else {
        // Fallback: generate for next 7 days based on days array
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
          const date = new Date(today);
          date.setDate(today.getDate() + dayOffset);
          
          const dayName = dayNames[date.getDay()];
          
          if (schedule.days.includes(dayName)) {
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
                dayName: dayName
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
      'Opening Shift': '#22c55e',
      'Closing Shift': '#3b82f6',
      'Graveyard Shift': '#8b5cf6',
      'Morning Shift': '#f59e0b',
      'Afternoon Shift': '#ef4444',
      'Evening Shift': '#6366f1',
    };
    
    // Check if shift name contains any of the keywords
    for (const [key, color] of Object.entries(colors)) {
      if (shiftName.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    
    // Default color
    return '#6b7280';
  };

  // Generate table data from events
  const getTableData = () => {
    const today = new Date();
    const tableData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      
      const dayEvents = events.filter(event => event.start.startsWith(dateStr));
      
      tableData.push({
        date: dateStr,
        dayName: dayName,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        events: dayEvents
      });
    }
    
    return tableData;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {schedules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No schedules assigned yet. Contact your team leader.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Your Assigned Schedules
              </h3>
              
              {/* View Toggle Button */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "calendar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <MdCalendarToday size={18} />
                  <span className="text-sm font-medium">Calendar</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <MdTableChart size={18} />
                  <span className="text-sm font-medium">Table</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {schedules.map((schedule, index) => {
                const displayData = schedule.template;
                
                return (
                  <div key={index} className="rounded-md px-3 py-2 text-sm bg-green-100 border border-green-300">
                    <span className="font-medium">{displayData.shift_name}</span>
                    <span className="text-gray-600 ml-2">
                      {displayData.start_time} - {displayData.end_time}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({schedule.days.join(', ')})
                    </span>
                    {schedule.start_date && (
                      <span className="text-purple-600 ml-2 text-xs">
                        [{new Date(schedule.start_date).toLocaleDateString()} - {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'Ongoing'}]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Calendar View */}
          {viewMode === "calendar" && (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth",
              }}
              events={events}
              eventDisplay="block"
              displayEventTime={true}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              allDaySlot={false}
              height="auto"
            />
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Shift
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Department
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getTableData().map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.displayDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.dayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {row.events.map((event, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: event.backgroundColor }}
                              >
                                {event.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No shift</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {row.events.map((event, idx) => (
                              <span key={idx}>
                                {event.extendedProps.startTime} - {event.extendedProps.endTime}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.events.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {row.events.map((event, idx) => (
                              <span key={idx}>{event.extendedProps.department}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeScheduleCalendar;
