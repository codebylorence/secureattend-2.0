import { useState, useEffect } from "react";
import { FaClock, FaCalendarAlt, FaUserCheck } from "react-icons/fa";
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



  const formatTime = (date) => {
    if (!date) return "-";
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getStatusColor = () => {
    if (status === "Present" || status === "Completed") return "text-green-700";
    if (status === "Late") return "text-amber-700";
    if (status === "Clocked In") return "text-blue-700";
    return "text-gray-700";
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
        <div className="p-4">
          <div className="text-center py-8">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <FaClock size={20} className="text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Loading Schedule</h4>
            <p className="text-xs text-gray-500">
              Please wait...
            </p>
          </div>
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
      
      <div className="p-4">
        {schedule ? (
          <div className="space-y-4">
            {/* Shift Information */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <FaCalendarAlt className="text-blue-700" size={14} />
                <h4 className="text-sm font-semibold text-blue-900">Shift Details</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Shift</span>
                  <span className="text-sm font-semibold text-blue-800">{schedule.shift_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Start</span>
                  <span className="text-sm font-semibold text-blue-800">{schedule.start_time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">End</span>
                  <span className="text-sm font-semibold text-blue-800">{schedule.end_time}</span>
                </div>
              </div>
            </div>

            {/* Attendance Status */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <FaUserCheck className="text-gray-700" size={14} />
                <h4 className="text-sm font-semibold text-gray-900">Attendance</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Clock In</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {clockInTime ? formatTime(clockInTime) : (
                      <span className="text-gray-400 italic text-xs">Not clocked in</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Clock Out</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {clockOutTime ? formatTime(clockOutTime) : (
                      <span className="text-gray-400 italic text-xs">Not clocked out</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Status</span>
                  <span className={`${getStatusColor()} font-bold text-sm px-2 py-1 rounded-full bg-white border ${
                    status === "Present" || status === "Completed" ? "border-green-200" :
                    status === "Late" ? "border-amber-200" :
                    status === "Clocked In" ? "border-blue-200" : "border-gray-200"
                  }`}>
                    {status}
                  </span>
                </div>
              </div>
            </div>

            {/* Today's Date */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <FaClock size={20} className="text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">No Schedule Today</h4>
            <p className="text-xs text-gray-500 mb-1">
              No schedule assigned for today
            </p>
            <p className="text-xs text-gray-400">
              {getCurrentDay()}, {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
