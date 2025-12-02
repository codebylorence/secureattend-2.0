// EmpAction.jsx
import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";
import { deleteEmployee } from "../api/EmployeeApi";
import EditEmployeeModal from "./EditEmployeeModal";

export default function EmpAction({ id, onDeleted, employee, onUpdated }) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteEmployee(id);
        alert("Employee deleted successfully!");
        onDeleted();
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee");
      }
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button 
          className={`bg-[#51A451] w-[35px] h-[35px] flex items-center justify-center rounded ${
            employee.has_fingerprint ? 'opacity-100' : 'opacity-30'
          }`}
          title={employee.has_fingerprint ? 'Fingerprint enrolled' : 'No fingerprint enrolled'}
        >
          <FaFingerprint color="white" size="25" />
        </button>

        {/* Edit button */}
        <button
          onClick={() => setIsEditOpen(true)}
          className="bg-[#4545AE] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-blue-700"
        >
          <FaEdit color="white" size="25" />
        </button>

        <button
          onClick={handleDelete}
          className="bg-[#DC3545] w-[35px] h-[35px] flex items-center justify-center rounded hover:bg-red-700"
        >
          <MdDelete color="white" size="25" />
        </button>
      </div>

      {/* Edit Employee Modal */}
      {isEditOpen && (
        <EditEmployeeModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          employee={employee}
          onUpdated={onUpdated}
        />
      )}
    </>
  );
}
