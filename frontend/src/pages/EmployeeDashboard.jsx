import LastAttendance from "../components/LastAttendance";
import AttendanceSummary from "../components/AttendanceSummary";
import TodaysSchedule from "../components/TodaysSchedule";


export default function EmployeeDashboard() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">Dashboard</h1>
      </div>

      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Welcome, Employee</h2>
        <p className="mt-1 text-gray-600 font-normal">
          Sept. 18, 2025 | 8:00 AM
        </p>
      </div>

      {/* Top Section (Schedule + Attendance Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TodaysSchedule />
        <AttendanceSummary />
      </div>

      <LastAttendance />
    </div>
  );
}
