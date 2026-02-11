/**
 * Delete premature absent records
 * This removes absent records where the shift hasn't ended yet
 */

import axios from 'axios';

const API_URL = 'https://secureattend-2-0.onrender.com/api';

const deletePrematureAbsent = async () => {
  try {
    console.log('🗑️  Deleting premature absent record for Lorence...\n');
    
    // You'll need to get the attendance ID first
    // Or we can use the cleanup endpoint
    
    const response = await axios.delete(`${API_URL}/cleanup/invalid-absences`);
    
    console.log('✅ Response:', response.data);
    console.log('\n✅ Premature absent records deleted!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

deletePrematureAbsent();
