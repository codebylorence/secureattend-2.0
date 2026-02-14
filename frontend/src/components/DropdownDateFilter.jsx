import React from "react";

export default function DropdownDateFilter() {
  return (
    <div className="relative inline-block w-full sm:w-auto font-sans">
      <select
        className="w-full sm:w-auto appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2.5 pr-10 hover:border-blue-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 cursor-pointer shadow-sm"
        defaultValue="Week"
      >
        <option value="Week">Week</option>
        <option value="Month">Month</option>
      </select>

      {/* Down arrow icon properly contained and vertically centered */}
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
        <svg
          className="w-4 h-4 transition-transform duration-200"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}