import { createContext, useContext, useState, useEffect } from 'react';
import { getSystemConfig } from '../api/SystemConfigApi';
import { isAuthenticated } from '../utils/auth';

// Utility functions for color manipulation
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const adjustColorBrightness = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const adjust = (color) => {
    const adjusted = Math.round(color + (color * percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };
  
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

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
        // Generate hover color (slightly darker)
        const hoverColor = adjustColorBrightness(config.primaryColor, -20);
        document.documentElement.style.setProperty('--primary-hover', hoverColor);
        
        // Generate alpha variants
        const rgb = hexToRgb(config.primaryColor);
        if (rgb) {
          document.documentElement.style.setProperty('--primary-50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
          document.documentElement.style.setProperty('--primary-100', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
          document.documentElement.style.setProperty('--primary-200', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
          document.documentElement.style.setProperty('--primary-300', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
          document.documentElement.style.setProperty('--primary-400', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
          document.documentElement.style.setProperty('--primary-500', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
          document.documentElement.style.setProperty('--primary-600', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
          document.documentElement.style.setProperty('--primary-700', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`);
          document.documentElement.style.setProperty('--primary-800', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
          document.documentElement.style.setProperty('--primary-900', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
        }
        
        // Set text color based on primary color (use primary color for headings)
        document.documentElement.style.setProperty('--text-primary', config.primaryColor);
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
      
      // If it's an authentication error (401), don't set it as an error
      // Just use default config silently
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('🎨 SystemConfig: Authentication error, using default configuration');
      } else {
        console.error('🎨 SystemConfig: Unexpected error:', err);
        setError(err);
      }
      
      // Always use default values on error to prevent app from breaking
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
        // Generate hover color (slightly darker)
        const hoverColor = adjustColorBrightness(newConfig.primaryColor, -20);
        document.documentElement.style.setProperty('--primary-hover', hoverColor);
        
        // Generate alpha variants
        const rgb = hexToRgb(newConfig.primaryColor);
        if (rgb) {
          document.documentElement.style.setProperty('--primary-50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
          document.documentElement.style.setProperty('--primary-100', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
          document.documentElement.style.setProperty('--primary-200', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
          document.documentElement.style.setProperty('--primary-300', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
          document.documentElement.style.setProperty('--primary-400', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
          document.documentElement.style.setProperty('--primary-500', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
          document.documentElement.style.setProperty('--primary-600', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
          document.documentElement.style.setProperty('--primary-700', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`);
          document.documentElement.style.setProperty('--primary-800', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
          document.documentElement.style.setProperty('--primary-900', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
        }
        
        // Set text color based on primary color
        document.documentElement.style.setProperty('--text-primary', newConfig.primaryColor);
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