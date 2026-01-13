import { useState, useEffect } from "react";
import WeeklyTemplateView from "../components/WeeklyTemplateView";
import { useSocket } from "../context/SocketContext";

export default function ManageSchedule() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;
  const isSupervisor = userRole === "supervisor";

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time updates
    socket.on('template:created', () => {
      console.log('📡 Template created - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('template:updated', () => {
      console.log('📡 Template updated - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('template:deleted', () => {
      console.log('📡 Template deleted - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('schedules:published', () => {
      console.log('📡 Schedules published - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('draft:created', () => {
      console.log('📡 Draft created - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('drafts:published', () => {
      console.log('📡 Drafts published - refreshing...');
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      socket.off('template:created');
      socket.off('template:updated');
      socket.off('template:deleted');
      socket.off('schedules:published');
      socket.off('draft:created');
      socket.off('drafts:published');
    };
  }, [socket]);

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          Manage Schedule
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Click on any day to add zones and create schedules. Assign supervisors to shifts.
        </p>
      </div>

      {/* Weekly Schedule View */}
      <WeeklyTemplateView key={`weekly-${refreshKey}`} />
    </div>
  );
}
