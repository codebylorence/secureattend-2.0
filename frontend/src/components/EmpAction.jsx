import React from "react";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";
import { deleteEmployee } from "../api/EmployeeApi";

export default function EmpAction({ id, onDeleted }) {
  // ✅ Handle delete click
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this employee?");
    if (!confirmDelete) return;

    try {
      await deleteEmployee(id);
      alert("Employee deleted successfully!");
      if (onDeleted) onDeleted(); // refresh employee list
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee.");
    }
  };

  return (
    <div className="flex gap-2">
      {/* Fingerprint (future enrollment feature) */}
      <button className="bg-[#51A451] w-[35px] h-[35px] flex items-center justify-center rounded">
        <FaFingerprint color="white" size="25" />
      </button>

      {/* Edit */}
      <button className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded">
        <FaEdit color="white" size="25" />
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700 transition"
      >
        <MdDelete color="white" size="25" />
      </button>
    </div>
  );
}
