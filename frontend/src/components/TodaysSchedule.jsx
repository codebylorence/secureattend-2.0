import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";
import { getTodayAttendances } from "../api/AttendanceApi";

export default function TodaysSchedule() {
  const [status, setStatus] = useState("Not Clocked In");
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);

  useEffect(() => {
    fetchTodayStatus();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchTodayStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const employeeId = user.employee?.employee_id;

      if (!employeeId) return;

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

        // Check if late (after 9:00 AM)
        if (clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 0)) {
          if (!myAttendance.clock_out) {
            setStatus("Late");
          }
        }
      } else {
        setStatus("Not Clocked In");
        setClockInTime(null);
        setClockOutTime(null);
      }
    } catch (error) {
      console.error("Error fetching today's status:", error);
    }
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

  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Today's Schedule</h3>
        </div>
      </div>
      <div className="p-4 text-gray-700 space-y-2">
        <p>
          <strong>Shift Start:</strong> 9:00 AM
        </p>
        <p>
          <strong>Shift End:</strong> 6:00 PM
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
      </div>
    </div>
  );
}
