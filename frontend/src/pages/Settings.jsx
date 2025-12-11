import React, { useState } from 'react';
import { MdBuild, MdCheckCircle, MdError } from 'react-icons/md';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function Settings() {
  const [isFixingRoles, setIsFixingRoles] = useState(false);

  const handleFixTeamLeaderRoles = async () => {
    if (!confirm('This will fix team leaders who were registered through the registration system and have incorrect roles. Continue?')) {
      return;
    }

    setIsFixingRoles(true);
    try {
      const response = await axios.post('/api/users/fix-teamleader-roles');
      
      if (response.data.fixed > 0) {
        toast.success(`✅ Fixed ${response.data.fixed} team leader role(s)!`);
      } else {
        toast.info('ℹ️ No team leader roles needed fixing.');
      }
    } catch (error) {
      console.error('Error fixing team leader roles:', error);
      toast.error('❌ Failed to fix team leader roles: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsFixingRoles(false);
    }
  };

  return (
    <div className="pr-10 bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-[#374151] text-[21px] font-semibold">
          Settings
        </h1>
      </div>

      {/* System Utilities */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MdBuild className="text-blue-600" />
          System Utilities
        </h2>
        
        <div className="space-y-4">
          {/* Fix Team Leader Roles */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 mb-2">Fix Team Leader Roles</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Fixes team leaders who were registered through the registration system but have incorrect user roles. 
                  This ensures they can be properly scheduled in zones.
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <strong>Issue:</strong> Team leaders registered through the registration system get "employee" role instead of "teamleader" role, 
                  preventing them from appearing in zone scheduling.
                </div>
              </div>
              <button
                onClick={handleFixTeamLeaderRoles}
                disabled={isFixingRoles}
                className={`ml-4 px-4 py-2 rounded-md font-medium transition-colors ${
                  isFixingRoles
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFixingRoles ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Fixing...
                  </span>
                ) : (
                  'Fix Roles'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
