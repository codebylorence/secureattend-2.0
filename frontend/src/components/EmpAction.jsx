// EmpAction.jsx
import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";
import { deleteEmployee } from "../api/EmployeeApi";
import EditEmployeeModal from "./EditEmployeeModal";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";

export default function EmpAction({ id, onDeleted, employee, onUpdated }) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        console.log(`Attempting to delete employee with ID: ${id}`);
        
        // Check if the employee being deleted is a Team Leader
        const isTeamLeader = employee.position === "Team Leader";
        
        const result = await deleteEmployee(id);
        console.log("Delete result:", result);
        toast.success("Employee deleted successfully!");
        
        // If a team leader was deleted, notify team leader update
        if (isTeamLeader) {
          console.log('🔄 Team Leader deleted, notifying team leader update');
          teamLeaderEventManager.notifyTeamLeaderUpdate();
        }
        
        onDeleted();
      } catch (error) {
        console.error("Error deleting employee:", error);
        console.error("Error details:", error.response?.data || error.message);
        toast.error(`Failed to delete employee: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button 
          className={`w-7 h-7 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors ${
            employee.has_fingerprint ? 'opacity-100' : 'opacity-30'
          }`}
          title={employee.has_fingerprint ? 'Fingerprint enrolled' : 'No fingerprint enrolled'}
        >
          <FaFingerprint size={14} />
        </button>

        {/* Edit button */}
        <button
          onClick={() => setIsEditOpen(true)}
          className="w-7 h-7 rounded-md bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
          title="Edit employee"
        >
          <FaEdit size={12} />
        </button>

        <button
          onClick={handleDelete}
          className="w-7 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          title="Delete employee"
        >
          <MdDelete size={14} />
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
