import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // danger, warning, info
  loading = false,
  itemDetails = null
}) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          iconBg: 'bg-yellow-100'
        };
      case 'info':
        return {
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          confirmBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-100'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <FaExclamationTriangle className={`${styles.iconColor}`} size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Message */}
        <div className="mb-4">
          <p className="text-gray-600 mb-4">{message}</p>
          
          {/* Item Details */}
          {itemDetails && (
            <div className={`${styles.bgColor} ${styles.borderColor} border p-3 rounded-md`}>
              {typeof itemDetails === 'string' ? (
                <p className="font-semibold text-gray-800">{itemDetails}</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(itemDetails).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">{key}:</span>
                      <span className="text-sm font-medium text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${styles.confirmBg} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}