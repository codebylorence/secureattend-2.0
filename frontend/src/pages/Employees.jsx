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

      {/* Filters and Add Button */}
      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-heading mr-5">Filter :</p>
          <DropdownZone value={zoneFilter} onChange={setZoneFilter} />
          <DropdownEmpStatus value={statusFilter} onChange={setStatusFilter} />
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>

        {/* Only show Add button for admin */}
        {!isSupervisor && (
          <div className="flex">
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