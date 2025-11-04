import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

const EmployeeScheduleCalendar = () => {
    
  const shiftEvents = [
    {
      title: "Opening (8 AM - 4 PM)",
      start: "2025-11-04T08:00:00",
      end: "2025-11-04T16:00:00",
      backgroundColor: "#22c55e",
      borderColor: "#22c55e",
      textColor: "white",
    }
  ];

  return (
    
    <div className="bg-white rounded-lg shadow-md p-6">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={shiftEvents}
        eventDisplay="block"
        displayEventTime={false}
      />
      
    </div>
  );
};

export default EmployeeScheduleCalendar;
