import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { FaArrowLeft, FaFingerprint } from 'react-icons/fa';
import api from '../api/axiosConfig';

export default function CheckRegistrationStatus() {
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!employeeId.trim()) {
      toast.error('Please enter your Employee ID');
      return;
    }

    setLoading(true);

    try {
      const response = await api.get(`/registration/status/${employeeId}`);
      // Redirect to status page
      navigate(`/registration-status/${employeeId}`);
    } catch (error) {
      console.error('Error checking status:', error);
      if (error.response?.status === 404) {
        toast.error('No registration request found for this Employee ID');
      } else {
        toast.error('Failed to check registration status');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 font-sans px-4 sm:px-6 lg:px-8 py-6">
      
      {/* CARD CONTAINER */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-100 relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          {systemConfig.logo ? (
            // Display uploaded logo
            <div className="mb-4">
              <img 
                src={systemConfig.logo} 
                alt={systemConfig.systemName || "System Logo"} 
                className="max-h-12 max-w-36 object-contain"
              />
            </div>
          ) : (
            // Fallback to fingerprint icon
            <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg transform transition hover:scale-105">
              <FaFingerprint size={28} className="text-white" />
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight text-center">
            Check Status
          </h2>
          <p className="text-[10px] sm:text-xs text-blue-600 mt-1.5 font-medium bg-blue-50 inline-block px-2.5 py-0.5 rounded-full">
            {systemConfig.systemName || "Attendance Management System"}
          </p>
        </div>

        {/* Informational Text */}
        <p className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
          Enter your Employee ID below to view the current approval status of your registration request.
        </p>

        {/* Check Status Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800 uppercase"
              placeholder="e.g. TSI00123"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking...
                </>
              ) : (
                <>
                  Check Status
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 flex items-center justify-center gap-2 font-semibold transition-all duration-200 order-2 sm:order-1"
            >
              <FaArrowLeft className="text-gray-500 text-xs" />
              Back
            </button>
          </div>
        </form>

        {/* Registration Link Footer */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-[11px] sm:text-xs text-gray-500">
            Don't have a registration request?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors hover:underline ml-1"
            >
              Register here
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}