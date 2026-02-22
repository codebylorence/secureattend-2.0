import 'dotenv/config';
import { testEmailConnection, sendPasswordResetEmail } from "../services/emailService.js";

async function testEmail() {
  console.log("🧪 Testing Email Configuration...\n");

  // Test 1: Check connection
  console.log("1️⃣ Testing SMTP connection...");
  const connectionTest = await testEmailConnection();
  
  if (connectionTest.success) {
    console.log("✅ SMTP connection successful!\n");
    
    // Test 2: Send test email
    console.log("2️⃣ Sending test password reset email...");
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = "test-token-123456789";
    
    const emailResult = await sendPasswordResetEmail(testEmail, testToken);
    
    if (emailResult.sent) {
      console.log("✅ Test email sent successfully!");
      console.log(`📧 Check your inbox at: ${testEmail}`);
    } else {
      console.log("❌ Failed to send test email:", emailResult.error || emailResult.reason);
    }
  } else {
    console.log("❌ SMTP connection failed:", connectionTest.message);
    console.log("\n💡 Make sure you have configured the following in .env:");
    console.log("   - SMTP_HOST (e.g., smtp.gmail.com)");
    console.log("   - SMTP_PORT (e.g., 587)");
    console.log("   - SMTP_USER (your email address)");
    console.log("   - SMTP_PASS (your app password)");
    console.log("\n📖 For Gmail:");
    console.log("   1. Enable 2-Step Verification");
    console.log("   2. Go to Security > App passwords");
    console.log("   3. Generate app password for 'Mail'");
    console.log("   4. Use that password in SMTP_PASS");
  }

  process.exit(0);
}

testEmail();
