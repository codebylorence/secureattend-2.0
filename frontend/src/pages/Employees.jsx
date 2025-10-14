import React from "react";
import DropdownStatus from "../components/DropdownStatus";
import DropdownZone from "../components/DropdownZone";
import SearchBar from "../components/SearchBar";
import DropdownEmpStatus from "../components/DropdownEmpStatus";
import AddEmpButton from "../components/AddEmpButton";
import EmployeeList from "../components/EmployeeList";

export default function Employees() {
  return (
    <div className="pr-10 bg-gray-50">
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Manage Employees
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownZone />
          <DropdownEmpStatus />
          <SearchBar />
        </div>
        <div className="flex">
          <AddEmpButton />
        </div>
      </div>

      <EmployeeList />
    </div>
  );
}
