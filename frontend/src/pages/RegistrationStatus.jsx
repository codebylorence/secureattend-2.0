import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaHourglassHalf,
  FaSync,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';

export default function RegistrationStatus() {
  const { employee_id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegistrationStatus();
  }, [employee_id]);

  const fetchRegistrationStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/registration/status/${employee_id}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else if (response.status === 404) {
        setError('Registration request not found');
      } else {
        setError('Failed to fetch registration status');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaHourglassHalf className="text-2xl" />;
      case 'approved':
        return <FaCheckCircle className="text-2xl" />;
      case 'rejected':
        return <FaTimesCircle className="text-2xl" />;
      default:
        return <FaHourglassHalf className="text-2xl" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading registration status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">
            <FaTimesCircle className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">❌ Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <FaUserPlus />
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Registration Status</h2>
            <p className="mt-2 text-gray-600">
              Employee ID: {employee_id}
            </p>
          </div>

          <div className="text-center mb-8">
            <div className={`inline-flex items-center px-6 py-3 rounded-full border-2 ${getStatusColor(status.status)}`}>
              <span className="mr-3">{getStatusIcon(status.status)}</span>
              <span className="text-lg font-semibold capitalize">{status.status}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Request Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Submitted:</span>
                  <p className="font-medium">{new Date(status.createdAt).toLocaleDateString()}</p>
                </div>
                {status.approved_at && (
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <p className="font-medium">{new Date(status.approved_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {status.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <FaHourglassHalf />
                  Pending Approval
                </h3>
                <p className="text-yellow-700">
                  Your registration request is currently being reviewed by an administrator. 
                  You will be notified once a decision has been made.
                </p>
              </div>
            )}

            {status.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <FaCheckCircle />
                  Registration Approved
                </h3>
                <p className="text-green-700 mb-4">
                  Congratulations! Your registration has been approved. You can now log in to the system.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <FaSignInAlt />
                  Go to Login
                </button>
              </div>
            )}

            {status.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <FaTimesCircle />
                  Registration Rejected
                </h3>
                <p className="text-red-700 mb-2">
                  Unfortunately, your registration request has been rejected.
                </p>
                {status.rejection_reason && (
                  <div className="mt-3">
                    <span className="text-red-600 font-medium">Reason:</span>
                    <p className="text-red-700 mt-1 bg-red-100 p-2 rounded">{status.rejection_reason}</p>
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => navigate('/register')}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaUserPlus />
                    Submit New Request
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => fetchRegistrationStatus()}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mx-auto"
            >
              <FaSync />
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}