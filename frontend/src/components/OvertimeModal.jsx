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
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/attendances/overtime/eligible`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received overtime eligible employees:', data);
        console.log('📊 Number of eligible employees:', data.length);
        setEmployees(data);
        
        if (data.length === 0) {
          console.log('ℹ️ No eligible employees found');
          toast.info('No employees are eligible for overtime. Employees must have clocked in today.', {
            autoClose: 6000
          });
        }
      } else {
        console.error('❌ Failed to fetch eligible employees:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        toast.error('No available employees. Employees must be scheduled today and have clocked in.', {
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('❌ Error fetching eligible employees:', error);
      toast.error('No available employees. Please check if employees are scheduled and have clocked in today.', {
        autoClose: 5000
      });
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
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/attendances/overtime/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_ids: selectedEmployees, 
          reason,
          estimated_hours: parseFloat(estimatedHours),
          assigned_by: 'Admin' 
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
          const errorMessages = results
            .filter(r => !r.success)
            .map(r => `${r.employee_id}: ${r.error}`)
            .join('\n');
          
          toast.error(`Failed to assign overtime to ${summary.errors} employee(s):\n${errorMessages}`, {
            autoClose: 8000 
          });
        }

        if (summary.errors === 0) {
          setSelectedEmployees([]);
          setReason('Production Rush');
          setEstimatedHours('2.0');
          setSearchTerm('');
          onClose();
          
          setTimeout(() => {
            window.location.reload();
          }, 500); 
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

  // UI Helper: Get initials for the employee avatar
  const getInitials = (first, last) => {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'ID';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Sticky) */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Assign Overtime</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          
          {/* Overtime Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Overtime
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
                required
              />
            </div>
          </div>

          {/* Employee Selection */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold text-gray-800">Select Employees</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {selectedEmployees.length} of {filteredEmployees.length} selected
              </span>
            </div>

            {/* Search and Select All */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
              <div className="relative flex-1 w-full">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="w-full sm:w-auto px-5 py-3 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              >
                {selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Employee List Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center">
                    {employees.length === 0 ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-900 font-semibold mb-1">No eligible employees</p>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                          Employees must have clocked in today (Present/Late) and not already have overtime assigned.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 font-medium">No employees match your search.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredEmployees.map((employee) => (
                      <div
                        key={employee.employee_id}
                        className="flex items-center p-4 hover:bg-purple-50/50 cursor-pointer transition-colors"
                        onClick={() => handleEmployeeToggle(employee.employee_id)}
                      >
                        <div className="flex-shrink-0 mr-4">
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${selectedEmployees.includes(employee.employee_id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}>
                            {selectedEmployees.includes(employee.employee_id) && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 mr-4 hidden sm:flex">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                            {getInitials(employee.firstname, employee.lastname)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <div>
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {`${employee.firstname || ''} ${employee.lastname || ''}`.trim() || employee.employee_id}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ID: {employee.employee_id} • {employee.department || 'N/A'}
                              </p>
                            </div>
                            <div className="mt-1 sm:mt-0">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {employee.position || 'N/A'}
                              </span>
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
        </div>

        {/* Footer (Sticky) */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-sm font-medium text-gray-500 w-full sm:w-auto text-center sm:text-left">
            {selectedEmployees.length > 0 ? (
              <span className="text-purple-600">
                {selectedEmployees.length} selected for {estimatedHours}h
              </span>
            ) : "No employees selected"}
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignOvertime}
              disabled={loading || selectedEmployees.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-sm flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assigning...
                </span>
              ) : (
                `Assign Overtime`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OvertimeModal;