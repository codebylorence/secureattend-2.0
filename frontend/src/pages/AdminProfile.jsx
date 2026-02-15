import { useState, useEffect } from "react";
import { FaUser, FaLock, FaEdit, FaEye, FaEyeSlash } from "react-icons/fa";
import { updateUserCredentials } from "../api/EmployeeApi";
import { toast } from 'react-toastify';
import { MdClose } from "react-icons/md";

export default function AdminProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
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
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    const fullName = user?.firstname && user?.lastname 
      ? `${user.firstname} ${user.lastname}`.trim()
      : `${user?.employee?.firstname || ''} ${user?.employee?.lastname || ''}`.trim() || "";
    
    const nameParts = fullName.split(' ');
    const firstname = nameParts[0] || user?.firstname || "";
    const lastname = nameParts.slice(1).join(' ') || user?.lastname || "";
    
    setFormData({
      firstname: firstname,
      lastname: lastname,
      username: user?.username || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setShowEditModal(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePassword = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const currentFirstname = user?.firstname || "";
    const currentLastname = user?.lastname || "";
    
    const hasFirstnameChange = formData.firstname.trim() !== currentFirstname;
    const hasLastnameChange = formData.lastname.trim() !== currentLastname;
    const hasUsernameChange = formData.username !== user?.username;
    const hasPasswordChange = formData.newPassword.trim() !== "";
    
    if (!hasFirstnameChange && !hasLastnameChange && !hasUsernameChange && !hasPasswordChange) {
      toast.info("No changes made.");
      return;
    }

    if (hasPasswordChange) {
      if (!formData.currentPassword) {
        toast.error("Current password is required to change password");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }
      if (formData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
    }

    if ((hasPasswordChange || hasUsernameChange) && !formData.currentPassword) {
      toast.error("Current password is required to change your username or password");
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {};
      
      if (hasFirstnameChange) updateData.firstname = formData.firstname.trim();
      if (hasLastnameChange) updateData.lastname = formData.lastname.trim();
      if (hasUsernameChange) updateData.username = formData.username;
      if (hasPasswordChange) updateData.password = formData.newPassword;
      if (hasPasswordChange || hasUsernameChange) updateData.currentPassword = formData.currentPassword;

      await updateUserCredentials(user.id, updateData);

      const updatedUser = { 
        ...user, 
        ...(hasUsernameChange && { username: formData.username }),
        ...(hasFirstnameChange && { firstname: formData.firstname.trim() }),
        ...(hasLastnameChange && { lastname: formData.lastname.trim() })
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Profile updated successfully!");
      setShowEditModal(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full font-sans flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Derive display names safely
  const displayFirstName = user?.firstname || user?.employee?.firstname || "Admin";
  const displayLastName = user?.lastname || user?.employee?.lastname || "";

  return (
     <div className="w-full font-sans pt-15 sm:pt-10">

      {/* PRESERVED HEADER */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">My Profile</h1>
      </div>

      {/* Simple Profile Card */}
      <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">
              {displayFirstName.charAt(0)}{displayLastName ? displayLastName.charAt(0) : ''}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {displayFirstName} {displayLastName}
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                Administrator
              </span>
            </div>
          </div>
          
          <button
            onClick={handleEditClick}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
          >
            <FaEdit size={14} />
            Edit Profile
          </button>
        </div>

        {/* Display Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">First Name</p>
            <p className="text-sm font-bold text-gray-900">{displayFirstName}</p>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Name</p>
            <p className="text-sm font-bold text-gray-900">{displayLastName || 'N/A'}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Username</p>
            <p className="text-sm font-bold text-gray-900">{user?.username || "Not Set"}</p>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-full transition-colors">
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">First Name</label>
                  <input
                    type="text" name="firstname"
                    value={formData.firstname} onChange={handleChange}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Last Name</label>
                  <input
                    type="text" name="lastname"
                    value={formData.lastname} onChange={handleChange}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                <input
                  type="text" name="username"
                  value={formData.username} onChange={handleChange}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="my-4 border-t border-gray-100"></div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password <span className="normal-case font-medium text-blue-500 tracking-normal">*Required to save changes</span></label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"} name="currentPassword"
                    value={formData.currentPassword} onChange={handleChange}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => togglePassword('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPasswords.current ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password <span className="normal-case font-medium text-gray-400 tracking-normal">(Optional)</span></label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"} name="newPassword"
                    value={formData.newPassword} onChange={handleChange} minLength={6}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => togglePassword('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPasswords.new ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              {formData.newPassword.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"} name="confirmPassword"
                      value={formData.confirmPassword} onChange={handleChange}
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button type="button" onClick={() => togglePassword('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPasswords.confirm ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 sm:justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} disabled={isUpdating} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-2">
                  {isUpdating ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}