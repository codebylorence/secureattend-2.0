import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import api from '../api/axiosConfig';
import { 
  FaUser, 
  FaCamera,
  FaArrowLeft,
  FaPaperPlane,
  FaFingerprint
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

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#1E3A8A]">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              {systemConfig.logo ? (
                <img 
                  src={systemConfig.logo} 
                  alt={systemConfig.systemName || "System Logo"} 
                  className="max-h-16 max-w-48 object-contain"
                />
              ) : (
                <div className="bg-[#1E3A8A] p-4 rounded-full shadow-md">
                  <FaFingerprint size={35} color="white" />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Employee Registration</h2>
            <p className="mt-2 text-gray-600">Submit your registration request for admin approval</p>
            <p className="text-sm text-gray-500 mt-1">{systemConfig.systemName} - {systemConfig.companyName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="text-center">
              <div className="mb-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-blue-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center">
                    <FaCamera className="text-gray-500 text-2xl" />
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Upload your photo (max 5MB)</p>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID *
              </label>
              <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TSI00123"
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: TSI followed by 5 digits (e.g., TSI00123)
              </p>
            </div>

            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position *
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                required
                disabled={positionsLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {positionsLoading ? 'Loading positions...' : 'Select Position'}
                </option>
                {positions.map(position => (
                  <option key={position.id} value={position.name}>
                    {position.name}
                  </option>
                ))}
              </select>
              {formData.position && (
                <p className="text-xs text-gray-500 mt-1">
                  {isDepartmentRequired(formData.position) 
                    ? 'Department selection is required for this position' 
                    : 'Department will be automatically set to "Company-wide" for this position'}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department {isDepartmentRequired(formData.position) ? '*' : '(Auto-assigned)'}
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required={isDepartmentRequired(formData.position)}
                disabled={departmentsLoading || !isDepartmentRequired(formData.position)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {departmentsLoading ? 'Loading departments...' : 'Select Department'}
                </option>
                {!isDepartmentRequired(formData.position) && (
                  <option value="Company-wide">Company-wide</option>
                )}
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {!isDepartmentRequired(formData.position) && formData.position && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Department automatically set to "Company-wide" for this position
                </p>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number *
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your contact number"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Choose a username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password (min. 6 characters)"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Submit Registration
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
        </div>
      </div>
    </div>
  );
}