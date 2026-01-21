import { verifyLogin } from "../services/authService.js";

async function testSupervisorLogin() {
  try {
    console.log("🔐 Testing supervisor login...");
    
    const result = await verifyLogin("supervisor", "supervisor123");
    
    console.log("✅ Login successful!");
    console.log("User data:", {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role,
      firstname: result.user.firstname,
      lastname: result.user.lastname
    });
    console.log("Token generated:", !!result.token);
    
  } catch (error) {
    console.error("❌ Login failed:", error.message);
  }
}

testSupervisorLogin();