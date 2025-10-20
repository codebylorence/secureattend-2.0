import { FaClock } from "react-icons/fa";

export default function TodaysSchedule() {
  return (
    <div className="bg-white rounded-md shadow">
      <div className="flex items-center justify-between bg-[#1E3A8A] text-white px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <FaClock />
          <h3 className="font-medium">Today's Schedule</h3>
        </div>
      </div>
      <div className="p-4 text-gray-700 space-y-2">
        <p>
          <strong>Briefing:</strong> 8:00 AM
        </p>
        <p>
          <strong>Shift Start:</strong> 9:00 AM
        </p>
        <p>
          <strong>Shift End:</strong> 6:00 PM
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="text-green-600 font-semibold">On Time</span>
        </p>
      </div>
    </div>
  );
}
