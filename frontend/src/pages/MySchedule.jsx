import React from 'react'
import EmployeeScheduleCalendar from '../components/EmployeeScheduleCalendar'

export default function MySchedule() {
  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">My Schedule</h1>
      </div>
      
      {/* Responsive Wrapper to prevent mobile overflow */}
      <div className="w-full overflow-x-hidden sm:overflow-visible pb-6">
        <EmployeeScheduleCalendar />
      </div>
    </div>
  )
}