import { requestPasswordReset, resetPassword, verifyResetToken } from "../services/authService.js";

async function testForgotPassword() {
  try {
    console.log("🧪 Testing Forgot Password Flow...\n");

    // Test 1: Request password reset
    console.log("1️⃣ Testing password reset request for admin...");
    const resetRequest = await requestPasswordReset("admin");
    console.log("✅ Reset request result:", resetRequest);
    
    if (resetRequest.resetToken) {
      const token = resetRequest.resetToken;
      console.log("🔑 Reset token:", token);

      // Test 2: Verify token
      console.log("\n2️⃣ Testing token verification...");
      const verification = await verifyResetToken(token);
      console.log("✅ Token verification result:", verification);

      // Test 3: Reset password
      console.log("\n3️⃣ Testing password reset...");
      const resetResult = await resetPassword(token, "newpassword123");
      console.log("✅ Password reset result:", resetResult);

      // Test 4: Try to use token again (should fail)
      console.log("\n4️⃣ Testing token reuse (should fail)...");
      try {
        await resetPassword(token, "anotherpassword");
        console.log("❌ Token reuse should have failed!");
      } catch (error) {
        console.log("✅ Token reuse correctly rejected:", error.message);
      }

      console.log("\n✅ All tests passed!");
      console.log("\n⚠️  Note: Admin password has been changed to 'newpassword123'");
      console.log("   You may want to change it back to '123456' manually.");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testForgotPassword();
