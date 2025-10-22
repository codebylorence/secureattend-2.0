import DropdownZone from "../components/DropdownZone";
import DropdownDateFilter from "../components/DropdownDateFilter";
import SearchBar from "../components/SearchBar";
import AttendRec from "../components/AttendRec";

export default function EmployeeAttendance() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Attendance Records
        </h1>
      </div>

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownZone />
          <DropdownDateFilter />
        </div>
        <SearchBar />
      </div>

      <AttendRec />
    </div>
  );
}
