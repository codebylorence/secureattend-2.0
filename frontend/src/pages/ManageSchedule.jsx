import { useState, useEffect } from "react";
import { MdCalendarToday, MdPeople } from "react-icons/md";
import AssignSched from "../components/AssignSched";
import AssignSchedWithDrafts from "../components/AssignSchedWithDrafts";
import WeeklyTemplateView from "../components/WeeklyTemplateView";
import { useSocket } from "../context/SocketContext";

export default function ManageSchedule() {
  const [selectedView, setSelectedView] = useState("weekly");
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();

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
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Manage Schedule
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Click on any day to add zones and create schedules
        </p>
      </div>

      {/* View Selector Tabs */}
      <div className="bg-white rounded-lg shadow-md p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView("weekly")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === "weekly"
                ? "bg-[#1E3A8A] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <MdCalendarToday className="inline mr-2" /> Weekly Schedule
          </button>
          <button
            onClick={() => setSelectedView("assign")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === "assign"
                ? "bg-[#1E3A8A] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <MdPeople className="inline mr-2" /> Assign to Employees
          </button>
        </div>
      </div>

      {/* Conditional Rendering */}
      {selectedView === "weekly" && <WeeklyTemplateView key={`weekly-${refreshKey}`} />}
      {selectedView === "assign" && <AssignSchedWithDrafts key={`assign-${refreshKey}`} />}
    </div>
  );
}
