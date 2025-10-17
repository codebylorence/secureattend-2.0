import { FaPlus } from "react-icons/fa6";

export default function AddEmpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition cursor-pointer"
    >
      <span>Add Employee</span>
      <div className="bg-white rounded-full p-1">
        <FaPlus color="#1E3A8A" />
      </div>
    </button>
  );
}

