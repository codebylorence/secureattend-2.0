import React from "react";

export default function AdminMetrics() {
  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 w-full">
        {/* Total Employees */}
        <div className="bg-gray-600 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">109</p>
          <p className="text-sm mt-1">Total Employees</p>
        </div>

        {/* Late */}
        <div className="bg-amber-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">1</p>
          <p className="text-sm mt-1">Late</p>
        </div>

        {/* Absent */}
        <div className="bg-red-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">0</p>
          <p className="text-sm mt-1">Absent</p>
        </div>

        {/* Present */}
        <div className="bg-emerald-500 text-white rounded-md p-8 text-center shadow">
          <p className="text-3xl font-semibold">10</p>
          <p className="text-sm mt-1">Present</p>
        </div>
      </div>
    </>
  );
}
