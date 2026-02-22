import React, { useState, useRef } from "react";
import DropdownZone from "../components/DropdownZone";
import DropdownEmpStatus from "../components/DropdownEmpStatus";
import SearchBar from "../components/SearchBar";
import AddEmpButton from "../components/AddEmpButton";
import EmployeeList from "../components/EmployeeList";
import AddEmployeeModal from "../components/AddEmployeeModal";

export default function Employees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("All Zone");
  const [statusFilter, setStatusFilter] = useState("All Employees");
  const [searchTerm, setSearchTerm] = useState("");
  const employeeListRef = useRef(null);
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role;
  const isSupervisor = userRole === "supervisor";

  const handleEmployeeAdded = () => {
    // Call the reload function from EmployeeList after adding
    if (employeeListRef.current) {
      employeeListRef.current.loadEmployees();
    }
  };

  return (
      <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          {isSupervisor ? "Employees" : "Manage Employees"}
        </h1>
      </div>

      {/* Responsive Filters and Add Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between my-6 gap-4">
        
        {/* Filters & Search Group */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-1">
          {/* Hide label on mobile to save space */}
          <p className="text-heading mr-2 font-medium whitespace-nowrap hidden sm:block">
            Filter :
          </p>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            {/* Wrappers added around custom components. 
              w-full makes them stretch on mobile, sm:w-auto shrinks them to fit on larger screens.
            */}
            <div className="w-full sm:w-auto">
              <DropdownZone value={zoneFilter} onChange={setZoneFilter} />
            </div>
            
            <div className="w-full sm:w-auto">
              <DropdownEmpStatus value={statusFilter} onChange={setStatusFilter} />
            </div>
            
            <div className="w-full sm:w-auto flex-1">
              <SearchBar value={searchTerm} onChange={setSearchTerm} />
            </div>
          </div>
        </div>

        {/* Add Employee Button */}
        {!isSupervisor && (
          <div className="w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
            {/* Wrapped to ensure it handles full-width properly on mobile if the button supports it */}
            <AddEmpButton onClick={() => setIsModalOpen(true)} />
          </div>
        )}
      </div>

      {/* Employee Table */}
      <EmployeeList 
        ref={employeeListRef} 
        supervisorView={isSupervisor}
        zoneFilter={zoneFilter}
        statusFilter={statusFilter}
        searchTerm={searchTerm}
      />

      {/* Add Employee Modal - Only for admin */}
      {!isSupervisor && (
        <AddEmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdded={handleEmployeeAdded}
        />
      )}
    </div>
  );
}