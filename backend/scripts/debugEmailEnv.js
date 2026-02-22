console.log("🔍 Checking Email Environment Variables...\n");

console.log("SMTP_HOST:", process.env.SMTP_HOST || "❌ NOT SET");
console.log("SMTP_PORT:", process.env.SMTP_PORT || "❌ NOT SET");
console.log("SMTP_SECURE:", process.env.SMTP_SECURE || "❌ NOT SET");
console.log("SMTP_USER:", process.env.SMTP_USER || "❌ NOT SET");
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✅ SET (hidden)" : "❌ NOT SET");
console.log("SYSTEM_NAME:", process.env.SYSTEM_NAME || "❌ NOT SET");

console.log("\n📝 Note: If variables show as NOT SET, the .env file isn't being loaded properly.");
