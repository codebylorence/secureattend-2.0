/**
 * Cleanup invalid absent records
 * Removes absent records for employees who were NOT scheduled for that day
 */

import axios from 'axios';

const API_URL = 'https://secureattend-2-0.onrender.com/api';

const cleanupInvalidAbsent = async () => {
  try {
    console.log('🧹 Cleaning up invalid absent records...\n');
    
    // Call the cleanup endpoint
    const response = await axios.delete(`${API_URL}/cleanup/invalid-absences`);
    
    console.log('✅ Response:', response.data);
    console.log('\n✅ Invalid absent records cleaned up!');
    console.log('\n💡 Tip: Invalid absent records are those created for employees');
    console.log('   who were NOT scheduled to work on that day.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

cleanupInvalidAbsent();
