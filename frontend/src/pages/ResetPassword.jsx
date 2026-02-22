import { useState, useEffect } from "react";
import { FaFingerprint } from "react-icons/fa";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { toast } from 'react-toastify';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  
  const { systemConfig } = useSystemConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      navigate('/login');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/users/verify-reset-token/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenValid(true);
      } else {
        toast.error("This reset link is invalid or has expired");
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error("Token verification error:", error);
      toast.error("Failed to verify reset link");
      setTimeout(() => navigate('/login'), 2000);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password reset successful! You can now login.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return null;
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
            Reset Password
          </h1>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter new password"
                className="w-full pl-3 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <IoMdEyeOff size={18}/> : <IoMdEye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full pl-3 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showConfirmPassword ? <IoMdEyeOff size={18}/> : <IoMdEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow mt-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Resetting...
              </>
            ) : (
              "Reset Password"
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
