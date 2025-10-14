import AdminMetrics from "../components/AdminMetrics";
import DropdownStatus from "../components/DropdownStatus";
import DropdownZone from "../components/DropdownZone";
import SearchBar from "../components/SearchBar";
import TodaysAttendance from "../components/TodaysAttendance";

export default function Dashboard() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">Dashboard</h1>
      </div>

      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Welcome, Admin</h2>
        <p className="mt-1 text-gray-600 font-normal">
          Sept. 18, 2025 | 8:00 AM
        </p>
      </div>
      <AdminMetrics />

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownStatus />
          <DropdownZone />
        </div>
          <SearchBar />
      </div>

      <TodaysAttendance />
    </div>
  );
}
