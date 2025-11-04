import {MdEditCalendar} from "react-icons/md";
export default function AssignSched() {
  return (
    <div className="bg-[#F3F4F6] rounded-lg shadow-md p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1E3A8A] mb-4">
        <MdEditCalendar /> Assign Schedule
      </h2>
      <p className="text-gray-600 text-sm mb-3">
        Assign templates to employees (backend integration coming soon).
      </p>
    </div>
  );
}
