import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";
import { getTodayAttendances } from "../api/AttendanceApi";
import { getEmployeeScheduleById } from "../api/ScheduleApi";

export default function TodaysSchedule() {
  const [status, setStatus] = useState("Not Clocked In");
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduleAndStatus();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchScheduleAndStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getCurrentDay = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  };

  const fetchScheduleAndStatus = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) {
        setLoading(false);
        return;
      }

      // Fetch employee's schedules
      const schedules = await getEmployeeScheduleById(employeeId);
      const currentDay = getCurrentDay();
      
      // Get today's date in local timezone (not UTC)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;
      
      console.log('📅 TodaysSchedule Debug:');
      console.log('  Current Day:', currentDay);
      console.log('  Today Date:', todayDate);
      console.log('  Total Schedules:', schedules.length);
      console.log('  Raw Schedules Data:', JSON.stringify(schedules, null, 2));
      
      // Find schedule for today - check schedule_dates first, then fall back to days array
      const todaySchedule = schedules.find(s => {
        console.log('  Checking schedule ID:', s.id);
        console.log('    Days:', s.days);
        console.log('    Schedule Dates:', s.schedule_dates);
        console.log('    Template:', s.template);
        
        // Parse schedule_dates if it's a string
        let scheduleDates = s.schedule_dates;
        if (typeof scheduleDates === 'string') {
          try {
            scheduleDates = JSON.parse(scheduleDates);
          } catch (e) {
            console.log('    Failed to parse schedule_dates');
            scheduleDates = null;
          }
        }
        
        // Check if today's date is in the schedule_dates object
        if (scheduleDates && scheduleDates[currentDay]) {
          const todayScheduleDates = scheduleDates[currentDay];
          console.log('    Today Schedule Dates for', currentDay, ':', todayScheduleDates);
          const hasDate = Array.isArray(todayScheduleDates) && todayScheduleDates.includes(todayDate);
          console.log('    ✓ Has today date?', hasDate);
          if (hasDate) return true;
        }
        
        // Fallback: check if today is in the days array
        let days = s.days;
        if (typeof days === 'string') {
          try {
            days = JSON.parse(days);
          } catch (e) {
            console.log('    Failed to parse days');
            days = [];
          }
        }
        
        const inDays = days && Array.isArray(days) && days.includes(currentDay);
        console.log('    ✓ In days array?', inDays);
        return inDays;
      });
      
      console.log('  ✅ Found Schedule:', todaySchedule ? 'YES' : 'NO');
      
      // If schedule found, include template data for shift details
      if (todaySchedule) {
        if (todaySchedule.template) {
          setSchedule({
            ...todaySchedule,
            shift_name: todaySchedule.template.shift_name,
            start_time: todaySchedule.template.start_time,
            end_time: todaySchedule.template.end_time
          });
        } else {
          // If no template, try to use the schedule data directly
          setSchedule(todaySchedule);
        }
      } else {
        setSchedule(null);
      }

      // Fetch attendance status
      const todayAttendances = await getTodayAttendances();
      const myAttendance = todayAttendances.find(att => att.employee_id === employeeId);

      if (myAttendance) {
        const clockIn = new Date(myAttendance.clock_in);
        setClockInTime(clockIn);

        if (myAttendance.clock_out) {
          setClockOutTime(new Date(myAttendance.clock_out));
        }

        // Use the actual status from the database
        // Map legacy statuses to display names
        const statusMap = {
          'Present': 'Present',
          'Late': 'Late',
          'IN': 'Clocked In',
          'COMPLETED': 'Completed'
        };
        
        setStatus(statusMap[myAttendance.status] || myAttendance.status);
      } else {
        setStatus("Not Clocked In");
        setClockInTime(null);
        setClockOutTime(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching schedule and status:", error);
      setLoading(false);
    }
  };

  const parseTime = (timeStr) => {
    // Parse "9:00 AM" format to [hour, minute]
    const [time, period] = timeStr.split(" ");
    let [hour, minute] = time.split(":").map(Number);
    
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }
    
    return [hour, minute];
  };

  const formatTime = (date) => {
    if (!date) return "-";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getStatusColor = () => {
    if (status === "Present" || status === "Completed") return "text-green-600";
    if (status === "Late") return "text-amber-600";
    if (status === "Clocked In") return "text-blue-600";
    return "text-gray-600";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-md shadow">
        <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
          <div className="flex items-center gap-2">
            <FaClock />
            <h3 className="font-medium">Today's Schedule</h3>
          </div>
        </div>
        <div className="p-4 text-gray-700 text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Today's Schedule</h3>
        </div>
      </div>
      <div className="p-4 text-gray-700 space-y-2">
        {schedule ? (
          <>
            <p>
              <strong>Shift:</strong> {schedule.shift_name}
            </p>
            <p>
              <strong>Shift Start:</strong> {schedule.start_time}
            </p>
            <p>
              <strong>Shift End:</strong> {schedule.end_time}
            </p>
            <p>
              <strong>Clock In:</strong> {formatTime(clockInTime)}
            </p>
            <p>
              <strong>Clock Out:</strong> {formatTime(clockOutTime)}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={`${getStatusColor()} font-semibold`}>{status}</span>
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No schedule assigned for today ({getCurrentDay()})</p>
          </div>
        )}
      </div>
    </div>
  );
}
