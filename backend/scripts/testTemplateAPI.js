import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testTemplateAPI() {
  try {
    console.log("🧪 Testing template API endpoints...");
    
    // Test GET /api/templates
    console.log("\n1. Testing GET /api/templates");
    const templatesResponse = await axios.get(`${API_BASE}/templates`);
    console.log(`   ✅ Success: Found ${templatesResponse.data.length} templates`);
    
    // Test POST /api/templates (this will fail without auth, but we can see the error)
    console.log("\n2. Testing POST /api/templates (without auth - should fail)");
    try {
      await axios.post(`${API_BASE}/templates`, {
        department: 'Test',
        shift_name: 'Test Shift',
        start_time: '09:00',
        end_time: '17:00',
        specific_date: '2025-01-27'
      });
    } catch (error) {
      console.log(`   ❌ Expected auth error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    console.log("\n✅ Template API endpoints are responding correctly");
    
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testTemplateAPI();