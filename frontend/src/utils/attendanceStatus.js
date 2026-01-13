// Utility functions for attendance status display

export const getStatusDisplay = (status) => {
  const statusMap = {
    // New statuses
    'Present': { label: 'Present', color: 'text-green-600', bgColor: 'bg-green-50' },
    'Late': { label: 'Late', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    'Absent': { label: 'Absent', color: 'text-red-600', bgColor: 'bg-red-50' },
    'Overtime': { label: 'Overtime', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    // Legacy statuses (for backward compatibility)
    'IN': { label: 'Clocked In', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'COMPLETED': { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-50' },
  };

  return statusMap[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-50' };
};

export const getStatusBadge = (status) => {
  const display = getStatusDisplay(status);
  return {
    ...display,
    className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${display.bgColor} ${display.color}`
  };
};

export const isCompleted = (status) => {
  // Consider attendance completed if it's Present, Late, or legacy COMPLETED
  return status === 'Present' || status === 'Late' || status === 'COMPLETED';
};

export const isPresent = (status) => {
  return status === 'Present' || status === 'COMPLETED';
};

export const isLate = (status) => {
  return status === 'Late';
};

export const isAbsent = (status) => {
  return status === 'Absent';
};

export const isOvertime = (status) => {
  return status === 'Overtime';
};
