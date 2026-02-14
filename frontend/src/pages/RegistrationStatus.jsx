import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import api from '../api/axiosConfig';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaHourglassHalf,
  FaSync,
  FaSignInAlt,
  FaUserPlus,
  FaFingerprint
} from 'react-icons/fa';

export default function RegistrationStatus() {
  const { employee_id } = useParams();
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegistrationStatus();
  }, [employee_id]);

  const fetchRegistrationStatus = async () => {
    try {
      const response = await api.get(`/registration/status/${employee_id}`);
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
      if (error.response?.status === 404) {
        setError('Registration request not found');
      } else {
        setError('Failed to fetch registration status');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-200 shadow-amber-100/50';
      case 'approved':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-emerald-100/50';
      case 'rejected':
        return 'text-rose-700 bg-rose-50 border-rose-200 shadow-rose-100/50';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200 shadow-gray-100/50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaHourglassHalf className="text-lg sm:text-xl" />;
      case 'approved':
        return <FaCheckCircle className="text-lg sm:text-xl" />;
      case 'rejected':
        return <FaTimesCircle className="text-lg sm:text-xl" />;
      default:
        return <FaHourglassHalf className="text-lg sm:text-xl" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center font-sans">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-100 text-center flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm font-medium text-gray-600 tracking-wide">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center font-sans px-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-100 text-center">
          <div className="text-rose-500 text-5xl mb-4 flex justify-center drop-shadow-sm">
            <FaTimesCircle />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Error Occurred</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto bg-blue-600 text-white py-2.5 px-5 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow mx-auto"
          >
            <FaUserPlus />
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center font-sans">
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-5 sm:p-8 border border-gray-100">
          
          {/* Header Section */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {systemConfig.logo ? (
                <img 
                  src={systemConfig.logo} 
                  alt={systemConfig.companyName || 'Company Logo'} 
                  className="max-h-12 max-w-36 object-contain"
                />
              ) : (
                <div className="bg-blue-600 p-3 rounded-xl shadow-lg transform transition hover:scale-105">
                  <FaFingerprint size={24} className="text-white" />
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Registration Status</h2>
            <p className="text-[10px] sm:text-xs text-blue-600 mt-1.5 font-medium bg-blue-50 inline-block px-2.5 py-0.5 rounded-full mb-1">
              Employee ID: {employee_id}
            </p>
          </div>

          {/* Status Badge */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-xl border-2 shadow-sm ${getStatusColor(status.status)}`}>
              <span className="mr-2.5">{getStatusIcon(status.status)}</span>
              <span className="text-sm font-bold uppercase tracking-wider">{status.status}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Request Details Card */}
            <div className="bg-slate-50/70 border border-gray-100 p-4 rounded-xl shadow-sm">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-3">Request Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5 font-medium">Submitted on:</span>
                  <p className="font-semibold text-gray-800">{new Date(status.createdAt).toLocaleDateString()}</p>
                </div>
                {status.approved_at && (
                  <div>
                    <span className="text-gray-500 block mb-0.5 font-medium">Processed on:</span>
                    <p className="font-semibold text-gray-800">{new Date(status.approved_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Status Cards */}
            {status.status === 'pending' && (
              <div className="bg-amber-50/50 border border-amber-200 p-4 sm:p-5 rounded-xl shadow-sm">
                <h3 className="font-bold text-sm text-amber-800 mb-2 flex items-center gap-2">
                  <FaHourglassHalf className="text-amber-600" />
                  Pending Approval
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 mb-4 leading-relaxed">
                  Your registration request is currently being reviewed by an administrator. 
                  You will be notified once a decision has been made.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-white text-gray-700 py-2.5 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-200 flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow"
                >
                  <FaSignInAlt className="text-gray-500" />
                  Go to Login
                </button>
              </div>
            )}

            {status.status === 'approved' && (
              <div className="bg-emerald-50/50 border border-emerald-200 p-4 sm:p-5 rounded-xl shadow-sm">
                <h3 className="font-bold text-sm text-emerald-800 mb-2 flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-600" />
                  Registration Approved
                </h3>
                <p className="text-xs sm:text-sm text-emerald-700 mb-4 leading-relaxed">
                  Congratulations! Your registration has been approved. You can now log in to the system.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow"
                >
                  <FaSignInAlt />
                  Go to Login
                </button>
              </div>
            )}

            {status.status === 'rejected' && (
              <div className="bg-rose-50/50 border border-rose-200 p-4 sm:p-5 rounded-xl shadow-sm">
                <h3 className="font-bold text-sm text-rose-800 mb-2 flex items-center gap-2">
                  <FaTimesCircle className="text-rose-600" />
                  Registration Rejected
                </h3>
                <p className="text-xs sm:text-sm text-rose-700 mb-3 leading-relaxed">
                  Unfortunately, your registration request has been rejected.
                </p>
                {status.rejection_reason && (
                  <div className="mt-3 bg-white border border-rose-100 rounded-lg p-3">
                    <span className="text-xs text-rose-600 font-bold uppercase tracking-wider block mb-1">Reason:</span>
                    <p className="text-xs sm:text-sm text-gray-700 font-medium">{status.rejection_reason}</p>
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow"
                  >
                    <FaUserPlus />
                    Submit New Request
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Action */}
          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            <button
              onClick={() => fetchRegistrationStatus()}
              className="text-xs sm:text-sm text-gray-500 hover:text-blue-600 font-medium flex items-center justify-center gap-2 mx-auto transition-colors duration-200 hover:bg-blue-50 py-2 px-4 rounded-lg"
            >
              <FaSync className="text-xs" />
              Refresh Status
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}