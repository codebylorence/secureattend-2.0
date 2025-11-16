import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { getSchedulesByEmployeeId, getDepartmentTemplates } from "../api/ScheduleApi";

const EmployeeScheduleCalendar = () => {
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = user.employee?.employee_id || "";
  const userRole = user.employee?.role || "";
  const userDepartment = user.employee?.department || "";

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeSchedules();
    }
  }, [employeeId]);

  const fetchEmployeeSchedules = async () => {
    try {
      // Fetch individual schedules for all users (including team leaders)
      const individualSchedules = await getSchedulesByEmployeeId(employeeId);
      
      // If user is a team leader, also fetch department templates
      if (userRole === "teamleader" && userDepartment) {
        const templates = await getDepartmentTemplates(userDepartment);
        // Combine both: individual schedules + department templates
        const combinedData = [...individualSchedules, ...templates];
        setSchedules(combinedData);
        generateCalendarEvents(combinedData);
      } else {
        // For regular employees, just show their assigned schedules
        setSchedules(individualSchedules);
        generateCalendarEvents(individualSchedules);
      }
    } catch (error) {
      console.error("Error fetching employee schedules:", error);
    }
  };

  const generateCalendarEvents = (scheduleData) => {
    const calendarEvents = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Generate events for only 1 week (7 days) starting from today
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);
    
    // Get day name array
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Loop through each day in the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      
      const dayName = dayNames[date.getDay()];
      
      // Check if employee has a schedule for this day
      scheduleData.forEach((schedule) => {
        if (schedule.days.includes(dayName)) {
          // Format date as YYYY-MM-DD in local time
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // Convert 12-hour time to 24-hour format for calendar
          const startTime = convertTo24Hour(schedule.start_time);
          const endTime = convertTo24Hour(schedule.end_time);
          
          calendarEvents.push({
            title: `${schedule.shift_name}`,
            start: `${dateStr}T${startTime}`,
            end: `${dateStr}T${endTime}`,
            backgroundColor: getShiftColor(schedule.shift_name),
            borderColor: getShiftColor(schedule.shift_name),
            textColor: "white",
            extendedProps: {
              shiftName: schedule.shift_name,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
              department: schedule.department
            }
          });
        }
      });
    }
    
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {schedules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {userRole === "teamleader" 
              ? "No schedule templates created for your department yet. Contact admin."
              : "No schedules assigned yet. Contact your team leader."}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {userRole === "teamleader" 
                ? "Your Schedule & Department Templates"
                : "Your Assigned Schedules"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {schedules.map((schedule, index) => (
                <div key={index} className={`rounded-md px-3 py-2 text-sm ${
                  schedule.is_template 
                    ? "bg-blue-100 border border-blue-300" 
                    : "bg-green-100 border border-green-300"
                }`}>
                  {schedule.is_template && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded mr-2">
                      Template
                    </span>
                  )}
                  {!schedule.is_template && (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded mr-2">
                      Your Shift
                    </span>
                  )}
                  <span className="font-medium">{schedule.shift_name}</span>
                  <span className="text-gray-600 ml-2">
                    {schedule.start_time} - {schedule.end_time}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({schedule.days.join(', ')})
                  </span>
                  {schedule.day_limits && (
                    <span className="text-blue-600 ml-2 text-xs">
                      [Limits: {Object.entries(schedule.day_limits).map(([day, limit]) => `${day.substring(0, 3)}(${limit})`).join(', ')}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            events={events}
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            height="auto"
          />
        </>
      )}
    </div>
  );
};

export default EmployeeScheduleCalendar;
