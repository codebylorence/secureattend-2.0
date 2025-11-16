import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";
import { getTodayAttendances } from "../api/AttendanceApi";
import { getEmployeeSchedules } from "../api/ScheduleApi";

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
      const schedules = await getEmployeeSchedules(employeeId);
      const currentDay = getCurrentDay();
      
      // Find schedule for today
      const todaySchedule = schedules.find(s => s.days.includes(currentDay));
      setSchedule(todaySchedule);

      // Fetch attendance status
      const todayAttendances = await getTodayAttendances();
      const myAttendance = todayAttendances.find(att => att.employee_id === employeeId);

      if (myAttendance) {
        const clockIn = new Date(myAttendance.clock_in);
        setClockInTime(clockIn);

        if (myAttendance.clock_out) {
          setClockOutTime(new Date(myAttendance.clock_out));
          setStatus("Completed");
        } else {
          setStatus("Clocked In");
        }

        // Check if late based on schedule
        if (todaySchedule) {
          const [startHour, startMinute] = parseTime(todaySchedule.start_time);
          const clockInHour = clockIn.getHours();
          const clockInMinute = clockIn.getMinutes();
          
          if (clockInHour > startHour || (clockInHour === startHour && clockInMinute > startMinute)) {
            if (!myAttendance.clock_out) {
              setStatus("Late");
            }
          }
        }
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
    if (status === "Completed") return "text-green-600";
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
