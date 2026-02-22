import bcrypt from "bcryptjs";
import User from "../models/user.js";

async function resetAdminPassword() {
  try {
    console.log("🔄 Resetting admin password to '123456'...");

    const admin = await User.findOne({ where: { username: "admin" } });
    
    if (!admin) {
      console.log("❌ Admin user not found!");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash("123456", 10);
    await admin.update({ password: hashedPassword });

    console.log("✅ Admin password reset to '123456' successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    process.exit(1);
  }
}

resetAdminPassword();
