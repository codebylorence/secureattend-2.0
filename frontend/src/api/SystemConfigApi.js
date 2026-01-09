import api from './axiosConfig';

// Get system configuration
export const getSystemConfig = async () => {
  try {
    console.log('🔄 API: Getting system config...');
    const response = await api.get('/system/config');
    console.log('✅ API: System config retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ API: Error fetching system config:', error);
    console.error('❌ API: Error response:', error.response?.data);
    console.error('❌ API: Error status:', error.response?.status);
    throw error;
  }
};

// Update system configuration
export const updateSystemConfig = async (config) => {
  try {
    console.log('🔄 API: Updating system config:', config);
    const response = await api.put('/system/config', config);
    console.log('✅ API: System config updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ API: Error updating system config:', error);
    console.error('❌ API: Error response:', error.response?.data);
    console.error('❌ API: Error status:', error.response?.status);
    throw error;
  }
};

// Reset system configuration to defaults
export const resetSystemConfig = async () => {
  try {
    console.log('🔄 API: Resetting system config...');
    const response = await api.post('/system/config/reset');
    console.log('✅ API: System config reset:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ API: Error resetting system config:', error);
    console.error('❌ API: Error response:', error.response?.data);
    console.error('❌ API: Error status:', error.response?.status);
    throw error;
  }
};