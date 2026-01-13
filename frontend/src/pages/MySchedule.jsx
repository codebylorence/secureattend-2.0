import React from 'react'
import EmployeeScheduleCalendar from '../components/EmployeeScheduleCalendar'


export default function MySchedule() {
  
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">My Schedule</h1>
      </div>
      <EmployeeScheduleCalendar />
    </div>
  )
}
