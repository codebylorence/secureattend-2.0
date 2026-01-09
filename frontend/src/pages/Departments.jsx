import { useState } from "react";
import ManageDepartment from "../components/ManageDepartment";
import DropdownZone from "../components/DropdownZone";
import AddDeptButton from "../components/AddDeptButton";

export default function Departments() {
  const [refreshKey, setRefreshKey] = useState(0);
  
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
        <h1 className="text-[#374151] text-[21px] font-semibold">
          {isSupervisor ? "Departments (View Only)" : "Departments"}
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownZone />
        </div>

        {/* Only show Add button for admin */}
        {!isSupervisor && (
          <div className="flex">
            <AddDeptButton onDepartmentAdded={handleDepartmentAdded} />
          </div>
        )}
      </div>

      <ManageDepartment key={refreshKey} supervisorView={isSupervisor} refreshTrigger={refreshKey} />
    </div>
  );
}
