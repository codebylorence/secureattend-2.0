import { useState, useEffect } from "react";
import CalendarRoleScheduleView from "../components/CalendarRoleScheduleView";
import { useSocket } from "../context/SocketContext";

export default function RoleScheduling() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time updates
    socket.on('schedule:assigned', () => {
      console.log('📡 Role assignment created - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('schedule:updated', () => {
      console.log('📡 Role assignment updated - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('schedule:deleted', () => {
      console.log('📡 Role assignment deleted - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      socket.off('schedule:assigned');
      socket.off('schedule:updated');
      socket.off('schedule:deleted');
    };
  }, [socket]);

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Role-Based Scheduling
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Click on any date to assign supervisors and warehouse admins. Manage role-based schedules with an interactive calendar.
        </p>
      </div>

      {/* Calendar Role Schedule View */}
      <CalendarRoleScheduleView key={`role-calendar-${refreshKey}`} />
    </div>
  );
}