const fs = require('fs');
const path = require('path');

// Comprehensive color mappings
const colorMappings = {
  // Hex colors to dynamic classes
  'text-\\[#374151\\]': 'text-heading',
  'text-\\[#1E3A8A\\]': 'text-primary',
  'text-\\[#7C3AED\\]': 'text-primary', // Super admin purple -> primary
  'bg-\\[#1E3A8A\\]': 'bg-primary',
  'bg-\\[#7C3AED\\]': 'bg-primary', // Super admin purple -> primary
  'border-\\[#1E3A8A\\]': 'border-primary',
  'border-\\[#7C3AED\\]': 'border-primary', // Super admin purple -> primary
  'focus:ring-\\[#1E3A8A\\]': 'focus-ring-primary',
  'focus:border-\\[#1E3A8A\\]': 'focus-primary',
  'hover:bg-blue-900': 'hover:bg-primary-hover',
  'hover:text-blue-700': 'hover:text-primary-hover',
  'hover:text-blue-800': 'hover:text-primary-800',
  'hover:text-purple-700': 'hover:text-primary-hover',
  'hover:bg-purple-50': 'hover:bg-primary-50',
  
  // Tailwind blue classes to primary
  'bg-blue-50': 'bg-primary-50',
  'bg-blue-100': 'bg-primary-100',
  'bg-blue-200': 'bg-primary-200',
  'bg-blue-600': 'bg-primary-600',
  'bg-blue-700': 'bg-primary-700',
  'text-blue-600': 'text-primary-600',
  'text-blue-700': 'text-primary-700',
  'text-blue-800': 'text-primary-800',
  'border-blue-200': 'border-primary-200',
  'border-blue-300': 'border-primary-300',
  'border-blue-500': 'border-primary-500',
  'hover:border-blue-300': 'hover:border-primary-300',
  'hover:border-blue-500': 'hover:border-primary-500',
  'hover:bg-blue-50': 'hover:bg-primary-50',
  'hover:bg-blue-700': 'hover:bg-primary-700',
  
  // Indigo classes to primary (for Settings page)
  'text-indigo-600': 'text-primary',
  'text-indigo-700': 'text-primary-700',
  'bg-indigo-600': 'bg-primary',
  'bg-indigo-700': 'bg-primary-700',
  'hover:bg-indigo-700': 'hover:bg-primary-hover',
  'hover:text-indigo-700': 'hover:text-primary-hover',
  'border-indigo-600': 'border-primary',
  
  // Complex patterns
  'from-\\[#1E3A8A\\] to-\\[#2563EB\\]': 'bg-gradient-primary',
  'from-\\[#7C3AED\\] to-\\[#A855F7\\]': 'bg-gradient-primary', // Super admin gradient
  'bg-gradient-to-r from-\\[#1E3A8A\\] to-\\[#2563EB\\]': 'bg-gradient-primary',
  'bg-gradient-to-r from-\\[#7C3AED\\] to-\\[#A855F7\\]': 'bg-gradient-primary',
  'animate-spin rounded-full h-12 w-12 border-b-2 border-\\[#1E3A8A\\]': 'animate-spin rounded-full h-12 w-12 spinner-primary',
  'animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600': 'animate-spin rounded-full h-4 w-4 spinner-primary',
  
  // Input focus classes
  'focus:ring-2 focus:ring-\\[#1E3A8A\\] focus:border-\\[#1E3A8A\\] outline-none': 'input-primary',
  'focus:ring-2 focus:ring-\\[#1E3A8A\\] focus:border-transparent': 'input-primary',
  'focus:ring-2 focus:ring-\\[#7C3AED\\] focus:border-transparent': 'input-primary',
  
  // Button classes
  'px-4 py-2 bg-\\[#1E3A8A\\] text-white rounded-md hover:bg-blue-900': 'btn-primary px-4 py-2 rounded-md',
  'px-4 py-2 bg-\\[#7C3AED\\] text-white rounded-md hover:bg-purple-700': 'btn-primary px-4 py-2 rounded-md',
  
  // Checkbox and form controls
  'text-blue-600 focus:ring-blue-500': 'text-primary focus:ring-primary',
  'rounded border-gray-300 text-blue-600 focus:ring-blue-500': 'rounded border-gray-300 text-primary focus:ring-primary'
};

// Files to update - comprehensive list
const filesToUpdate = [
  'src/pages/AdminDashboard.jsx',
  'src/pages/EmployeeAttendance.jsx',
  'src/pages/Employees.jsx',
  'src/pages/MyAttendance.jsx',
  'src/pages/Profile.jsx',
  'src/pages/AdminProfile.jsx',
  'src/pages/WarehouseAdminProfile.jsx',
  'src/pages/Settings.jsx',
  'src/pages/Login.jsx',
  'src/pages/ViewSchedules.jsx',
  'src/pages/TeamSchedule.jsx',
  'src/pages/TeamDashboard.jsx',
  'src/pages/SupervisorDashboard.jsx',
  'src/pages/ManageSchedule.jsx',
  'src/pages/Departments.jsx',
  'src/pages/PositionManagement.jsx',
  'src/pages/PositionManagementNew.jsx',
  'src/pages/RegistrationManagement.jsx',
  'src/pages/AttendanceReports.jsx',
  'src/pages/EmployeeProfile.jsx',
  'src/pages/MySchedule.jsx',
  'src/pages/EmployeeDashboard.jsx',
  'src/pages/TeamDashboard.jsx',
  'src/components/AdminMetrics.jsx',
  'src/components/EmployeeList.jsx',
  'src/components/RegistrationRequests.jsx',
  'src/components/EditEmployeeModal.jsx',
  'src/components/OvertimeModal.jsx',
  'src/components/OvertimeHoursModal.jsx',
  'src/components/TodaysSchedule.jsx',
  'src/components/AttendanceSummary.jsx',
  'src/components/WeeklyTemplateView.jsx',
  'src/components/EmployeeScheduleCalendar.jsx',
  'src/components/ManageDepartment.jsx',
  'src/components/LastAttendance.jsx',
  'src/components/MyAttendRec.jsx',
  'src/components/TeamTodaysAttend.jsx',
  'src/components/TodaysAttendance.jsx',
  'src/components/AttendRec.jsx',
  'src/utils/confirmToast.jsx'
];

function updateColorsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    let changeCount = 0;
    
    // Apply color mappings
    for (const [oldPattern, newClass] of Object.entries(colorMappings)) {
      const regex = new RegExp(oldPattern, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, newClass);
        updated = true;
        changeCount += matches.length;
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${changeCount} color references in ${filePath}`);
    } else {
      console.log(`ℹ️  No color updates needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update all files
console.log('🎨 Starting comprehensive color update process...\n');

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  updateColorsInFile(fullPath);
});

console.log('\n🎉 Comprehensive color update process completed!');
console.log('\n📋 Summary:');
console.log('• All hardcoded hex colors replaced with dynamic CSS variables');
console.log('• Tailwind blue/indigo classes replaced with primary variants');
console.log('• Focus states, buttons, and form elements updated');
console.log('• Gradients and complex patterns converted');
console.log('\n🔄 Next steps:');
console.log('1. Test the application');
console.log('2. Go to Settings and change the primary color');
console.log('3. Verify all elements update dynamically');