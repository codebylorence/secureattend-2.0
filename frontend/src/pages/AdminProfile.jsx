import { useState, useEffect } from "react";
import { FaUser, FaLock, FaEdit, FaEye, FaEyeSlash, FaUserCog } from "react-icons/fa";
import { updateUserCredentials } from "../api/EmployeeApi";
import { toast } from 'react-toastify';

export default function AdminProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    firstname: "",
    lastname: "",
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
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCredentials = () => {
    const fullName = user?.firstname && user?.lastname 
      ? `${user.firstname} ${user.lastname}`.trim()
      : `${user?.employee?.firstname || ''} ${user?.employee?.lastname || ''}`.trim() || "";
    
    // Split existing name into firstname and lastname if available
    const nameParts = fullName.split(' ');
    const firstname = nameParts[0] || user?.firstname || "";
    const lastname = nameParts.slice(1).join(' ') || user?.lastname || "";
    
    setCredentialsForm({
      firstname: firstname,
      lastname: lastname,
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
    
    // Check if at least one field is being updated
    const currentFirstname = user?.firstname || "";
    const currentLastname = user?.lastname || "";
    
    const hasFirstnameChange = credentialsForm.firstname.trim() !== currentFirstname;
    const hasLastnameChange = credentialsForm.lastname.trim() !== currentLastname;
    const hasUsernameChange = credentialsForm.username !== user?.username;
    const hasPasswordChange = credentialsForm.newPassword.trim() !== "";
    
    if (!hasFirstnameChange && !hasLastnameChange && !hasUsernameChange && !hasPasswordChange) {
      toast.error("Please make at least one change to update your profile");
      return;
    }

    // Only validate password fields if user is trying to change password
    if (hasPasswordChange) {
      if (!credentialsForm.currentPassword) {
        toast.error("Current password is required to change password");
        return;
      }
      
      if (credentialsForm.newPassword !== credentialsForm.confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }

      if (credentialsForm.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
    }

    // Validate current password only if changing password or username
    if ((hasPasswordChange || hasUsernameChange) && !credentialsForm.currentPassword) {
      toast.error("Current password is required to change username or password");
      return;
    }

    setUpdatingCredentials(true);
    try {
      // Prepare update data - only include fields that are being changed
      const updateData = {};
      
      if (hasFirstnameChange) {
        updateData.firstname = credentialsForm.firstname.trim();
      }
      
      if (hasLastnameChange) {
        updateData.lastname = credentialsForm.lastname.trim();
      }
      
      if (hasUsernameChange) {
        updateData.username = credentialsForm.username;
      }
      
      if (hasPasswordChange) {
        updateData.password = credentialsForm.newPassword;
      }
      
      if (hasPasswordChange || hasUsernameChange) {
        updateData.currentPassword = credentialsForm.currentPassword;
      }

      await updateUserCredentials(user.id, updateData);

      // Update local storage with new data
      const updatedUser = { 
        ...user, 
        ...(hasUsernameChange && { username: credentialsForm.username }),
        ...(hasFirstnameChange && { firstname: credentialsForm.firstname.trim() }),
        ...(hasLastnameChange && { lastname: credentialsForm.lastname.trim() })
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Profile updated successfully!");
      setShowCredentialsModal(false);
      setCredentialsForm({
        firstname: "",
        lastname: "",
        username: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error updating credentials:", error);
      const errorMessage = error.response?.data?.message || "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setUpdatingCredentials(false);
    }
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen pb-10">
        <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
          <h1 className="text-heading text-[21px] font-semibold">Admin Profile</h1>
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

  const displayName = user?.firstname && user?.lastname 
    ? `${user.firstname} ${user.lastname}`.trim()
    : 
      `${user?.employee?.firstname || ''} ${user?.employee?.lastname || ''}`.trim() || 
      "Administrator";

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Admin Profile</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-gradient-primary rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Profile Icon */}
            <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-lg mb-4">
              <FaUserCog size={60} className="text-white" />
            </div>

            {/* Profile Info */}
            <h2 className="text-3xl font-bold text-white mb-2">
              {displayName}
            </h2>
            <p className="text-blue-100 text-lg mb-1">
              System Administrator
            </p>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white font-medium">Administrator</span>
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-primary pb-2 border-b-2 border-blue-100">
              Profile Information
            </h3>
            <button
              onClick={handleEditCredentials}
              className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-primary-50 transition-colors flex items-center gap-2"
              title="Edit Profile"
            >
              <FaEdit size={16} />
              <span className="text-sm font-medium">Edit Profile</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <FaUser className="text-primary mt-1 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                <p className="text-gray-900 font-medium">{displayName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaUser className="text-primary mt-1 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Username</p>
                <p className="text-gray-900 font-medium">{user?.username || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaUserCog className="text-primary mt-1 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="text-primary-600 font-medium">Administrator</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaLock className="text-primary mt-1 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Password</p>
                <p className="text-gray-900 font-medium">••••••••</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-sm text-primary-800">
            <strong>Administrator Access:</strong> As an administrator, you have full system access. 
            You can only modify your first name, last name, username, and password from this profile page. 
            All fields are optional - you can update any combination of them.
          </p>
        </div>
      </div>

      {/* Credentials Edit Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <FaEdit size={20} />
                Edit Profile
              </h2>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={credentialsForm.firstname}
                  onChange={handleCredentialsChange}
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus-ring-primary focus:border-transparent"
                  placeholder="Enter your first name (leave blank to keep current)"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={credentialsForm.lastname}
                  onChange={handleCredentialsChange}
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus-ring-primary focus:border-transparent"
                  placeholder="Enter your last name (leave blank to keep current)"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={credentialsForm.username}
                  onChange={handleCredentialsChange}
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus-ring-primary focus:border-transparent"
                  placeholder="Enter username (leave blank to keep current)"
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password <span className="text-gray-400 text-xs">(required only when changing username or password)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={credentialsForm.currentPassword}
                    onChange={handleCredentialsChange}
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
                  New Password <span className="text-gray-400 text-xs">(optional - leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={credentialsForm.newPassword}
                    onChange={handleCredentialsChange}
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
                  Confirm New Password <span className="text-gray-400 text-xs">(required only when changing password)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={credentialsForm.confirmPassword}
                    onChange={handleCredentialsChange}
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
                    'Update Profile'
                  )}
                </button>
              </div>
            </form>

            {/* Security Note */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Flexible Updates:</strong> You can update any combination of fields. Leave fields blank to keep current values. 
                Current password is only required when changing username or password.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}