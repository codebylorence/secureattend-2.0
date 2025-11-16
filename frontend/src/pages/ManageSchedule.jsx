import { useState } from "react";
import AssignSched from "../components/AssignSched";
import TemplateSched from "../components/TemplateSched";

export default function ManageSchedule() {
  const [selectedView, setSelectedView] = useState("templates");

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Manage Schedule
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Create schedule templates and assign schedules to employees
        </p>
      </div>

      {/* View Selector Dropdown */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select View
        </label>
        <select
          value={selectedView}
          onChange={(e) => setSelectedView(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 bg-white"
        >
          <option value="templates">Schedule Templates</option>
          <option value="assign">Assign Schedule</option>
        </select>
      </div>

      {/* Conditional Rendering */}
      {selectedView === "templates" && <TemplateSched />}
      {selectedView === "assign" && <AssignSched />}
    </div>
  );
}
