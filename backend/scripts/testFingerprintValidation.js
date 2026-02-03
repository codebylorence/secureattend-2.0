import { assignEmployeesToTemplate } from '../services/scheduleTemplateService.js';
import { assignScheduleToEmployee } from '../services/employeeScheduleService.js';

async function testFingerprintValidation() {
  try {
    console.log('🧪 Testing fingerprint validation...');
    
    // Test 1: Try to assign an employee without fingerprint to a template
    console.log('\n1️⃣ Testing template assignment with employee without fingerprint...');
    try {
      await assignEmployeesToTemplate(1, ['TEST_EMPLOYEE_NO_FINGERPRINT'], 'test');
      console.log('❌ ERROR: Should have failed but succeeded');
    } catch (error) {
      console.log('✅ PASS: Template assignment correctly rejected:', error.message);
    }
    
    // Test 2: Try to assign an employee without fingerprint directly
    console.log('\n2️⃣ Testing direct assignment with employee without fingerprint...');
    try {
      await assignScheduleToEmployee({
        employee_id: 'TEST_EMPLOYEE_NO_FINGERPRINT',
        shift_name: 'Test Shift',
        start_time: '09:00',
        end_time: '17:00',
        days: ['Monday'],
        assigned_by: 'test'
      });
      console.log('❌ ERROR: Should have failed but succeeded');
    } catch (error) {
      console.log('✅ PASS: Direct assignment correctly rejected:', error.message);
    }
    
    console.log('\n✅ Fingerprint validation tests completed');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFingerprintValidation();