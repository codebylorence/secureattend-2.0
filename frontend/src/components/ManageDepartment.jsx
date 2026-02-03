import { useState, useEffect } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdManageAccounts, MdDelete, MdClose } from "react-icons/md";
import { fetchDepartments, deleteDepartment, updateDepartment } from "../api/DepartmentApi";
import { fetchTeamLeaders } from "../api/UserApi";
import ConfirmationModal from "./ConfirmationModal";
import axios from "axios";
import teamLeaderEventManager from "../utils/teamLeaderEvents";

export default function ManageDepartment({ supervisorView = false, refreshTrigger, searchTerm = "" }) {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", manager: "" });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentMembers, setDepartmentMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadTeamLeaders();
  }, []);

  // Filter departments based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(dept =>
        dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.manager?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDepartments(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [departments, searchTerm]);

  // Add effect to refresh team leaders when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 Refreshing team leaders due to trigger change');
      loadTeamLeaders();
    }
  }, [refreshTrigger]);

  // Subscribe to team leader updates
  useEffect(() => {
    const unsubscribe = teamLeaderEventManager.subscribe(() => {
      console.log('🔄 ManageDepartment: Received team leader update event');
      loadTeamLeaders();
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const loadTeamLeaders = async () => {
    try {
      const data = await fetchTeamLeaders();
      console.log('🔍 Team leaders debug:', {
        count: data.length,
        leaders: data.map(leader => ({
          id: leader.id,
          username: leader.username,
          employee: leader.employee ? {
            employee_id: leader.employee.employee_id,
            firstname: leader.employee.firstname,
            lastname: leader.employee.lastname,
            department: leader.employee.department
          } : null
        }))
      });
      setTeamLeaders(data);
    } catch (error) {
      console.error("Error loading team leaders:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
      alert("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({
      name: dept.name,
      description: dept.description || "",
      manager: dept.manager || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", manager: "" });
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateDepartment(id, editForm);
      setEditingId(null);
      setEditForm({ name: "", description: "", manager: "" });
      loadDepartments();
    } catch (error) {
      console.error("Error updating department:", error);
      alert(error.response?.data?.error || "Failed to update department");
    }
  };

  const handleDelete = async (id, name, employeeCount) => {
    if (employeeCount > 0) {
      // Show modal even for departments with employees, but with different message
      const dept = departments.find(d => d.id === id);
      setDepartmentToDelete({ ...dept, id, name, employeeCount });
      setShowDeleteModal(true);
      return;
    }

    const dept = departments.find(d => d.id === id);
    setDepartmentToDelete({ ...dept, id, name, employeeCount });
    setShowDeleteModal(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    if (departmentToDelete.employeeCount > 0) {
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteDepartment(departmentToDelete.id);
      loadDepartments();
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
    } catch (error) {
      console.error("Error deleting department:", error);
      alert(error.response?.data?.error || "Failed to delete department");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewMembers = async (dept) => {
    setSelectedDepartment(dept);
    setViewModalOpen(true);
    
    try {
      const response = await axios.get(`http://localhost:5000/employees`);
      const allEmployees = response.data;
      
      // Filter employees by department
      let members = allEmployees.filter(emp => emp.department === dept.name);
      
      // If there's a manager assigned, make sure they're included even if from different department
      if (dept.manager) {
        const manager = allEmployees.find(emp => {
          // Check firstname+lastname combination
          const empFullName = emp.firstname && emp.lastname 
            ? `${emp.firstname} ${emp.lastname}` 
            : emp.firstname || '';
          return empFullName === dept.manager;
        });
        
        // If manager exists but not in current members list, add them
        if (manager && !members.find(m => m.id === manager.id)) {
          members.push(manager);
        }
      }
      
      console.log('🔍 Department members debug:', {
        department: dept.name,
        manager: dept.manager,
        totalEmployees: allEmployees.length,
        departmentMembers: members.length,
        regularMembers: allEmployees.filter(emp => emp.department === dept.name).length,
        sampleMember: members[0],
        memberNames: members.map(m => ({
          id: m.id,
          employee_id: m.employee_id,
          firstname: m.firstname,
          lastname: m.lastname,
          position: m.position,
          department: m.department
        }))
      });
      
      setDepartmentMembers(members);
    } catch (error) {
      console.error("Error loading department members:", error);
      setDepartmentMembers([]);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedDepartment(null);
    setDepartmentMembers([]);
  };

  return (
    <>
      {/* View Members Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {selectedDepartment?.name} - Members
              </h3>
              <button
                onClick={closeViewModal}
                className="hover:bg-primary-700 rounded-full p-1"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Department Info */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold">{selectedDepartment?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Team Leader</p>
                    <p className="font-semibold">
                      {selectedDepartment?.manager || "Not Assigned"}
                      {selectedDepartment?.manager && (
                        <>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            Manager
                          </span>
                          {(() => {
                            const manager = departmentMembers.find(m => {
                              const memberFullName = m.firstname && m.lastname 
                                ? `${m.firstname} ${m.lastname}` 
                                : m.firstname || '';
                              return memberFullName === selectedDepartment?.manager;
                            });
                            return manager && manager.department !== selectedDepartment?.name ? (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                From {manager.department}
                              </span>
                            ) : null;
                          })()}
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="font-semibold">
                      {departmentMembers.length}
                      {departmentMembers.some(m => m.department !== selectedDepartment?.name) && (
                        <span className="text-xs text-gray-500 ml-1">
                          (includes cross-dept manager)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-semibold">{selectedDepartment?.description || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentMembers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No members in this department
                        </td>
                      </tr>
                    ) : (
                      departmentMembers.map((member) => {
                        // Get member's full name (handle firstname/lastname format)
                        const memberFullName = (() => {
                          if (member.firstname && member.lastname) {
                            return `${member.firstname} ${member.lastname}`;
                          }
                          if (member.firstname && member.firstname.trim()) {
                            return member.firstname;
                          }
                          return `Employee ${member.employee_id}`;
                        })();
                        
                        // Check if this member is the team leader (compare with manager name)
                        const isTeamLeader = memberFullName === selectedDepartment?.manager ||
                                           (member.firstname && member.lastname && 
                                            `${member.firstname} ${member.lastname}` === selectedDepartment?.manager);
                        
                        return (
                          <tr 
                            key={member.id} 
                            className={`hover:bg-gray-50 ${
                              isTeamLeader 
                                ? 'bg-primary-50 hover:bg-primary-100 border-l-4 border-l-blue-600' 
                                : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.employee_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {memberFullName}
                              {isTeamLeader && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                  Team Leader
                                </span>
                              )}
                              {member.department !== selectedDepartment?.name && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  From {member.department}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {member.position}
                              {isTeamLeader && member.department !== selectedDepartment?.name && (
                                <div className="text-xs text-gray-500 mt-1">Managing from {member.department}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                member.status === 'Active' || member.status === 'active'
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={closeViewModal}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-md overflow-hidden">
        <div className="bg-primary text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <MdManageAccounts size={20} />
            <h2 className="font-semibold text-white">Manage Department</h2>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? "No departments match your search" : "No departments found"}
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);
                    return paginatedDepartments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === dept.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="border rounded px-2 py-1 w-full text-sm"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === dept.id ? (
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="border rounded px-2 py-1 w-full text-sm"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{dept.description || "-"}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.employeeCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === dept.id ? (
                          <select
                            value={editForm.manager}
                            onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                            className="border rounded px-2 py-1 w-full text-sm"
                          >
                            <option value="">No Manager</option>
                            {teamLeaders.length === 0 ? (
                              <option disabled>No team leaders available</option>
                            ) : (
                              teamLeaders.map((leader) => {
                                // Get leader's full name (handle both firstname/lastname and fullname formats)
                                const leaderFullName = (() => {
                                  if (leader.employee?.firstname && leader.employee?.lastname) {
                                    return `${leader.employee.firstname} ${leader.employee.lastname}`;
                                  }
                                  if (leader.employee?.firstname && leader.employee.firstname.trim()) {
                                    return leader.employee.firstname;
                                  }
                                  return leader.username;
                                })();
                                
                                return (
                                  <option key={leader.id} value={leaderFullName}>
                                    {leaderFullName}
                                    {leader.employee?.employee_id && ` (${leader.employee.employee_id})`}
                                    {leader.employee?.department && leader.employee.department !== dept.name && ` - ${leader.employee.department}`}
                                  </option>
                                );
                              })
                            )}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-900">{dept.manager || "-"}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {!supervisorView ? (
                            // Admin view - full actions
                            editingId === dept.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(dept.id)}
                                  className="w-7 h-7 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors"
                                  title="Save changes"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="w-7 h-7 rounded-md bg-gray-500 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
                                  title="Cancel"
                                >
                                  <MdClose size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleViewMembers(dept)}
                                  className="w-7 h-7 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors"
                                  title="View Members"
                                >
                                  <FaEye size={12} />
                                </button>
                                <button
                                  onClick={() => handleEdit(dept)}
                                  className="w-7 h-7 rounded-md bg-blue-600 hover:bg-primary-600 text-white flex items-center justify-center transition-colors"
                                  title="Edit"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(dept.id, dept.name, dept.employeeCount)}
                                  className="w-7 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                                  title="Delete"
                                >
                                  <MdDelete size={14} />
                                </button>
                              </>
                            )
                          ) : (
                            // Supervisor view - view only
                            <button
                              onClick={() => handleViewMembers(dept)}
                              className="w-7 h-7 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors"
                              title="View Members"
                            >
                              <FaEye size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                  })()
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {departments.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">entries</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, departments.length)} to{' '}
                  {Math.min(currentPage * itemsPerPage, departments.length)} of {departments.length} entries
                </span>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {(() => {
                    const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
                    const pages = [];
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + 4);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === i
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredDepartments.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredDepartments.length / itemsPerPage)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDepartmentToDelete(null);
        }}
        onConfirm={confirmDeleteDepartment}
        title="Delete Department"
        message={
          departmentToDelete?.employeeCount > 0
            ? `Cannot delete this department because ${departmentToDelete.employeeCount} employee(s) are currently assigned to it. Please reassign or remove these employees first.`
            : "Are you sure you want to delete this department? This action cannot be undone."
        }
        confirmText={departmentToDelete?.employeeCount > 0 ? "Understood" : "Delete Department"}
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
        itemDetails={departmentToDelete ? {
          name: departmentToDelete.name,
          description: departmentToDelete.description || 'No description',
          manager: departmentToDelete.manager || 'No manager assigned',
          'employees assigned': departmentToDelete.employeeCount
        } : null}
      />
    </>
  );
}
