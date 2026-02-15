import { markMissedClockouts } from "../services/missedClockoutService.js";
import { getCurrentDateInTimezone } from "../utils/timezone.js";

console.log("🧪 Testing Missed Clock-out Service");
console.log("====================================");
console.log(`📅 Current date: ${getCurrentDateInTimezone()}`);
console.log("");

try {
  const result = await markMissedClockouts();
  
  console.log("");
  console.log("📊 Test Results:");
  console.log(`  - Sessions checked: ${result.checked}`);
  console.log(`  - Marked as missed clock-out: ${result.marked}`);
  console.log("");
  console.log("✅ Test completed successfully");
  
  process.exit(0);
} catch (error) {
  console.error("❌ Test failed:", error);
  process.exit(1);
}
