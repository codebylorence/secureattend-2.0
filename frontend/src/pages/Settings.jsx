import { useState, useEffect } from 'react';
import { 
  MdSettings, 
  MdInfo,
  MdPalette,
  MdImage,
  MdSave,
  MdBuild,
  MdEdit,
  MdCheck,
  MdClose
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { updateSystemConfig, resetSystemConfig } from '../api/SystemConfigApi';
import { useSystemConfig } from '../contexts/SystemConfigContext';

export default function Settings() {
  // Use system config context
  const { systemConfig, loading, updateSystemConfig: updateContextConfig, loadSystemConfig } = useSystemConfig();
  
  // Local state for modal and editing
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Individual field editing states
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [savingField, setSavingField] = useState(null);

  // Sync local config with context when it changes
  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  useEffect(() => {
    // Context handles loading, no need for separate effect
  }, []);

  // Individual field editing functions
  const startEditing = (field) => {
    setEditingField(field);
    setTempValue(systemConfig[field] || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveIndividualField = async (field) => {
    if (savingField) return; // Prevent multiple saves
    
    setSavingField(field);
    try {
      // Validate the field value
      let valueToSave = tempValue;
      
      if (field === 'systemName' || field === 'companyName') {
        valueToSave = tempValue.trim();
        if (!valueToSave) {
          toast.error(`${field === 'systemName' ? 'System name' : 'Company name'} cannot be empty`);
          return;
        }
      }
      
      if (field === 'primaryColor' || field === 'secondaryColor') {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (valueToSave && !hexColorRegex.test(valueToSave)) {
          toast.error('Please enter a valid hex color (e.g., #1E3A8A)');
          return;
        }
      }
      
      // Create update object with only the field being updated
      const updateData = { [field]: valueToSave };
      
      console.log(`🔄 Updating ${field}:`, updateData);
      const result = await updateSystemConfig(updateData);
      console.log('Field updated successfully:', result);
      
      // Update both local state and context
      const updatedValue = result.config[field];
      setLocalConfig(prev => ({
        ...prev,
        [field]: updatedValue
      }));
      
      // Update context to propagate changes throughout the app
      updateContextConfig({ [field]: updatedValue });
      
      toast.success(`${field === 'systemName' ? 'System name' : 
                          field === 'companyName' ? 'Company name' :
                          field === 'primaryColor' ? 'Primary color' :
                          field === 'secondaryColor' ? 'Secondary color' :
                          field === 'timezone' ? 'Timezone' : 'Field'} updated successfully!`);
      
      setEditingField(null);
      setTempValue('');
      
    } catch (error) {
      console.error(`❌ Error updating ${field}:`, error);
      toast.error(`❌ Failed to update ${field}: ${error.response?.data?.message || error.message}`);
    } finally {
      setSavingField(null);
    }
  };

  const updateLogo = async (logoData) => {
    if (savingField) return;
    
    setSavingField('logo');
    try {
      const updateData = { logo: logoData };
      console.log('🔄 Updating logo');
      const result = await updateSystemConfig(updateData);
      console.log('Logo updated successfully:', result);
      
      // Update both local state and context
      setLocalConfig(prev => ({
        ...prev,
        logo: logoData
      }));
      
      // Update context to propagate changes throughout the app
      updateContextConfig({ logo: logoData });
      
      toast.success('Logo updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating logo:', error);
      toast.error(`❌ Failed to update logo: ${error.response?.data?.message || error.message}`);
    } finally {
      setSavingField(null);
    }
  };



  const handleConfigChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateLogo(null);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      console.log('🔄 Saving system config:', localConfig);
      const result = await updateSystemConfig(localConfig);
      console.log('System config saved successfully:', result);
      
      // Update context with the saved configuration
      updateContextConfig(result.config);
      
      toast.success('System configuration saved successfully!');
      setShowConfigModal(false);
      
    } catch (error) {
      console.error('❌ Error saving system config:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(`❌ Failed to save system configuration: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Reset all system settings to default values?')) {
      try {
        const result = await resetSystemConfig();
        
        // Update both local state and context
        setLocalConfig(result.config);
        updateContextConfig(result.config);
        
        toast.success('System configuration reset to defaults!');
      } catch (error) {
        console.error('Error resetting system config:', error);
        toast.error('❌ Failed to reset system configuration');
      }
    }
  };

  if (loading) {
    return (
      <div className="pr-10 bg-gray-50 min-h-screen">
        <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
          <h1 className="text-heading text-[21px] font-semibold">System Configuration</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 spinner-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading system configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-10 bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">
          System Configuration
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Customize your system appearance, branding, and settings
        </p>
      </div>

      {/* System Configuration Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MdSettings className="text-primary" />
            System Configuration
          </h2>
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn-primary px-4 py-2 rounded-md flex items-center gap-2"
          >
            <MdSettings size={16} />
            Edit All Settings
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* System Name */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">System Name</h3>
              {editingField !== 'systemName' && (
                <button
                  onClick={() => startEditing('systemName')}
                  className="text-primary hover:text-primary-700 p-1"
                  title="Edit system name"
                >
                  <MdEdit size={16} />
                </button>
              )}
            </div>
            {editingField === 'systemName' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                  placeholder="Enter system name"
                  autoFocus
                />
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => saveIndividualField('systemName')}
                    disabled={savingField === 'systemName'}
                    className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                    title="Save"
                  >
                    {savingField === 'systemName' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    ) : (
                      <MdCheck size={16} />
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg font-bold text-primary">{systemConfig.systemName}</p>
            )}
          </div>

          {/* Company Name */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Company</h3>
              {editingField !== 'companyName' && (
                <button
                  onClick={() => startEditing('companyName')}
                  className="text-primary hover:text-primary-700 p-1"
                  title="Edit company name"
                >
                  <MdEdit size={16} />
                </button>
              )}
            </div>
            {editingField === 'companyName' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                  placeholder="Enter company name"
                  autoFocus
                />
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => saveIndividualField('companyName')}
                    disabled={savingField === 'companyName'}
                    className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                    title="Save"
                  >
                    {savingField === 'companyName' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    ) : (
                      <MdCheck size={16} />
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg font-bold text-primary">{systemConfig.companyName}</p>
            )}
          </div>

          {/* Primary Color */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Primary Color</h3>
              {editingField !== 'primaryColor' && (
                <button
                  onClick={() => startEditing('primaryColor')}
                  className="text-primary hover:text-primary-700 p-1"
                  title="Edit primary color"
                >
                  <MdEdit size={16} />
                </button>
              )}
            </div>
            {editingField === 'primaryColor' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="color"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="w-20 text-xs border border-gray-300 rounded px-1 py-1 font-mono"
                    placeholder="#1E3A8A"
                  />
                </div>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => saveIndividualField('primaryColor')}
                    disabled={savingField === 'primaryColor'}
                    className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                    title="Save"
                  >
                    {savingField === 'primaryColor' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    ) : (
                      <MdCheck size={16} />
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: systemConfig.primaryColor }}
                ></div>
                <span className="text-sm font-mono">{systemConfig.primaryColor}</span>
              </div>
            )}
          </div>

          {/* Timezone */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Timezone</h3>
              {editingField !== 'timezone' && (
                <button
                  onClick={() => startEditing('timezone')}
                  className="text-primary hover:text-primary-700 p-1"
                  title="Edit timezone"
                >
                  <MdEdit size={16} />
                </button>
              )}
            </div>
            {editingField === 'timezone' ? (
              <div className="space-y-2">
                <select
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  autoFocus
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Manila">Manila (PHT)</option>
                </select>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => saveIndividualField('timezone')}
                    disabled={savingField === 'timezone'}
                    className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                    title="Save"
                  >
                    {savingField === 'timezone' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    ) : (
                      <MdCheck size={16} />
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg font-bold text-primary">{systemConfig.timezone}</p>
            )}
          </div>
        </div>

        {/* Logo Display and Management */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">System Logo</h3>
            <div className="flex gap-2">
              <label className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-primary-700 transition-colors cursor-pointer flex items-center gap-1">
                <MdImage size={14} />
                {systemConfig.logo ? 'Change Logo' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={savingField === 'logo'}
                />
              </label>
              {systemConfig.logo && (
                <button
                  onClick={removeLogo}
                  disabled={savingField === 'logo'}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Remove Logo
                </button>
              )}
            </div>
          </div>
          {savingField === 'logo' && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Updating logo...
              </div>
            </div>
          )}
          {systemConfig.logo && (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <img 
                src={systemConfig.logo} 
                alt="System Logo" 
                className="max-h-16 max-w-48 object-contain"
              />
            </div>
          )}
          {!systemConfig.logo && (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <MdImage size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logo uploaded</p>
                <p className="text-xs">Upload an image to display your company logo</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Help */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <MdInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-primary-800 mb-2">System Configuration</h4>
            <div className="text-sm text-primary-700 space-y-1">
              <p>• <strong>Individual Editing:</strong> Click the edit icon next to any field to update it individually</p>
              <p>• <strong>System Name:</strong> The name displayed throughout the application</p>
              <p>• <strong>Company Name:</strong> Your organization's name for branding</p>
              <p>• <strong>Theme Colors:</strong> Primary and secondary colors for the user interface</p>
              <p>• <strong>Logo:</strong> Company logo displayed in the system (max 2MB, PNG/JPG/SVG recommended)</p>
              <p>• <strong>Timezone:</strong> System timezone for proper time handling</p>
              <p>• <strong>Bulk Editing:</strong> Use "Edit All Settings" to modify multiple fields at once</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <MdSettings className="text-primary" />
                Bulk Configuration Editor
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> All fields are optional. You can update only the fields you want to change. 
                Leave fields unchanged to keep their current values.
              </p>
            </div>

            <div className="space-y-6">
              {/* System Identity */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <MdInfo className="text-blue-500" />
                  System Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Name <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={localConfig.systemName}
                      onChange={(e) => handleConfigChange('systemName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., SecureAttend"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={localConfig.companyName}
                      onChange={(e) => handleConfigChange('companyName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Your Company Name"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Customization */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <MdPalette className="text-purple-500" />
                  Theme Customization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localConfig.primaryColor}
                        onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localConfig.primaryColor}
                        onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md p-2 font-mono text-sm"
                        placeholder="#1E3A8A"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localConfig.secondaryColor}
                        onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localConfig.secondaryColor}
                        onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md p-2 font-mono text-sm"
                        placeholder="#2563EB"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">Preview:</p>
                  <div className="flex items-center gap-4">
                    <div 
                      className="px-4 py-2 rounded-md text-white font-medium"
                      style={{ backgroundColor: localConfig.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div 
                      className="px-4 py-2 rounded-md text-white font-medium"
                      style={{ backgroundColor: localConfig.secondaryColor }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <MdImage className="text-green-500" />
                  System Logo
                </h3>
                <div className="space-y-4">
                  {localConfig.logo && (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <img 
                        src={localConfig.logo} 
                        alt="System Logo" 
                        className="max-h-20 max-w-40 object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Logo (Max 2MB) <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: PNG or SVG format, transparent background
                    </p>
                  </div>
                  {localConfig.logo && (
                    <button
                      onClick={() => handleConfigChange('logo', null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>

              {/* System Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <MdBuild className="text-orange-500" />
                  System Settings
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={localConfig.timezone}
                    onChange={(e) => handleConfigChange('timezone', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                    <option value="Asia/Manila">Manila (PHT)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset to Defaults
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={isSavingConfig}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingConfig ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <MdSave size={16} />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
