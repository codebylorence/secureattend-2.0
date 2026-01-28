import { useState, useEffect } from "react";
import { MdCalendarToday } from "react-icons/md";
import CalendarScheduleView from "../components/CalendarScheduleView";
import { useSocket } from "../context/SocketContext";
import { MdInfo } from "react-icons/md";

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
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <div className="flex items-center gap-3 ">
            <h1 className="text-heading text-[21px] font-semibold">
              Schedule Management
            </h1>
                      {/* <div className="relative group">
            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
              <MdInfo size={24} />
            </button>
            
            Tooltip
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="space-y-1">
                <div>• Click any date to create schedules</div>
                <div>• Click shift events to view details</div>
                <div>• Select zones or management roles</div>
                <div>• Purple cards = Role-based schedules</div>
                <div>• White cards = Zone-based schedules</div>
              </div>
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Unified Calendar View */}
      <div>
        <CalendarScheduleView key={`calendar-${refreshKey}`} />
      </div>
    </div>
  );
}
