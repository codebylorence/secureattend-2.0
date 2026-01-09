import React, { useState, useEffect } from "react";
import { fetchDepartments } from "../api/DepartmentApi";

export default function DropdownZone() {
  const [departments, setDepartments] = useState([]);
  const [selectedZone, setSelectedZone] = useState("All Zone");

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        // Check if user is authenticated before making the request
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🏢 DropdownZone: No token found, skipping department fetch');
          return;
        }
        
        const data = await fetchDepartments();
        setDepartments(data);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    loadDepartments();
  }, []);

  return (
    <div className="inline-flex items-center border border-gray-300 rounded-md px-3 py-2 bg-white text-sm text-gray-700">
      <select
        className="bg-transparent focus:outline-none appearance-none pr-6"
        value={selectedZone}
        onChange={(e) => setSelectedZone(e.target.value)}
      >
        <option value="All Zone">All Zone</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.name}>
            {dept.name}
          </option>
        ))}
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
