import { useState, useEffect } from "react";
import CalendarScheduleView from "../components/CalendarScheduleView";
import { useSocket } from "../context/SocketContext";

export default function ManageSchedule() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time updates for zone scheduling
    const handleRefresh = (message) => {
      console.log(`📡 ${message} - refreshing...`);
      setRefreshKey(prev => prev + 1);
    };

    // Zone scheduling events
    socket.on('template:created', () => handleRefresh('Template created'));
    socket.on('template:updated', () => handleRefresh('Template updated'));
    socket.on('template:deleted', () => handleRefresh('Template deleted'));

    return () => {
      socket.off('template:created');
      socket.off('template:updated');
      socket.off('template:deleted');
    };
  }, [socket]);

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <div className="flex items-center gap-3 ">
            <h1 className="text-heading text-[21px] font-semibold">
              Schedule Management
            </h1>
        </div>
      </div>

      {/* Unified Calendar View */}
      <div>
        <CalendarScheduleView key={`calendar-${refreshKey}`} />
      </div>
    </div>
  );
}
