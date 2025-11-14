import { useState, useEffect } from "react";
import TeamMetrics from "../components/TeamMetrics";
import DropdownStatus from "../components/DropdownStatus";
import SearchBar from "../components/SearchBar";
import TeamTodaysAttend from "../components/TeamTodaysAttend";

export default function TeamDashboard() {
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const dept = user.employee?.department || "Unknown";
    setDepartment(dept);
  }, []);

  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Team Dashboard - {department}
        </h1>
      </div>

      <TeamMetrics department={department} />

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownStatus />
        </div>
        <SearchBar />
      </div>

      <TeamTodaysAttend department={department} />
    </div>
  );
}
