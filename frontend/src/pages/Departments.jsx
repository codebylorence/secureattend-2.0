import { useState } from "react";
import ManageDepartment from "../components/ManageDepartment";
import { IoSearchOutline } from "react-icons/io5";
import AddDeptButton from "../components/AddDeptButton";

export default function Departments() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;
  const isSupervisor = userRole === "supervisor";

  const handleDepartmentAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          {isSupervisor ? "Departments (View Only)" : "Departments"}
        </h1>
      </div>

      {/* Responsive Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between my-6 gap-4">
        
        {/* Search Bar Container */}
        <div className="w-full sm:w-auto">
          {/* w-full on mobile, fixed width on larger screens */}
          <div className="flex items-center w-full sm:w-72 border border-gray-300 rounded-lg overflow-hidden shadow-sm focus-within:border-gray-400 transition-colors bg-white">
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2.5 sm:py-2 text-sm text-gray-700 focus:outline-none bg-transparent"
            />
            <button className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2.5 sm:py-2 flex items-center justify-center cursor-pointer transition-colors">
              <IoSearchOutline size={20} />
            </button>
          </div>
        </div>

        {/* Only show Add button for admin */}
        {!isSupervisor && (
          <div className="w-full sm:w-auto flex shrink-0">
            {/* Added a wrapper here to ensure the button can handle stretching on mobile if needed */}
            <div className="w-full sm:w-auto">
              <AddDeptButton onDepartmentAdded={handleDepartmentAdded} />
            </div>
          </div>
        )}
      </div>

      <ManageDepartment 
        key={refreshKey} 
        supervisorView={isSupervisor} 
        refreshTrigger={refreshKey}
        searchTerm={searchTerm}
      />
    </div>
  );
}