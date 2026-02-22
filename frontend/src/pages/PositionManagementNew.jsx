import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes,
  FaBriefcase,
  FaUsers
} from 'react-icons/fa';
import ConfirmationModal from '../components/ConfirmationModal';
import api from '../api/axiosConfig';

export default function PositionManagementNew() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  console.log('PositionManagementNew - showAddModal:', showAddModal);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching positions with token:', token ? 'Token exists' : 'No token');
      
      // Try admin endpoint first (axios will add auth header automatically)
      try {
        const response = await api.get('/positions/all');
        console.log('✅ Positions fetched from admin endpoint:', response.data.length, 'positions');
        setPositions(response.data);
      } catch (adminError) {
        // If admin endpoint fails due to auth, try public endpoint
        if (adminError.response?.status === 401 || adminError.response?.status === 403) {
          console.log('⚠️ Admin access denied, trying public endpoint...');
          const response = await api.get('/positions');
          console.log('✅ Positions fetched from public endpoint:', response.data.length, 'positions');
          setPositions(response.data);
        } else {
          throw adminError;
        }
      }
    } catch (error) {
      console.error('💥 Error fetching positions:', error);
      toast.error('Error loading positions: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPosition = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Position name is required');
      return;
    }

    try {
      const response = await api.post('/positions', formData);
      setPositions(prev => [...prev, { ...response.data, employeeCount: 0 }]);
      setShowAddModal(false);
      setFormData({ name: '', description: '' });
      toast.success('Position added successfully!');
    } catch (error) {
      console.error('Error adding position:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('You need admin access to add positions');
      } else {
        toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to add position');
      }
    }
  };

  const handleEditPosition = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Position name is required');
      return;
    }

    try {
      const response = await api.put(`/positions/${editingPosition.id}`, formData);
      setPositions(prev => prev.map(pos => 
        pos.id === editingPosition.id 
          ? { ...response.data, employeeCount: pos.employeeCount }
          : pos
      ));
      setEditingPosition(null);
      setFormData({ name: '', description: '' });
      toast.success('Position updated successfully!');
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error(error.response?.data?.error || 'Failed to update position');
    }
  };

  const handleDeletePosition = async (position) => {
    if (position.employeeCount > 0) {
      toast.error(`Cannot delete position. ${position.employeeCount} employee(s) are using this position.`);
      return;
    }

    setPositionToDelete(position);
    setShowDeleteModal(true);
  };

  const confirmDeletePosition = async () => {
    if (!positionToDelete) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/positions/${positionToDelete.id}`);
      setPositions(prev => prev.filter(pos => pos.id !== positionToDelete.id));
      toast.success('Position deleted successfully!');
      setShowDeleteModal(false);
      setPositionToDelete(null);
    } catch (error) {
      console.error('Error deleting position:', error);
      toast.error(error.response?.data?.error || 'Failed to delete position');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || ''
    });
  };

  const closeModals = () => {
    setShowAddModal(false);
    setEditingPosition(null);
    setShowDeleteModal(false);
    setPositionToDelete(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="w-full font-sans pt-15 sm:pt-10 pr-0 sm:pr-10">
        <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
          <h1 className="text-heading text-[21px] font-semibold">Position Management</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Responsive Header Section */}
      <div className="border-b-2 border-gray-200 pb-4 mb-6 pt-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-heading text-[21px] font-semibold flex items-center gap-2">
              Positions
            </h1>
          </div>
          <button
            onClick={() => {
              console.log('Add Position button clicked - setting showAddModal to true');
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 sm:py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 transition-colors shadow-sm font-medium"
          >
            <FaPlus />
            Add Position
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">
            All Positions <span className="text-sm font-normal text-gray-500 ml-2 bg-gray-200 px-2 py-0.5 rounded-full">{positions.length}</span>
          </h3>
        </div>

        {positions.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBriefcase className="text-2xl text-gray-400" />
            </div>
            <p className="font-medium text-gray-600">No positions found</p>
            <p className="text-sm text-gray-400 mt-1">Click the button above to add your first position.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Position Details
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                    Employees
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-right sm:text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {position.name}
                        </span>
                        {position.description && (
                          <span className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-md">
                            {position.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md w-max border border-gray-100">
                        <FaUsers className={position.employeeCount > 0 ? "text-blue-500" : "text-gray-400"} size={14} />
                        <span className={`text-sm font-semibold ${position.employeeCount > 0 ? "text-blue-700" : "text-gray-600"}`}>
                          {position.employeeCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right sm:text-left">
                      <div className="flex justify-end sm:justify-start gap-2">
                        <button
                          onClick={() => openEditModal(position)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
                          title="Edit position"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePosition(position)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-500"
                          disabled={position.employeeCount > 0}
                          title={position.employeeCount > 0 ? "Cannot delete position in use" : "Delete position"}
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModals();
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Position</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleAddPosition} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Position Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="e.g. Senior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white resize-none"
                  placeholder="Briefly describe the responsibilities..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="w-full sm:flex-1 bg-white border border-gray-200 text-gray-700 py-3 sm:py-2.5 px-4 rounded-xl hover:bg-gray-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-primary text-white py-3 sm:py-2.5 px-4 rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2 font-bold shadow-sm shadow-blue-200 transition-colors"
                >
                  <FaSave />
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {editingPosition && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModals();
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaEdit className="text-blue-500" />
                Edit Position
              </h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleEditPosition} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Position Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="w-full sm:flex-1 bg-white border border-gray-200 text-gray-700 py-3 sm:py-2.5 px-4 rounded-xl hover:bg-gray-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 text-white py-3 sm:py-2.5 px-4 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 font-bold shadow-sm shadow-blue-200 transition-colors"
                >
                  <FaSave />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPositionToDelete(null);
        }}
        onConfirm={confirmDeletePosition}
        title="Delete Position"
        message={
          positionToDelete?.employeeCount > 0
            ? `Cannot delete this position because ${positionToDelete.employeeCount} employee(s) are currently using it.`
            : "Are you sure you want to delete this position? This action cannot be undone."
        }
        confirmText={positionToDelete?.employeeCount > 0 ? "Understood" : "Delete Position"}
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
        itemDetails={positionToDelete ? {
          name: positionToDelete.name,
          description: positionToDelete.description || 'No description',
          'employees using': positionToDelete.employeeCount
        } : null}
      />
    </div>
  );
}