import LastAttendance from "../components/LastAttendance";
import AttendanceSummary from "../components/AttendanceSummary";
import TodaysSchedule from "../components/TodaysSchedule";
import WelcomeSection from "../components/WelcomeSection";

export default function SupervisorDashboard() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">Dashboard</h1>
      </div>

      <WelcomeSection />

      {/* Top Section (Schedule + Attendance Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TodaysSchedule />
        <AttendanceSummary />
      </div>

      <LastAttendance />
    </div>
  );
}