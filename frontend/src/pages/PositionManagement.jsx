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

export default function PositionManagement() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 'Entry'
  });

  const levels = ['Entry', 'Junior', 'Senior', 'Lead', 'Manager', 'Director', 'Executive'];

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/positions/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      } else {
        toast.error('Failed to fetch positions');
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Error loading positions');
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/positions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newPosition = await response.json();
        setPositions(prev => [...prev, { ...newPosition, employeeCount: 0 }]);
        setShowAddModal(false);
        setFormData({ name: '', description: '', level: 'Entry' });
        toast.success('Position added successfully!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add position');
      }
    } catch (error) {
      console.error('Error adding position:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleEditPosition = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Position name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/positions/${editingPosition.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedPosition = await response.json();
        setPositions(prev => prev.map(pos => 
          pos.id === editingPosition.id 
            ? { ...updatedPosition, employeeCount: pos.employeeCount }
            : pos
        ));
        setEditingPosition(null);
        setFormData({ name: '', description: '', level: 'Entry' });
        toast.success('Position updated successfully!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update position');
      }
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeletePosition = async (position) => {
    if (position.employeeCount > 0) {
      toast.error(`Cannot delete position. ${position.employeeCount} employee(s) are using this position.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${position.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/positions/${position.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setPositions(prev => prev.filter(pos => pos.id !== position.id));
        toast.success('Position deleted successfully!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete position');
      }
    } catch (error) {
      console.error('Error deleting position:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const openEditModal = (position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || '',
      level: position.level
    });
  };

  const closeModals = () => {
    setShowAddModal(false);
    setEditingPosition(null);
    setFormData({ name: '', description: '', level: 'Entry' });
  };

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getLevelBadge = (level) => {
    const colors = {
      'Entry': 'bg-gray-100 text-gray-800',
      'Junior': 'bg-blue-100 text-blue-800',
      'Senior': 'bg-purple-100 text-purple-800',
      'Lead': 'bg-yellow-100 text-yellow-800',
      'Manager': 'bg-orange-100 text-orange-800',
      'Director': 'bg-red-100 text-red-800',
      'Executive': 'bg-indigo-100 text-indigo-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50">
        <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
          <h1 className="text-[#374151] text-[21px] font-semibold">Position Management</h1>
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
    <div className="pr-10 bg-gray-50">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[#374151] text-[21px] font-semibold flex items-center gap-2">
              Positions
            </h1>
            <p className="text-gray-600 text-sm mt-1">Manage company positions and job levels</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus />
            Add Position
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Positions ({positions.length})
          </h3>
        </div>

        {positions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FaBriefcase className="text-4xl mx-auto mb-4 text-gray-300" />
            <p>No positions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {position.name}
                        </div>
                        {position.description && (
                          <div className="text-sm text-gray-500">
                            {position.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadge(position.level)}`}>
                        {position.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(position.status)}`}>
                        {position.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <FaUsers className="text-gray-400" />
                        {position.employeeCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(position)}
                          className="w-7 h-7 rounded-md bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                          title="Edit position"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePosition(position)}
                          className="w-7 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={position.employeeCount > 0}
                          title="Delete position"
                        >
                          <FaTrash size={12} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Position</h3>
            
            <form onSubmit={handleAddPosition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter position name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter position description (optional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FaSave />
                  Add Position
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {editingPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Position</h3>
            
            <form onSubmit={handleEditPosition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter position name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter position description (optional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FaSave />
                  Update Position
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}