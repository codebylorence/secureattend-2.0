import { useState, useEffect } from "react";
import { FaCamera, FaUser, FaEnvelope, FaPhone, FaIdCard, FaBriefcase, FaBuilding, FaUserTag, FaEdit, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { uploadEmployeePhoto, getEmployeeById, updateUserCredentials } from "../api/EmployeeApi";
import { toast } from 'react-toastify';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // Fetch fresh employee data from server
      if (userData.employee?.employee_id) {
        const freshEmployeeData = await getEmployeeById(userData.employee.employee_id);

        // Update user object with fresh employee data
        const updatedUser = {
          ...userData,
          employee: freshEmployeeData
        };

        setUser(updatedUser);
        setPhoto(freshEmployeeData.photo);

        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        setUser(userData);
        setPhoto(userData.employee?.photo);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fallback to localStorage data
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
      setPhoto(userData.employee?.photo);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setPhoto(base64String);

      // Upload to server
      if (user?.employee?.id) {
        setUploading(true);
        try {
          console.log("Uploading photo for employee ID:", user.employee.id);
          const response = await uploadEmployeePhoto(user.employee.id, base64String);
          console.log("Upload response:", response);

          // Fetch fresh data from server to ensure it's saved
          await fetchUserData();

          toast.success("Photo uploaded successfully!");
        } catch (error) {
          console.error("Error uploading photo:", error);
          console.error("Error details:", error.response?.data || error.message);
          toast.error(`Failed to upload photo: ${error.response?.data?.message || error.message}`);
          // Revert photo on error
          setPhoto(user.employee?.photo);
        } finally {
          setUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditCredentials = () => {
    setCredentialsForm({
      username: user?.username || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setShowCredentialsModal(true);
  };

  const handleCredentialsChange = (e) => {
    setCredentialsForm({
      ...credentialsForm,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();

    if (credentialsForm.newPassword !== credentialsForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (credentialsForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setUpdatingCredentials(true);
    try {
      await updateUserCredentials(user.id, {
        username: credentialsForm.username,
        password: credentialsForm.newPassword,
        currentPassword: credentialsForm.currentPassword
      });

      // Update local storage with new username
      const updatedUser = { ...user, username: credentialsForm.username };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Credentials updated successfully!");
      setShowCredentialsModal(false);
      setCredentialsForm({
        username: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error updating credentials:", error);
      const errorMessage = error.response?.data?.message || "Failed to update credentials";
      toast.error(errorMessage);
    } finally {
      setUpdatingCredentials(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full font-sans">
        <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
          <h1 className="text-heading text-[21px] font-semibold">My Profile</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm font-medium text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE (Excluding Header)
  // ==========================================

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">

      {/* PRESERVED HEADER */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">My Profile</h1>
      </div>

      <div className="max-w-4xl mx-auto pb-8">

        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0 group">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white/20 shadow-2xl p-1 bg-white/10 backdrop-blur-sm">
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                    <FaUser size={50} className="text-white/70" />
                  </div>
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-1 right-1 bg-white text-blue-600 p-2.5 rounded-full cursor-pointer hover:bg-gray-50 hover:scale-105 shadow-lg transition-all duration-200 border border-gray-100"
                title="Upload Photo"
              >
                <FaCamera size={16} />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                disabled={uploading}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left pt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
                {user?.employee?.firstname && user?.employee?.lastname
                  ? `${user.employee.firstname} ${user.employee.lastname}`
                  : "Employee Name"}
              </h2>
              <p className="text-blue-100 text-sm sm:text-base font-medium mb-1">
                {user?.employee?.position || "Position"}
              </p>
              <p className="text-blue-200/80 text-xs sm:text-sm mb-4 flex items-center justify-center md:justify-start gap-2">
                <FaBuilding className="text-blue-300/70" />
                {user?.employee?.department || "Department"}
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-white text-xs font-semibold uppercase tracking-wider">{user?.role || "Role"}</span>
              </div>
              {uploading && (
                <p className="text-white/80 text-xs mt-3 animate-pulse font-medium bg-black/10 inline-block px-3 py-1 rounded-full">
                  Uploading photo...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <FaUser className="text-blue-500" />
              Personal Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaIdCard size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Employee ID</p>
                  <p className="text-sm text-gray-900 font-semibold">{user?.employee?.employee_id || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaEnvelope size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Email Address</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{user?.employee?.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaPhone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Contact Number</p>
                  <p className="text-sm text-gray-900 font-medium">{user?.employee?.contact_number || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <FaLock className="text-blue-500" />
              Account Settings
            </h3>
            <div className="space-y-4">

              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-lg flex-shrink-0 text-slate-600 shadow-sm">
                    <FaUserTag size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Username</p>
                    <p className="text-sm text-gray-900 font-bold">{user?.username || "N/A"}</p>
                  </div>
                </div>
                <button
                  onClick={handleEditCredentials}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  title="Edit Username & Password"
                >
                  <FaEdit size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0 text-blue-600">
                  <FaBriefcase size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">System Role</p>
                  <p className="text-sm text-gray-900 font-medium capitalize">{user?.role || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${user?.employee?.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  <div className="w-4 h-4 rounded-full border-2 border-current bg-current opacity-80"></div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Account Status</p>
                  <p className={`text-sm font-bold uppercase tracking-wider ${user?.employee?.status === "Active" ? "text-emerald-600" : "text-rose-600"}`}>
                    {user?.employee?.status || "N/A"}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 sm:p-5 flex gap-4 items-start">
          <div className="bg-white p-2 rounded-full shadow-sm text-blue-500 mt-0.5">
            <FaEdit size={14} />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Quick Tip:</strong> Click the camera icon on your profile photo to upload a new picture.
            This photo will be displayed across the system and used for your attendance verification.
            Click the edit button next to your username to update your login credentials securely.
          </p>
        </div>
      </div>

      {/* Credentials Edit Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-8 relative border border-gray-100">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <FaLock size={16} />
                </div>
                Update Credentials
              </h2>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={credentialsForm.username}
                  onChange={handleCredentialsChange}
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800 font-medium"
                  placeholder="Enter new username"
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={credentialsForm.currentPassword}
                    onChange={handleCredentialsChange}
                    required
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPasswords.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={credentialsForm.newPassword}
                    onChange={handleCredentialsChange}
                    required
                    minLength={6}
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPasswords.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={credentialsForm.confirmPassword}
                    onChange={handleCredentialsChange}
                    required
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPasswords.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Security Note */}
              <div className="mt-2 pt-2 pb-1">
                <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 leading-relaxed">
                  <strong className="font-bold">Security Note:</strong> After updating, you will need to log back in.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 font-semibold transition-all duration-200"
                  disabled={updatingCredentials}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCredentials}
                  className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {updatingCredentials ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}