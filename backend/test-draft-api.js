import axios from "axios";

async function testDraftAPI() {
  try {
    console.log("🧪 Testing Draft API...\n");

    // Test 1: Create a draft
    console.log("1. Creating a draft...");
    const createResponse = await axios.post("http://localhost:5000/api/schedule-drafts", {
      employee_id: "TEST001",
      template_id: 1,
      days: ["Monday", "Tuesday"],
      assigned_by: "admin"
    });
    console.log("✅ Draft created:", createResponse.data);

    // Test 2: Get all drafts
    console.log("\n2. Getting all drafts...");
    const getResponse = await axios.get("http://localhost:5000/api/schedule-drafts");
    console.log("✅ Drafts found:", getResponse.data.length);

    // Test 3: Get draft count
    console.log("\n3. Getting draft count...");
    const countResponse = await axios.get("http://localhost:5000/api/schedule-drafts/count");
    console.log("✅ Draft count:", countResponse.data.count);

    console.log("\n✅ All API tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);
    console.error("URL:", error.config?.url);
    process.exit(1);
  }
}

testDraftAPI();
