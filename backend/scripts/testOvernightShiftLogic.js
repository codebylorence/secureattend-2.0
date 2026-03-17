/**
 * Test script to verify overnight shift logic for missed clock-out detection
 * This tests the hasShiftEndedWithGracePeriod function with various scenarios
 */

/**
 * Simulated version of hasShiftEndedWithGracePeriod for testing
 */
function hasShiftEndedWithGracePeriod(shiftEndTime, currentTime, gracePeriodMinutes) {
  try {
    // Parse times
    const [shiftHour, shiftMin] = shiftEndTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    console.log(`  📝 Parsing: shiftEnd=${shiftHour}:${shiftMin}, current=${currentHour}:${currentMin}`);
    
    // Create Date objects for proper time comparison
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Set current time
    const currentDateTime = new Date(today);
    currentDateTime.setHours(currentHour, currentMin, 0, 0);
    
    // Set shift end time
    let shiftEndDateTime = new Date(today);
    shiftEndDateTime.setHours(shiftHour, shiftMin, 0, 0);
    
    // CRITICAL: Handle overnight shifts
    // If shift ends in early morning (00:00-06:00), we need to determine if it's today or tomorrow
    if (shiftHour >= 0 && shiftHour < 6) {
      console.log(`  🔍 Shift ends in early morning (${shiftHour}:${shiftMin})`);
      // If we're currently in early morning (00:00-06:00) and shift ends in early morning
      if (currentHour >= 0 && currentHour < 6) {
        console.log(`  🔍 Current time is also early morning (${currentHour}:${currentMin})`);
        // Both current time and shift end are in early morning
        // Simple comparison: if now < shiftEndTime, shift hasn't ended
        if (currentDateTime < shiftEndDateTime) {
          console.log(`  🌅 Early morning shift still active - ends at ${shiftEndTime}, now is ${currentTime}`);
          return false;
        }
      }
      // If we're in afternoon/evening/night (after 12 PM) and shift ends in early morning
      // The shift ends tomorrow - this is an overnight shift
      else if (currentHour >= 12) {
        console.log(`  🔍 Current time is afternoon/evening/night (${currentHour}:${currentMin}), shift ends tomorrow`);
        shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
        console.log(`  🌙 Overnight shift detected - ends tomorrow at ${shiftEndTime}`);
        return false; // Shift hasn't ended yet since it ends tomorrow
      }
      // If we're in late morning (06:00-12:00) and shift ends in early morning
      // The shift already ended earlier today (no adjustment needed)
      else {
        console.log(`  🔍 Current time is late morning (${currentHour}:${currentMin}), shift ended earlier today`);
      }
    }
    
    // Add grace period to shift end time
    const shiftEndWithGrace = new Date(shiftEndDateTime);
    shiftEndWithGrace.setMinutes(shiftEndWithGrace.getMinutes() + gracePeriodMinutes);
    
    // Check if current time is past the shift end + grace period
    const ended = currentDateTime >= shiftEndWithGrace;
    
    console.log(`  🕐 Shift end: ${shiftEndTime}, Grace end: ${shiftEndWithGrace.toTimeString().slice(0, 5)}, Current: ${currentTime}, Ended: ${ended}`);
    
    return ended;
    
  } catch (error) {
    console.error(`❌ Error parsing times: shiftEndTime=${shiftEndTime}, currentTime=${currentTime}`, error);
    return false;
  }
}

// Test scenarios
console.log("🧪 Testing Overnight Shift Logic\n");

console.log("=== Scenario 1: Night shift (22:00-06:00), currently 22:55 ===");
console.log("Expected: Shift NOT ended (still active)");
let result1 = hasShiftEndedWithGracePeriod("06:00", "22:55", 30);
console.log(`Result: ${result1 ? "❌ FAILED - Marked as ended" : "✅ PASSED - Not ended"}\n`);

console.log("=== Scenario 2: Night shift (22:00-06:00), currently 06:35 ===");
console.log("Expected: Shift ended (past 06:00 + 30 min grace)");
let result2 = hasShiftEndedWithGracePeriod("06:00", "06:35", 30);
console.log(`Result: ${result2 ? "✅ PASSED - Ended" : "❌ FAILED - Not marked as ended"}\n`);

console.log("=== Scenario 3: Night shift (22:00-06:00), currently 06:15 ===");
console.log("Expected: Shift NOT ended (within 30 min grace period)");
let result3 = hasShiftEndedWithGracePeriod("06:00", "06:15", 30);
console.log(`Result: ${result3 ? "❌ FAILED - Marked as ended" : "✅ PASSED - Not ended"}\n`);

console.log("=== Scenario 4: Day shift (08:00-17:00), currently 17:35 ===");
console.log("Expected: Shift ended (past 17:00 + 30 min grace)");
let result4 = hasShiftEndedWithGracePeriod("17:00", "17:35", 30);
console.log(`Result: ${result4 ? "✅ PASSED - Ended" : "❌ FAILED - Not marked as ended"}\n`);

console.log("=== Scenario 5: Day shift (08:00-17:00), currently 17:15 ===");
console.log("Expected: Shift NOT ended (within 30 min grace period)");
let result5 = hasShiftEndedWithGracePeriod("17:00", "17:15", 30);
console.log(`Result: ${result5 ? "❌ FAILED - Marked as ended" : "✅ PASSED - Not ended"}\n`);

console.log("=== Scenario 6: Night shift (22:00-06:00), currently 23:30 ===");
console.log("Expected: Shift NOT ended (still active)");
let result6 = hasShiftEndedWithGracePeriod("06:00", "23:30", 30);
console.log(`Result: ${result6 ? "❌ FAILED - Marked as ended" : "✅ PASSED - Not ended"}\n`);

console.log("=== Scenario 7: Early morning shift (00:00-08:00), currently 08:35 ===");
console.log("Expected: Shift ended (past 08:00 + 30 min grace)");
let result7 = hasShiftEndedWithGracePeriod("08:00", "08:35", 30);
console.log(`Result: ${result7 ? "✅ PASSED - Ended" : "❌ FAILED - Not marked as ended"}\n`);

console.log("=== Summary ===");
const passed = [result1, result2, result3, result4, result5, result6, result7].filter((r, i) => {
  const expected = [false, true, false, true, false, false, true];
  return r === expected[i];
}).length;
console.log(`${passed}/7 tests passed`);
