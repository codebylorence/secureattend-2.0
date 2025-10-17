import React, { useState, useRef } from "react";
import DropdownZone from "../components/DropdownZone";
import DropdownEmpStatus from "../components/DropdownEmpStatus";
import SearchBar from "../components/SearchBar";
import AddEmpButton from "../components/AddEmpButton";
import EmployeeList from "../components/EmployeeList";
import AddEmployeeModal from "../components/AddEmployeeModal";

export default function Employees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const employeeListRef = useRef(null);

  const handleEmployeeAdded = () => {
    // Call the reload function from EmployeeList after adding
    if (employeeListRef.current) {
      employeeListRef.current.loadEmployees();
    }
  };

  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Manage Employees
        </h1>
      </div>

      {/* Filters and Add Button */}
      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownZone />
          <DropdownEmpStatus />
          <SearchBar />
        </div>

        <div className="flex">
          <AddEmpButton onClick={() => setIsModalOpen(true)} />
        </div>
      </div>

      {/* Employee Table */}
      <EmployeeList ref={employeeListRef} />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={handleEmployeeAdded}
      />
    </div>
  );
}
