import { createContext, useContext, useState, useEffect } from 'react';
import { getSystemConfig } from '../api/SystemConfigApi';
import { isAuthenticated } from '../utils/auth';

const SystemConfigContext = createContext();

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};

export const SystemConfigProvider = ({ children }) => {
  const [systemConfig, setSystemConfig] = useState({
    systemName: 'SecureAttend',
    primaryColor: '#1E3A8A',
    secondaryColor: '#2563EB',
    logo: null,
    companyName: 'Your Company',
    timezone: 'UTC'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated before making the request
      if (!isAuthenticated()) {
        // User not authenticated, use default config
        console.log('🎨 SystemConfig: User not authenticated, using default configuration');
        setLoading(false);
        return;
      }
      
      const config = await getSystemConfig();
      setSystemConfig(config);
      
      // Apply theme colors to CSS variables
      if (config.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', config.primaryColor);
      }
      if (config.secondaryColor) {
        document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
      }
      
      // Update document title
      if (config.systemName) {
        document.title = config.systemName;
      }
      
    } catch (err) {
      console.error('Failed to load system configuration:', err);
      setError(err);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const updateSystemConfig = (newConfig) => {
    setSystemConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      // Apply theme colors immediately
      if (newConfig.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', newConfig.primaryColor);
      }
      if (newConfig.secondaryColor) {
        document.documentElement.style.setProperty('--secondary-color', newConfig.secondaryColor);
      }
      
      // Update document title immediately
      if (newConfig.systemName) {
        document.title = newConfig.systemName;
      }
      
      return updated;
    });
  };

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const value = {
    systemConfig,
    loading,
    error,
    loadSystemConfig,
    updateSystemConfig
  };

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
};