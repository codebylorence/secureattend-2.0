// EmpAction.jsx
import React, { useState } from "react";
import { FaEdit, FaFingerprint } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { deleteEmployee } from "../api/EmployeeApi";
import EditEmployeeModal from "./EditEmployeeModal";
import ConfirmationModal from "./ConfirmationModal";
import { toast } from 'react-toastify';
import teamLeaderEventManager from "../utils/teamLeaderEvents";

export default function EmpAction({ id, onDeleted, employee, onUpdated }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      console.log(`Attempting to delete employee with ID: ${id}`);
      
      const isTeamLeader = employee.position === "Team Leader";
      const result = await deleteEmployee(id);
      
      toast.success("Employee deleted successfully!");
      
      if (isTeamLeader) {
        teamLeaderEventManager.notifyTeamLeaderUpdate();
      }
      
      setShowDeleteModal(false);
      onDeleted();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(`Failed to delete employee: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {/* Fingerprint Status Indicator */}
        <button 
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm ${
            employee.has_fingerprint 
              ? 'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600' 
              : 'bg-gray-100 text-gray-400 opacity-50'
          }`}
          title={employee.has_fingerprint ? 'Fingerprint enrolled' : 'No fingerprint enrolled'}
        >
          <FaFingerprint size={14} />
        </button>

        {/* Edit button */}
        <button
          onClick={() => setIsEditOpen(true)}
          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-sm shadow-blue-100"
          title="Edit employee"
        >
          <FaEdit size={12} />
        </button>

        {/* Delete button */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm shadow-rose-100"
          title="Delete employee"
        >
          <MdDelete size={16} />
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

      {/* ENHANCED Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Employee"
        message="Are you sure you want to permanently remove this employee from the system? This action will delete all their attendance records and cannot be reversed."
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
        itemDetails={{
          "Full Name": `${employee.firstname || ''} ${employee.lastname || ''}`.trim() || employee.fullname || 'Unknown',
          "ID Number": employee.employee_id || 'N/A',
          "Position": employee.position || 'N/A',
          "Department": employee.department || 'N/A'
        }}
      />
    </>
  );
}