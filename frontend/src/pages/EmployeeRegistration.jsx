import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import api from '../api/axiosConfig';
import { 
  FaUser, 
  FaCamera,
  FaArrowLeft,
  FaFingerprint,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';

export default function EmployeeRegistration() {
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const [formData, setFormData] = useState({
    employee_id: 'TSI',
    firstname: '',
    lastname: '',
    department: '',
    position: '',
    contact_number: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  
  // UI State for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Error loading departments');
      // Fallback to default departments if network fails
      setDepartments([
        { id: 1, name: 'Human Resources' },
        { id: 2, name: 'Information Technology' },
        { id: 3, name: 'Finance' },
        { id: 4, name: 'Marketing' },
        { id: 5, name: 'Operations' },
        { id: 6, name: 'Sales' },
        { id: 7, name: 'Customer Service' },
        { id: 8, name: 'Administration' }
      ]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.get('/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Error loading positions');
      // Fallback to default positions if network fails
      setPositions([
        { id: 1, name: 'Software Developer' },
        { id: 2, name: 'Project Manager' },
        { id: 3, name: 'Business Analyst' },
        { id: 4, name: 'Quality Assurance' },
        { id: 5, name: 'System Administrator' },
        { id: 6, name: 'HR Specialist' },
        { id: 7, name: 'Accountant' },
        { id: 8, name: 'Marketing Specialist' },
        { id: 9, name: 'Team Leader' },
        { id: 10, name: 'Supervisor' },
        { id: 11, name: 'Admin' },
        { id: 12, name: 'Manager' }
      ]);
    } finally {
      setPositionsLoading(false);
    }
  };

  // Function to determine role based on position
  const getRoleFromPosition = (position) => {
    const positionLower = position.toLowerCase();
    if (positionLower.includes('admin') && !positionLower.includes('warehouse')) {
      return 'admin';
    } else if (positionLower.includes('warehouse admin') || 
               positionLower.includes('warehouse manager') ||
               positionLower.includes('inventory manager')) {
      return 'warehouseadmin';
    } else if (positionLower.includes('supervisor') || positionLower.includes('manager')) {
      return 'supervisor';
    } else if (positionLower.includes('team leader') || positionLower.includes('lead')) {
      return 'teamleader';
    } else {
      return 'employee';
    }
  };

  // Function to check if department is required based on position
  const isDepartmentRequired = (position) => {
    const role = getRoleFromPosition(position);
    return role === 'employee' || role === 'teamleader';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle Employee ID format validation
    if (name === 'employee_id') {
      // Remove any non-alphanumeric characters and convert to uppercase
      let formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      // Enforce TSI prefix
      if (!formattedValue.startsWith('TSI')) {
        if (formattedValue.length === 0) {
          formattedValue = 'TSI';
        } else if (formattedValue.length <= 3) {
          formattedValue = 'TSI';
        } else {
          // If user typed something else, prepend TSI
          formattedValue = 'TSI' + formattedValue.substring(3);
        }
      }
      
      // Limit to TSI + 5 digits (TSI00123)
      if (formattedValue.length > 8) {
        formattedValue = formattedValue.substring(0, 8);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      return;
    }
    
    // If position changes, automatically set department for admin/supervisor/warehouseadmin roles
    if (name === 'position') {
      const role = getRoleFromPosition(value);
      const updatedFormData = {
        ...formData,
        [name]: value
      };
      
      // Auto-set department to "Company-wide" for admin, supervisor, and warehouseadmin roles
      if (role === 'admin' || role === 'supervisor' || role === 'warehouseadmin') {
        updatedFormData.department = 'Company-wide';
      }
      
      setFormData(updatedFormData);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('📸 Photo size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setFormData(prev => ({
          ...prev,
          photo: base64
        }));
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    // Validate Employee ID format
    const employeeIdPattern = /^TSI\d{5}$/;
    if (!formData.employee_id.trim()) {
      toast.error('Employee ID is required');
      return false;
    }
    if (!employeeIdPattern.test(formData.employee_id)) {
      toast.error('Employee ID must be in format TSI00123 (TSI followed by 5 digits)');
      return false;
    }
    if (!formData.firstname.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!formData.lastname.trim()) {
      toast.error('Last name is required');
      return false;
    }
    if (!formData.position.trim()) {
      toast.error('Position is required');
      return false;
    }
    // Department is only required for employees and team leaders based on position
    if (isDepartmentRequired(formData.position) && !formData.department.trim()) {
      toast.error('Department is required for this position');
      return false;
    }
    if (!formData.contact_number.trim()) {
      toast.error('Contact number is required');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error('Valid email is required');
      return false;
    }
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/registration/register', {
        employee_id: formData.employee_id,
        firstname: formData.firstname,
        lastname: formData.lastname,
        department: formData.department || null, // Allow null for supervisors/admins
        position: formData.position,
        contact_number: formData.contact_number,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        photo: formData.photo,
        role: getRoleFromPosition(formData.position) // Derive role from position
      });

      toast.success('🎉 Registration request submitted successfully! Please wait for admin approval.');
      
      const currentEmployeeId = formData.employee_id; // Store before reset
      
      // Reset form
      setFormData({
        employee_id: 'TSI',
        firstname: '',
        lastname: '',
        department: '',
        position: '',
        contact_number: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        photo: null
      });
      setPhotoPreview(null);
      
      // Redirect to status check page after 2 seconds
      setTimeout(() => {
        navigate(`/registration-status/${currentEmployeeId}`);
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`❌ ${error.response?.data?.message || 'Registration failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ONLY UI CHANGES BELOW THIS LINE
  // ==========================================

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center font-sans">
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-5 sm:p-8 border border-gray-100">
          
          <div className="text-center mb-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              {systemConfig.logo ? (
                <img 
                  src={systemConfig.logo} 
                  alt={systemConfig.systemName || "System Logo"} 
                  className="max-h-12 max-w-36 object-contain"
                />
              ) : (
                <div className="bg-blue-600 p-3 rounded-xl shadow-lg transform transition hover:scale-105">
                  <FaFingerprint size={24} className="text-white" />
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Employee Registration</h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">Submit your registration request for admin approval</p>
            <p className="text-[10px] sm:text-xs text-blue-600 mt-1.5 font-medium bg-blue-50 inline-block px-2.5 py-0.5 rounded-full">
              {systemConfig.systemName} - {systemConfig.companyName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="mb-3 relative group">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-white shadow-sm transition duration-300 group-hover:opacity-90"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center transition duration-300 group-hover:bg-blue-50">
                    <FaCamera className="text-gray-400 text-2xl group-hover:text-blue-500 transition-colors" />
                  </div>
                )}
              </div>
              <div className="w-full max-w-[16rem]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Maximum file size: 5MB</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              
              {/* Employee ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                  placeholder="TSI00123"
                  maxLength={8}
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 ml-1">Format: TSI followed by 5 digits (e.g., TSI00123)</p>
              </div>

              {/* First Name & Last Name (Responsive Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Position <span className="text-red-500">*</span></label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  required
                  disabled={positionsLoading}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800 disabled:opacity-50 appearance-none"
                >
                  <option value="">{positionsLoading ? 'Loading positions...' : 'Select your position'}</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.name}>{position.name}</option>
                  ))}
                </select>
                {formData.position && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 ml-1">
                    {isDepartmentRequired(formData.position) 
                      ? 'Department selection is required for this position' 
                      : 'Department will be auto-set to "Company-wide"'}
                  </p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department {isDepartmentRequired(formData.position) ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Auto-assigned)</span>}
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required={isDepartmentRequired(formData.position)}
                  disabled={departmentsLoading || !isDepartmentRequired(formData.position)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800 disabled:opacity-60 disabled:bg-gray-100 appearance-none"
                >
                  <option value="">{departmentsLoading ? 'Loading departments...' : 'Select Department'}</option>
                  {!isDepartmentRequired(formData.position) && (
                    <option value="Company-wide">Company-wide</option>
                  )}
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                {!isDepartmentRequired(formData.position) && formData.position && (
                  <p className="text-[10px] sm:text-xs text-emerald-600 mt-1 ml-1 font-medium">
                    ✓ Department set to "Company-wide" based on role
                  </p>
                )}
              </div>

              {/* Contact & Email (Responsive Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="e.g. 09123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400 text-sm" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              {/* Passwords (Responsive Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-3 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-3 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-gray-800"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit & Back Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 mt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 hover:shadow order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 flex items-center justify-center gap-2 font-semibold transition-all duration-200 order-2 sm:order-1"
              >
                <FaArrowLeft className="text-gray-500 text-sm" />
                Back to Login
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}