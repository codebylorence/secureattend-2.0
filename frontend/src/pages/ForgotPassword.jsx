import { useState } from "react";
import { FaFingerprint } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { toast } from 'react-toastify';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { systemConfig } = useSystemConfig();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/users/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast.success("Password reset instructions have been sent!");
        
        // In development, show the token
        if (data.resetToken) {
          console.log("🔑 Reset Token (DEV ONLY):", data.resetToken);
          toast.info(`DEV: Reset token copied to console`, { autoClose: 5000 });
        }
      } else {
        toast.error(data.error || "Failed to process request");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 font-sans px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-100">
          <div className="flex flex-col items-center mb-6">
            {systemConfig.logo ? (
              <div className="mb-4">
                <img 
                  src={systemConfig.logo} 
                  alt={systemConfig.systemName || "System Logo"} 
                  className="max-h-12 max-w-36 object-contain"
                />
              </div>
            ) : (
              <div className="bg-green-600 p-3 rounded-xl mb-4 shadow-lg">
                <FaFingerprint size={28} className="text-white" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight text-center">
              Check Your Email
            </h1>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              If an account exists with <span className="font-semibold">{email}</span>, you will receive password reset instructions.
            </p>
            <p className="text-xs text-gray-500">
              Please check your email inbox and spam folder.
            </p>
            
            <div className="pt-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold shadow-sm transition-all duration-200"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 font-sans px-4 sm:px-6 lg:px-8 py-6">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          {systemConfig.logo ? (
            <div className="mb-4">
              <img 
                src={systemConfig.logo} 
                alt={systemConfig.systemName || "System Logo"} 
                className="max-h-12 max-w-36 object-contain"
              />
            </div>
          ) : (
            <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg">
              <FaFingerprint size={28} className="text-white" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight text-center">
            Forgot Password
          </h1>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow mt-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors hover:underline"
          >
            Back to Login
          </button>
        </div>

        <div className="text-center text-gray-400 text-[10px] mt-6 pt-2">
          © {new Date().getFullYear()} {systemConfig.systemName}
          {systemConfig.companyName && ` | ${systemConfig.companyName}`}
        </div>
      </div>
    </div>
  );
}
