import AssignSched from "../components/AssignSched";
import TemplateSched from "../components/TemplateSched";
import ViewSched from "../components/ViewSched";



export default function ManageSchedule() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Manage Schedule
        </h1>
      </div>

      <TemplateSched />
      <AssignSched />
      <ViewSched />
    </div>
  )
}
