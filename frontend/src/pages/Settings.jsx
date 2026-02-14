import { useState, useEffect } from 'react';
import {
  MdImage,
  MdBuild,
  MdEdit,
  MdCheck,
  MdClose,
  MdPalette,
  MdBusiness,
  MdAccessTime,
  MdCloudUpload,
  MdDeleteOutline
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { updateSystemConfig, resetSystemConfig } from '../api/SystemConfigApi';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import ResetConfirmationModal from '../components/ResetConfirmationModal';

export default function Settings() {
  const { systemConfig, loading, updateSystemConfig: updateContextConfig } = useSystemConfig();

  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [savingField, setSavingField] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  const startEditing = (field) => {
    setEditingField(field);
    setTempValue(systemConfig[field] || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveIndividualField = async (field) => {
    if (savingField) return;

    setSavingField(field);
    try {
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
          toast.error('Please enter a valid hex color');
          return;
        }
      }

      const updateData = { [field]: valueToSave };
      const result = await updateSystemConfig(updateData);

      const updatedValue = result.config[field];
      setLocalConfig(prev => ({ ...prev, [field]: updatedValue }));
      updateContextConfig({ [field]: updatedValue });

      toast.success(`${field} updated successfully!`);
      setEditingField(null);
      setTempValue('');
    } catch (error) {
      console.error(`❌ Error updating ${field}:`, error);
      toast.error(`❌ Failed to update ${field}`);
    } finally {
      setSavingField(null);
    }
  };

  const updateLogo = async (logoData) => {
    if (savingField) return;
    setSavingField('logo');
    try {
      const result = await updateSystemConfig({ logo: logoData });
      setLocalConfig(prev => ({ ...prev, logo: logoData }));
      updateContextConfig({ logo: logoData });
      toast.success('Logo updated successfully!');
    } catch (error) {
      toast.error('❌ Failed to update logo');
    } finally {
      setSavingField(null);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Max size 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => updateLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const resetToDefaults = () => setShowResetModal(true);

  const executeReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetSystemConfig();
      setLocalConfig(result.config);
      updateContextConfig(result.config);
      toast.success('✅ System reset to defaults!');
      setShowResetModal(false);
    } catch (error) {
      toast.error('❌ Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full font-sans flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header - Refined Font Weights */}
      <div className="border-b border-gray-200 pb-4 mb-6 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-800 text-[22px] font-medium">
            System Configuration
          </h1>
        </div>
        
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 bg-white text-rose-500 text-xs font-medium rounded-lg hover:bg-rose-50 border border-rose-100 shadow-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <MdBuild size={14} />
          Reset to Defaults
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Field Card Template - Changed 'font-bold' to 'font-semibold' or 'font-medium' */}
            {[
              { id: 'systemName', label: 'System Name', icon: MdBuild, color: 'blue', value: systemConfig.systemName },
              { id: 'companyName', label: 'Company', icon: MdBusiness, color: 'indigo', value: systemConfig.companyName },
              { id: 'primaryColor', label: 'Primary Color', icon: MdPalette, color: 'emerald', isColor: true },
              { id: 'timezone', label: 'Timezone', icon: MdAccessTime, color: 'amber', isSelect: true, value: systemConfig.timezone }
            ].map((field) => (
              <div key={field.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 bg-${field.color}-50 text-${field.color}-600 rounded-lg`}>
                      <field.icon size={18} />
                    </div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{field.label}</h3>
                  </div>
                  {editingField !== field.id && (
                    <button onClick={() => startEditing(field.id)} className="text-gray-300 hover:text-blue-500 p-1.5 transition-colors opacity-0 group-hover:opacity-100">
                      <MdEdit size={16} />
                    </button>
                  )}
                </div>

                {editingField === field.id ? (
                  <div className="space-y-3">
                    {field.isSelect ? (
                      <select value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none font-medium">
                         <option value="Asia/Manila">Manila (PHT)</option>
                         <option value="UTC">UTC</option>
                         <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    ) : (
                      <input
                        type={field.isColor ? "text" : "text"}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 focus:border-blue-400 outline-none font-medium"
                      />
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => saveIndividualField(field.id)} className="flex-1 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors">
                         {savingField === field.id ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelEditing} className="flex-1 py-1.5 bg-gray-50 text-gray-500 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {field.isColor && (
                      <div className="w-6 h-6 rounded-md shadow-inner border border-gray-100" style={{ backgroundColor: systemConfig.primaryColor }}></div>
                    )}
                    <p className={`text-base font-medium text-gray-700 ${field.isColor ? 'font-mono' : ''}`}>
                      {field.isColor ? systemConfig.primaryColor : field.value}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Logo Card */}
        <div className="w-full xl:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                <MdImage size={18} />
              </div>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">System Logo</h3>
            </div>

            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-6 relative group overflow-hidden">
              {systemConfig.logo ? (
                <div className="p-4 relative w-full h-full flex items-center justify-center">
                  <img src={systemConfig.logo} alt="Logo" className="max-h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => updateLogo(null)} className="bg-white text-rose-500 p-2 rounded-full shadow-lg">
                      <MdDeleteOutline size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <MdCloudUpload size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No logo uploaded</p>
                </div>
              )}
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all cursor-pointer">
              <MdCloudUpload size={16} />
              {systemConfig.logo ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <ResetConfirmationModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={executeReset}
        isResetting={isResetting}
      />
    </div>
  );
}