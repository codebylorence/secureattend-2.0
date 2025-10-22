import React from "react";
import ManageDepartment from "../components/ManageDepartment";
import DropdownZone from "../components/DropdownZone";
import AddDeptButton from "../components/AddDeptButton";

export default function Departments() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Departments
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownZone />
        </div>

        <div className="flex">
          <AddDeptButton />
        </div>
      </div>

      <ManageDepartment />
    </div>
  );
}
