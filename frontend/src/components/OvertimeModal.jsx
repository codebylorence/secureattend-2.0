import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const OvertimeModal = ({ isOpen, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [reason, setReason] = useState('Production Rush');
  const [estimatedHours, setEstimatedHours] = useState('2.0');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const reasons = [
    'Production Rush',
    'Project Deadline',
    'Staff Shortage',
    'Emergency Work',
    'Special Assignment',
    'Other'
  ];

  useEffect(() => {
    if (isOpen) {
      console.log('OvertimeModal opened, fetching employees...');
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      console.log('🔍 Fetching overtime eligible employees...');
      const response = await fetch('/api/attendances/overtime/eligible');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received overtime eligible employees:', data);
        console.log('📊 Number of eligible employees:', data.length);
        setEmployees(data);
        
        // Show helpful message if no employees found
        if (data.length === 0) {
          console.log('ℹ️ No eligible employees found');
          toast.info('No employees are eligible for overtime. Employees must be scheduled today and have clocked in for their regular shift.', {
            autoClose: 6000
          });
        }
      } else {
        console.error('❌ Failed to fetch eligible employees:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        toast.error('Failed to load eligible employees');
      }
    } catch (error) {
      console.error('❌ Error fetching eligible employees:', error);
      toast.error('Failed to load eligible employees');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.firstname || ''} ${emp.lastname || ''}`.trim();
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.employee_id));
    }
  };

  const handleAssignOvertime = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    if (!estimatedHours || parseFloat(estimatedHours) <= 0) {
      toast.error('Please enter valid estimated hours');
      return;
    }

    setLoading(true);
    try {
      // Send bulk overtime assignment request
      const response = await fetch('/api/attendances/overtime/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_ids: selectedEmployees, // Send all selected employees
          reason,
          estimated_hours: parseFloat(estimatedHours),
          assigned_by: 'Admin' // In a real system, get from auth context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Bulk overtime assignment result:', data);
        
        const { summary, results } = data;
        if (summary.success > 0) {
          toast.success(`Overtime assigned to ${summary.success} employee(s)`);
        }
        if (summary.errors > 0) {
          // Show detailed error messages
          const errorMessages = results
            .filter(r => !r.success)
            .map(r => `${r.employee_id}: ${r.error}`)
            .join('\n');
          
          toast.error(`Failed to assign overtime to ${summary.errors} employee(s):\n${errorMessages}`, {
            autoClose: 8000 // Longer display time for detailed errors
          });
        }

        // Reset form and close modal if all successful
        if (summary.errors === 0) {
          setSelectedEmployees([]);
          setReason('Production Rush');
          setEstimatedHours('2.0');
          setSearchTerm('');
          onClose();
          
          // Auto refresh the browser to show updated attendance records
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to ensure modal closes first
        }
      } else {
        const error = await response.json();
        console.error('Bulk overtime assignment failed:', error);
        toast.error(error.error || 'Failed to assign overtime');
      }
    } catch (error) {
      console.error('Error in bulk overtime assignment:', error);
      toast.error('Failed to assign overtime');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Assign Overtime</h2>
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
          {/* Overtime Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Overtime
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Select Employees</h3>
              <div className="text-sm text-gray-600">
                {selectedEmployees.length} of {filteredEmployees.length} selected
              </div>
            </div>

            {/* Search and Select All */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Employee List */}
            <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {employees.length === 0 ? (
                    <div>
                      <p className="font-medium">No employees eligible for overtime</p>
                      <p className="text-sm mt-1">
                        To be eligible, employees must:
                      </p>
                      <ul className="text-sm mt-2 text-left max-w-md mx-auto">
                        <li>• Be scheduled to work today</li>
                        <li>• Have clocked in for their regular shift</li>
                        <li>• Not already have overtime assigned</li>
                      </ul>
                      <p className="text-xs mt-3 text-primary-600">
                        Check the server console for detailed debugging information
                      </p>
                    </div>
                  ) : (
                    "No employees match your search"
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.employee_id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEmployeeToggle(employee.employee_id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.employee_id)}
                          onChange={() => handleEmployeeToggle(employee.employee_id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {`${employee.firstname || ''} ${employee.lastname || ''}`.trim() || employee.employee_id}
                              </p>
                              <p className="text-sm text-gray-500">
                                ID: {employee.employee_id} • {employee.department || 'N/A'}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.position || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedEmployees.length > 0 && (
              <span>
                {selectedEmployees.length} employee(s) selected for {estimatedHours}h overtime
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignOvertime}
              disabled={loading || selectedEmployees.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : `Assign Overtime (${selectedEmployees.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OvertimeModal;