import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { FaSearch, FaArrowLeft, FaFingerprint } from 'react-icons/fa';

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
      const response = await fetch(`http://localhost:5000/api/registration/status/${employeeId}`);
      
      if (response.ok) {
        // Redirect to status page
        navigate(`/registration-status/${employeeId}`);
      } else if (response.status === 404) {
        toast.error('No registration request found for this Employee ID');
      } else {
        toast.error('Failed to check registration status');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              {systemConfig.logo ? (
                <img 
                  src={systemConfig.logo} 
                  alt={systemConfig.systemName || "System Logo"} 
                  className="max-h-12 max-w-32 object-contain"
                />
              ) : (
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center">
                  <FaFingerprint className="text-primary text-2xl" />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Check Registration Status</h2>
            <p className="mt-2 text-gray-600">Enter your Employee ID to check your registration status</p>
            <p className="text-sm text-gray-500 mt-1">{systemConfig.systemName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID *
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus-ring-primary"
                placeholder="Enter your Employee ID"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus-ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Check Status
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center gap-2 font-medium"
              >
                <FaArrowLeft />
                Back to Login
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have a registration request?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary hover:underline font-medium"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}