import React from "react";
import TeamMetrics from "../components/TeamMetrics";
import DropdownStatus from "../components/DropdownStatus";
import SearchBar from "../components/SearchBar";
import TeamTodaysAttend from "../components/TeamTodaysAttend";

export default function TeamDashboard() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Team Dashboard - Zone A
        </h1>
      </div>

      <TeamMetrics />

      <div className="flex justify-between my-6">
        <div className="flex items-center gap-4">
          <p className="text-[#374151] mr-5">Filter :</p>
          <DropdownStatus />
        </div>
        <SearchBar />
      </div>

      <TeamTodaysAttend />
    </div>
  );
}
