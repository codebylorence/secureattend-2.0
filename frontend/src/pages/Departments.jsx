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
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          {isSupervisor ? "Departments (View Only)" : "Departments"}
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="flex items-center w-64 border border-gray-300 rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none"
            />
            <button className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 flex items-center justify-center cursor-pointer">
              <IoSearchOutline size="25"/>
            </button>
          </div>
        </div>

        {/* Only show Add button for admin */}
        {!isSupervisor && (
          <div className="flex">
            <AddDeptButton onDepartmentAdded={handleDepartmentAdded} />
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
