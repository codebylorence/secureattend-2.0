import React from "react";
import EmployeeMetrics from "../components/EmployeeMetrics";
import DropdownStatus from "../components/DropdownStatus";
import DropdownZone from "../components/DropdownZone";
import DropdownDateFilter from "../components/DropdownDateFilter";
import MyAttendRec from "../components/MyAttendRec";

export default function MyAttendance() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          My Attendance
        </h1>
      </div>

      <EmployeeMetrics />

      <div className="flex my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownStatus />
          <DropdownDateFilter />
        </div>
      </div>

       <MyAttendRec />
    </div>
  );
}
