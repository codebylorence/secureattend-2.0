import fs from 'fs';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'system-config.json');

// Default system configuration
const DEFAULT_CONFIG = {
  systemName: 'SecureAttend',
  primaryColor: '#1E3A8A',
  secondaryColor: '#2563EB',
  logo: null,
  companyName: 'Your Company',
  timezone: 'Asia/Manila', // Changed from UTC to Philippines timezone
  lastUpdated: new Date().toISOString()
};

// Ensure config directory exists
const ensureConfigDirectory = () => {
  const configDir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

// Load system configuration
const loadConfig = () => {
  try {
    ensureConfigDirectory();
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error loading system config:', error);
    return DEFAULT_CONFIG;
  }
};

// Save system configuration
const saveConfig = (config) => {
  try {
    ensureConfigDirectory();
    const configToSave = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2));
    return configToSave;
  } catch (error) {
    console.error('Error saving system config:', error);
    throw error;
  }
};

/**
 * GET /api/system/config
 * Get current system configuration
 */
export const getSystemConfig = async (req, res) => {
  try {
    const config = loadConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error('Error getting system config:', error);
    res.status(500).json({
      message: 'Failed to get system configuration',
      error: error.message
    });
  }
};

/**
 * PUT /api/system/config
 * Update system configuration (all fields are optional)
 */
export const updateSystemConfig = async (req, res) => {
  try {
    console.log('🔄 Backend: Received system config update request');
    console.log('🔄 Backend: Request body:', req.body);
    console.log('🔄 Backend: User:', req.user);
    
    const { systemName, primaryColor, secondaryColor, logo, companyName, timezone } = req.body;
    
    // Validate that at least one field is provided
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: 'At least one configuration field must be provided'
      });
    }
    
    // Load current config to merge with updates
    const currentConfig = loadConfig();
    
    // Build new config by merging current with provided updates
    const newConfig = { ...currentConfig };
    
    // Validation helper for hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    // Only update fields that are provided and valid
    if (systemName !== undefined) {
      if (typeof systemName === 'string') {
        const trimmedName = systemName.trim();
        if (trimmedName.length > 0) {
          newConfig.systemName = trimmedName;
        } else {
          return res.status(400).json({
            message: 'System name cannot be empty'
          });
        }
      } else {
        return res.status(400).json({
          message: 'System name must be a string'
        });
      }
    }
    
    if (primaryColor !== undefined) {
      if (primaryColor === null || primaryColor === '') {
        // Allow clearing the color (will use default)
        newConfig.primaryColor = DEFAULT_CONFIG.primaryColor;
      } else if (typeof primaryColor === 'string' && hexColorRegex.test(primaryColor)) {
        newConfig.primaryColor = primaryColor;
      } else {
        console.log('❌ Backend: Invalid primary color format:', primaryColor);
        return res.status(400).json({
          message: 'Invalid primary color format. Please use hex colors (e.g., #1E3A8A)'
        });
      }
    }
    
    if (secondaryColor !== undefined) {
      if (secondaryColor === null || secondaryColor === '') {
        // Allow clearing the color (will use primary or default)
        newConfig.secondaryColor = newConfig.primaryColor || DEFAULT_CONFIG.secondaryColor;
      } else if (typeof secondaryColor === 'string' && hexColorRegex.test(secondaryColor)) {
        newConfig.secondaryColor = secondaryColor;
      } else {
        console.log('❌ Backend: Invalid secondary color format:', secondaryColor);
        return res.status(400).json({
          message: 'Invalid secondary color format. Please use hex colors (e.g., #2563EB)'
        });
      }
    }
    
    if (logo !== undefined) {
      // Allow null/empty to remove logo, or valid base64 data URL
      if (logo === null || logo === '') {
        newConfig.logo = null;
      } else if (typeof logo === 'string' && logo.startsWith('data:image/')) {
        newConfig.logo = logo;
      } else {
        return res.status(400).json({
          message: 'Logo must be a valid image data URL or null to remove'
        });
      }
    }
    
    if (companyName !== undefined) {
      if (typeof companyName === 'string') {
        const trimmedName = companyName.trim();
        if (trimmedName.length > 0) {
          newConfig.companyName = trimmedName;
        } else {
          return res.status(400).json({
            message: 'Company name cannot be empty'
          });
        }
      } else {
        return res.status(400).json({
          message: 'Company name must be a string'
        });
      }
    }
    
    if (timezone !== undefined) {
      if (timezone === null || timezone === '') {
        newConfig.timezone = DEFAULT_CONFIG.timezone;
      } else if (typeof timezone === 'string') {
        newConfig.timezone = timezone;
      } else {
        return res.status(400).json({
          message: 'Timezone must be a string'
        });
      }
    }

    console.log('🔄 Backend: Saving config:', newConfig);
    const savedConfig = saveConfig(newConfig);
    console.log('✅ Backend: Config saved successfully:', savedConfig);
    
    // Create a summary of what was updated
    const updatedFields = [];
    if (systemName !== undefined) updatedFields.push('systemName');
    if (primaryColor !== undefined) updatedFields.push('primaryColor');
    if (secondaryColor !== undefined) updatedFields.push('secondaryColor');
    if (logo !== undefined) updatedFields.push('logo');
    if (companyName !== undefined) updatedFields.push('companyName');
    if (timezone !== undefined) updatedFields.push('timezone');
    
    console.log('✅ System configuration updated fields:', updatedFields);

    res.status(200).json({
      message: `System configuration updated successfully (${updatedFields.join(', ')})`,
      config: savedConfig,
      updatedFields
    });
  } catch (error) {
    console.error('❌ Backend: Error updating system config:', error);
    res.status(500).json({
      message: 'Failed to update system configuration',
      error: error.message
    });
  }
};

/**
 * POST /api/system/config/reset
 * Reset system configuration to defaults
 */
export const resetSystemConfig = async (req, res) => {
  try {
    const savedConfig = saveConfig(DEFAULT_CONFIG);
    
    console.log('🔄 System configuration reset to defaults');

    res.status(200).json({
      message: 'System configuration reset to defaults',
      config: savedConfig
    });
  } catch (error) {
    console.error('Error resetting system config:', error);
    res.status(500).json({
      message: 'Failed to reset system configuration',
      error: error.message
    });
  }
};