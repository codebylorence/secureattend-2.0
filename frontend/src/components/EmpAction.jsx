import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";

export default function EmpAction() {
  return (
    <div className="flex gap-2">
      <button className="bg-[#51A451] w-[35px] h-[35px] flex items-center justify-center rounded">
        <FaFingerprint color="white" size="25" />
      </button>
      <button className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded">
        <FaEdit color="white" size="25" />
      </button>
      <button className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded">
        <MdDelete color="white" size="25" />
      </button>
    </div>
  );
}
