import { useState } from "react";
import AssignSched from "../components/AssignSched";
import WeeklyTemplateView from "../components/WeeklyTemplateView";

export default function ManageSchedule() {
  const [selectedView, setSelectedView] = useState("weekly");

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
            📅 Weekly Schedule
          </button>
          <button
            onClick={() => setSelectedView("assign")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === "assign"
                ? "bg-[#1E3A8A] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            👥 Assign to Employees
          </button>
        </div>
      </div>

      {/* Conditional Rendering */}
      {selectedView === "weekly" && <WeeklyTemplateView />}
      {selectedView === "assign" && <AssignSched />}
    </div>
  );
}
