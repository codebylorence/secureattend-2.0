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
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
          <h1 className="text-heading text-[21px] font-semibold">My Profile</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 spinner-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">My Profile</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-gradient-primary rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt="Profile"
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                  <FaUser size={80} className="text-gray-400" />
                </div>
              )}
              <label
                htmlFor="photo-upload"
                className="absolute bottom-2 right-2 bg-white text-primary p-3 rounded-full cursor-pointer hover:bg-gray-100 shadow-lg transition-all"
                title="Upload Photo"
              >
                <FaCamera size={20} />
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
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-2">
                {user?.employee?.firstname && user?.employee?.lastname 
                  ? `${user.employee.firstname} ${user.employee.lastname}`
                  : "Employee Name"}
              </h2>
              <p className="text-blue-100 text-lg mb-1">
                {user?.employee?.position || "Position"}
              </p>
              <p className="text-blue-200 mb-4">
                {user?.employee?.department || "Department"}
              </p>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-medium capitalize">{user?.role || "Role"}</span>
              </div>
              {uploading && (
                <p className="text-white text-sm mt-3 animate-pulse">Uploading photo...</p>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b-2 border-blue-100">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FaIdCard className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                  <p className="text-gray-900 font-medium">{user?.employee?.employee_id || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUser className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  <p className="text-gray-900 font-medium">
                    {user?.employee?.firstname && user?.employee?.lastname 
                      ? `${user.employee.firstname} ${user.employee.lastname}`
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaEnvelope className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email Address</p>
                  <p className="text-gray-900 font-medium break-all">{user?.employee?.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaPhone className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                  <p className="text-gray-900 font-medium">{user?.employee?.contact_number || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b-2 border-blue-100">
              Work Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FaBuilding className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-gray-900 font-medium">{user?.employee?.department || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaBriefcase className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Position</p>
                  <p className="text-gray-900 font-medium">{user?.employee?.position || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUserTag className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="text-gray-900 font-medium capitalize">{user?.role || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUser className="text-primary mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Username</p>
                      <p className="text-gray-900 font-medium">{user?.username || "N/A"}</p>
                    </div>
                    <button
                      onClick={handleEditCredentials}
                      className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary-50 transition-colors"
                      title="Edit Username & Password"
                    >
                      <FaEdit size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full mt-1 flex-shrink-0 ${user?.employee?.status === "Active" ? "status-active" : "status-inactive"}`}>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className={`font-medium ${user?.employee?.status === "Active" ? "text-green-600" : "text-red-600"}`}>
                    {user?.employee?.status || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-sm text-primary-800">
            <strong>Tip:</strong> Click the camera icon on your profile photo to upload a new picture. 
            Your photo will be displayed across the system and used for attendance verification.
            Click the edit icon next to your username to update your login credentials.
          </p>
        </div>
      </div>

      {/* Credentials Edit Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <FaLock size={20} />
                Edit Credentials
              </h2>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={credentialsForm.username}
                  onChange={handleCredentialsChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus-ring-primary focus:border-transparent"
                  placeholder="Enter new username"
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={credentialsForm.currentPassword}
                    onChange={handleCredentialsChange}
                    required
                    className="w-full border border-gray-300 rounded-md p-3 pr-10 focus:ring-2 focus-ring-primary focus:border-transparent"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full border border-gray-300 rounded-md p-3 pr-10 focus:ring-2 focus-ring-primary focus:border-transparent"
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={credentialsForm.confirmPassword}
                    onChange={handleCredentialsChange}
                    required
                    className="w-full border border-gray-300 rounded-md p-3 pr-10 focus:ring-2 focus-ring-primary focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={updatingCredentials}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCredentials}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingCredentials ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Credentials'
                  )}
                </button>
              </div>
            </form>

            {/* Security Note */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Security Note:</strong> After updating your credentials, you'll need to log in again with your new username and password.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
