// This script checks specific employees' attendance status on the production database
// Run this to see what the server database actually has

console.log('To check James Tojon and Lorence Rodriguez attendance:');
console.log('');
console.log('1. Go to: https://secureattend-2-0.onrender.com/api/attendances?date=2026-02-10');
console.log('2. Look for:');
console.log('   - James Tojon - should show "Missed Clock-out" if clocked in but not out after shift ended');
console.log('   - Lorence Rodriguez (TSI12345) - should show "Absent" if scheduled but didn\'t clock in');
console.log('');
console.log('Or use this curl command:');
console.log('');
console.log('curl -H "Authorization: Bearer YOUR_TOKEN" "https://secureattend-2-0.onrender.com/api/attendances?date=2026-02-10"');
console.log('');
console.log('The biometric app shows data from its LOCAL SQLite database.');
console.log('The web app shows data from the SERVER PostgreSQL database.');
console.log('');
console.log('If they don\'t match, the biometric app needs to:');
console.log('1. Run the absent marking timer (runs every minute automatically)');
console.log('2. Sync the records to the server');
console.log('3. Or manually click "Sync" or "Refresh" in the biometric app');
