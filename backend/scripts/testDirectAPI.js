import express from 'express';
import { getEmployeeSchedules } from '../controllers/employeeScheduleController.js';

// Create a mock request and response to test the controller directly
const testDirectAPI = async () => {
  try {
    console.log('🧪 Testing getEmployeeSchedules controller directly...');
    
    // Mock request object
    const req = {
      user: {
        id: 8,
        role: 'teamleader',
        employeeId: 8
      }
    };
    
    // Mock response object
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`📊 Response status: ${code}`);
          console.log(`📊 Response data length: ${data.length || 'N/A'}`);
          if (Array.isArray(data)) {
            console.log(`📊 Sample data:`, data.slice(0, 2));
          } else {
            console.log(`📊 Response data:`, data);
          }
          return { status: code, data };
        }
      })
    };
    
    // Call the controller directly
    await getEmployeeSchedules(req, res);
    
  } catch (error) {
    console.error('❌ Error testing direct API:', error);
  }
};

testDirectAPI();