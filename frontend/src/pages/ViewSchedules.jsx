import { useState, useEffect } from "react";
import { MdSchedule, MdPeople, MdClose } from "react-icons/md";
import { getEmployeeSchedules, getPublishedTemplates } from "../api/ScheduleApi";
import { fetchEmployees } from "../api/EmployeeApi";

export default function ViewSchedules() {
  const [templates, setTemplates] = useState([]);
  const [employeeSchedules, setEmployeeSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesData, schedulesData, employeesData] = await Promise.all([
        getPublishedTemplates(), // Use the new endpoint that only returns published templates
        getEmployeeSchedules(),
        fetchEmployees()
      ]);
      
      // No need to filter anymore - backend already returns only published templates
      setTemplates(templatesData);
      setEmployeeSchedules(schedulesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.fullname : employeeId;
  };

  const getEmployeePosition = (employeeId) => {
    const employee = employees.find((emp) => emp.employee_id === employeeId);
    return employee ? employee.position : "";
  };

  const getAssignedBy = (assignedById) => {
    if (!assignedById) return "Admin";
    const assigner = employees.find((emp) => emp.employee_id === assignedById);
    return assigner ? assigner.fullname : assignedById;
  };

  // Get next 7 days starting from today
  const getNext7Days = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      next7Days.push(date);
    }
    return next7Days;
  };

  const next7Days = getNext7Days();
  
  // Get day names for the next 7 days
  const getDayNames = () => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return next7Days.map(date => dayNames[date.getDay()]);
  };
  
  const displayDays = getDayNames();

  // Organize schedules by day and shift
  const organizeSchedulesByDay = () => {
    const organized = {};

    displayDays.forEach((day, index) => {
      organized[day] = {
        date: next7Days[index],
        shifts: {}
      };
    });

    // Group templates by day and shift
    templates.forEach(template => {
      template.days.forEach(day => {
        if (!organized[day].shifts[template.shift_name]) {
          organized[day].shifts[template.shift_name] = {
            shift_name: template.shift_name,
            start_time: template.start_time,
            end_time: template.end_time,
            zones: []
          };
        }

        // Get assigned members for this zone on this day
        const assignedMembers = employeeSchedules.filter(schedule =>
          schedule.template.department === template.department &&
          schedule.template.shift_name === template.shift_name &&
          schedule.days.includes(day)
        );

        organized[day].shifts[template.shift_name].zones.push({
          department: template.department,
          template_id: template.id,
          member_limit: template.day_limits?.[day] || template.member_limit,
          assigned_count: assignedMembers.length,
          members: assignedMembers
        });
      });
    });

    return organized;
  };

  const schedulesByDay = organizeSchedulesByDay();

  const handleZoneClick = (day, zone, shift) => {
    setSelectedDay(day);
    setSelectedZone({ ...zone, shift });
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">View Assigned Schedules</h1>
        <p className="text-sm text-gray-600 mt-1">
          Weekly overview of all zone assignments and team members
        </p>
      </div>

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
          <MdSchedule /> Weekly Schedule Overview
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {displayDays.map((day, index) => {
            const dayData = schedulesByDay[day];
            const date = dayData.date;
            const isToday = index === 0; // First day is always today

            return (
              <div
                key={day}
                className={`border-2 rounded-lg overflow-hidden ${
                  isToday ? 'border-blue-500' : 'border-gray-300'
                }`}
              >
                {/* Day Header */}
                <div className={`p-3 text-center ${
                  isToday ? 'bg-blue-600' : 'bg-[#1E3A8A]'
                } text-white`}>
                  <p className="font-semibold">{day}</p>
                  <p className="text-xs opacity-90">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Shifts and Zones */}
                <div className="p-3 space-y-3 min-h-[400px] bg-gray-50">
                  {Object.keys(dayData.shifts).length === 0 ? (
                    <p className="text-gray-400 text-xs text-center mt-8">No schedules</p>
                  ) : (
                    Object.values(dayData.shifts).map((shift, shiftIdx) => (
                      <div key={shiftIdx} className="space-y-2">
                        {/* Shift Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-2 py-1 rounded text-xs">
                          <p className="font-semibold">{shift.shift_name}</p>
                          <p className="text-xs opacity-90">
                            {shift.start_time} - {shift.end_time}
                          </p>
                        </div>

                        {/* Zones */}
                        <div className="space-y-1">
                          {shift.zones.map((zone, zoneIdx) => (
                            <button
                              key={zoneIdx}
                              onClick={() => handleZoneClick(day, zone, shift)}
                              className="w-full bg-white border border-purple-200 rounded p-2 hover:shadow-md hover:border-purple-400 transition-all text-left"
                            >
                              <p className="font-semibold text-xs text-purple-900">
                                {zone.department}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                  <MdPeople size={12} />
                                  {zone.assigned_count}/{zone.member_limit || '∞'}
                                </span>
                                {zone.assigned_count > 0 && (
                                  <span className="text-xs text-green-600 font-medium">
                                    Click to view
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Members Modal */}
      {selectedZone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1E3A8A]">
                  {selectedZone.department} - {selectedDay}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedZone.shift.shift_name} ({selectedZone.shift.start_time} - {selectedZone.shift.end_time})
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedZone(null);
                  setSelectedDay(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Assigned:</strong> {selectedZone.assigned_count} / {selectedZone.member_limit || '∞'} members
              </p>
            </div>

            {selectedZone.members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No team members assigned to this zone yet.
              </p>
            ) : (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Assigned Team Members:</h4>
                {selectedZone.members.map((schedule, idx) => {
                  const position = getEmployeePosition(schedule.employee_id);
                  const isTeamLeader = position === "Team Leader";
                  const isSupervisor = position === "Supervisor";

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800">
                              {getEmployeeName(schedule.employee_id)}
                            </p>
                            {isSupervisor && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                                Supervisor
                              </span>
                            )}
                            {isTeamLeader && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                Team Leader
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            ID: {schedule.employee_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Position: {position || 'Employee'}
                          </p>
                          {schedule.assigned_by && (
                            <p className="text-xs text-purple-600 mt-1">
                              Assigned by: {getAssignedBy(schedule.assigned_by)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            Days: {schedule.days.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
