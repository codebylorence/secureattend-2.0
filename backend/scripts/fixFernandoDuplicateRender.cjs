// Script to fix Fernando duplicate attendance via API
const https = require('https');

const API_URL = 'https://secureattend-2-0.onrender.com/api';

// You'll need to get a valid admin token first
// Login and copy the token from localStorage
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual token

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    };
    
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixDuplicate() {
  try {
    console.log('🔍 Fetching today\'s attendance...');
    
    const attendances = await makeRequest('/attendance/today');
    
    console.log(`📊 Total records: ${attendances.length}`);
    
    // Find Fernando's records
    const fernandoRecords = attendances.filter(a => 
      a.employee_id === 'TSI00001' || 
      (a.employee && (a.employee.employee_id === 'TSI00001' || a.employee.firstname === 'Fernando'))
    );
    
    console.log(`\n👤 Fernando's records: ${fernandoRecords.length}`);
    fernandoRecords.forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  Employee ID: ${record.employee_id}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Clock In: ${record.clock_in || 'N/A'}`);
      console.log(`  Clock Out: ${record.clock_out || 'N/A'}`);
    });
    
    if (fernandoRecords.length > 1) {
      const absentRecord = fernandoRecords.find(r => r.status === 'Absent');
      const presentRecord = fernandoRecords.find(r => r.status === 'Present' || r.status === 'Late');
      
      if (absentRecord && presentRecord) {
        console.log(`\n🔧 Found duplicate: Absent (ID: ${absentRecord.id}) and Present (ID: ${presentRecord.id})`);
        console.log(`\n❌ To delete the Absent record, run:`);
        console.log(`   DELETE https://secureattend-2-0.onrender.com/api/attendance/${absentRecord.id}`);
        console.log(`\n   Or use this curl command:`);
        console.log(`   curl -X DELETE "${API_URL}/attendance/${absentRecord.id}" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('⚠️  NOTE: You need to replace ADMIN_TOKEN with a valid token from your browser');
console.log('   1. Login to the web app');
console.log('   2. Open browser console (F12)');
console.log('   3. Run: localStorage.getItem("token")');
console.log('   4. Copy the token and paste it in this script\n');

// Uncomment to run:
// fixDuplicate();
