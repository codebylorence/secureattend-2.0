// Test the Render backend overtime API directly
const RENDER_URL = 'https://secureattend-2-0.onrender.com';

async function testOvertimeAPI() {
  try {
    console.log('🧪 Testing Render backend overtime API...\n');
    
    // First, login to get a token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await fetch(`${RENDER_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, got token\n');
    
    // Now test the overtime eligible endpoint
    console.log('2️⃣ Fetching overtime eligible employees...');
    const overtimeResponse = await fetch(`${RENDER_URL}/api/attendances/overtime/eligible`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!overtimeResponse.ok) {
      console.error('❌ Overtime API failed:', overtimeResponse.status, overtimeResponse.statusText);
      const errorText = await overtimeResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const employees = await overtimeResponse.json();
    console.log('✅ Overtime API successful\n');
    console.log(`📊 Found ${employees.length} eligible employees:`);
    
    if (employees.length === 0) {
      console.log('   No employees eligible for overtime');
      console.log('\n💡 This could mean:');
      console.log('   - No employees have clocked in today on Render database');
      console.log('   - All clocked-in employees already have overtime assigned');
      console.log('   - The date on Render server is different from your local date');
    } else {
      employees.forEach(emp => {
        console.log(`   - ${emp.employee_id}: ${emp.firstname} ${emp.lastname} (${emp.department})`);
      });
      
      console.log(`\n🎯 Clarenz (TSI00061) is ${employees.find(e => e.employee_id === 'TSI00061') ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    }
    
    // Check server time
    console.log('\n3️⃣ Checking server time...');
    const timeResponse = await fetch(`${RENDER_URL}/api/system-config`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (timeResponse.ok) {
      const config = await timeResponse.json();
      console.log(`   Timezone: ${config.timezone || 'UTC'}`);
      console.log(`   Server time: ${new Date().toISOString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOvertimeAPI();
