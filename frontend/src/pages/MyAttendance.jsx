import React from "react";
import EmployeeMetrics from "../components/EmployeeMetrics";
import DropdownStatus from "../components/DropdownStatus";
import DropdownDateFilter from "../components/DropdownDateFilter";
import MyAttendRec from "../components/MyAttendRec";

export default function MyAttendance() {
  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          My Attendance
        </h1>
      </div>

      <EmployeeMetrics />

      {/* Responsive Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:px-6 shadow-sm my-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-300">
        
        {/* Filter Label with Icon */}
        <div className="flex items-center gap-2 text-gray-700 mb-1 sm:mb-0">
          <svg 
            className="w-4 h-4 text-blue-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-sm font-bold uppercase tracking-wider">Filters</p>
        </div>
        
        {/* Dropdowns Container */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <DropdownStatus />
          <DropdownDateFilter />
        </div>
        
      </div>

      {/* Attendance Records Table */}
      <MyAttendRec />
    </div>
  );
}