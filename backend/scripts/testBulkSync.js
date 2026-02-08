import axios from 'axios';

async function testBulkSync() {
  try {
    console.log('🧪 Testing bulk sync endpoint...');
    
    // Simulate what the biometric app would send
    const testRecords = [
      {
        employee_id: 'TSI00003',
        date: '2026-02-07',
        clock_in: '2026-02-07T20:54:07Z',
        clock_out: null,
        status: 'Missed Clock-out',
        total_hours: 27.10,
        overtime_hours: null
      },
      {
        employee_id: 'TSI00006',
        date: '2026-02-07',
        clock_in: '2026-02-07T20:53:57Z',
        clock_out: null,
        status: 'Missed Clock-out',
        total_hours: 27.10,
        overtime_hours: null
      },
      {
        employee_id: 'TSI00005',
        date: '2026-02-07',
        clock_in: '2026-02-07T20:53:54Z',
        clock_out: null,
        status: 'Missed Clock-out',
        total_hours: 27.10,
        overtime_hours: null
      },
      {
        employee_id: 'TSI00004',
        date: '2026-02-07',
        clock_in: '2026-02-07T20:53:26Z',
        clock_out: null,
        status: 'Missed Clock-out',
        total_hours: 27.11,
        overtime_hours: null
      }
    ];
    
    console.log(`📤 Sending ${testRecords.length} records to sync endpoint...`);
    
    const response = await axios.post('http://localhost:5000/api/attendances/sync-from-biometric', {
      records: testRecords
    });
    
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBulkSync();
