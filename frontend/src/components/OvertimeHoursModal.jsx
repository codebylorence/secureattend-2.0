import { useState } from 'react';
import { toast } from 'react-toastify';

const OvertimeHoursModal = ({ isOpen, onClose, attendance, onUpdate }) => {
  const [overtimeHours, setOvertimeHours] = useState(attendance?.overtime_hours || 0);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!attendance) return;

    if (overtimeHours < 0 || overtimeHours > 24) {
      toast.error('Overtime hours must be between 0 and 24');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/attendances/overtime/hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_id: attendance.id,
          overtime_hours: parseFloat(overtimeHours)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Overtime hours updated to ${overtimeHours}h`);
        onUpdate && onUpdate(data.attendance);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update overtime hours');
      }
    } catch (error) {
      console.error('Error updating overtime hours:', error);
      toast.error('Failed to update overtime hours');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !attendance) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Update Overtime Hours</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Employee:</strong> {attendance.employee_name || attendance.employee_id}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Date:</strong> {new Date(attendance.date).toLocaleDateString()}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overtime Hours
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter overtime hours"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {attendance.overtime_hours || 0}h
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This will update the overtime hours for payroll purposes. 
              Use this feature to correct hours after the employee has clocked out.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Hours'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeHoursModal;