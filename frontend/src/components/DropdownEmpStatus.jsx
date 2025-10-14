import React from "react";

export default function DropdownEmpStatus() {
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700">
      <select
        className="bg-transparent focus:outline-none appearance-none pr-6"
        defaultValue="Zone A"
      >
        <option>Active</option>
        <option>Inactive</option>
      </select>

      {/* Down arrow icon */}
      <svg
        className="w-4 h-4 ml-[-20px] text-gray-500 pointer-events-none"
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
  );
}
