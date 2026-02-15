# Missed Clock-out Automatic Marking Implementation

## Overview
This document describes the automatic missed clock-out marking system implemented for the web-based attendance system.

## Problem Statement
Previously, the web-based system did not automatically mark employees as "Missed Clock-out" when they:
1. Clocked in for their shift (Present or Late status)
2. Did not clock out before their shift ended
3. Their shift end time + grace period has passed

This functionality existed only in the biometric app, causing inconsistencies between the two systems.

## Solution
Implemented a scheduled background job that runs every 5 minutes to automatically check and mark missed clock-outs.

## Implementation Details

### 1. Service Layer (`backend/services/missedClockoutService.js`)

#### Main Function: `markMissedClockouts()`
- Runs every 5 minutes via `setInterval`
- Checks all open attendance sessions (clocked in, not clocked out)
- Compares current time with employee's scheduled shift end time + grace period
- Marks as "Missed Clock-out" if shift has ended

#### Logic Flow:
```
1. Get current date and time in configured timezone
2. Load grace period from system config (default: 30 minutes)
3. Find all attendance records with:
   - date = today
   - status = "Present" OR "Late"
   - clock_in IS NOT NULL
   - clock_out IS NULL
4. For each open session:
   a. Get employee's schedule for today
   b. Check if shift_end time exists
   c. Calculate if current_time >= shift_end + grace_period
   d. If yes, update status to "Missed Clock-out"
5. Return summary (checked count, marked count)
```

#### Helper Function: `hasShiftEndedWithGracePeriod()`
- Parses shift end time and current time (HH:mm format)
- Converts to minutes since midnight
- Adds grace period to shift end time
- Returns true if current time >= shift end + grace period

#### Startup Function: `startMissedClockoutJob()`
- Called when server starts
- Runs `markMissedClockouts()` immediately on startup
- Sets up interval to run every 5 minutes (300,000 ms)

### 2. Server Integration (`backend/server.js`)

Added to server startup sequence:
```javascript
import { startMissedClockoutJob } from "./services/missedClockoutService.js";

// In startServer() function:
startMissedClockoutJob();
```

### 3. Manual Trigger Endpoint

#### Controller (`backend/controllers/attendanceController.js`)
```javascript
export const triggerMissedClockoutCheck = async (req, res) => {
  const result = await markMissedClockouts();
  res.status(200).json({
    message: "Missed clock-out check completed",
    summary: { checked: result.checked, marked: result.marked }
  });
};
```

#### Route (`backend/routes/attendanceRoutes.js`)
```
POST /api/attendances/check-missed-clockouts
Auth: Admin only
```

This endpoint allows administrators to manually trigger the missed clock-out check without waiting for the scheduled interval.

## Configuration

### Grace Period
Configured in `backend/config/system-config.json`:
```json
{
  "clockOutGracePeriodMinutes": 30
}
```

Default: 30 minutes if not specified

### Timezone
Uses the configured timezone from `system-config.json`:
```json
{
  "timezone": "Asia/Manila"
}
```

All time comparisons are done in the configured timezone.

## Testing

### Test Script
Run the test script to verify the service works:
```bash
node backend/scripts/testMissedClockoutService.js
```

### Manual Trigger
Use the API endpoint to manually trigger a check:
```bash
curl -X POST https://secureattend-2-0.onrender.com/api/attendances/check-missed-clockouts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Logging

The service provides detailed console logging:
- `🕐` - Missed clock-out check start
- `📊` - Statistics (sessions found, checked, marked)
- `📋` - Individual employee check details
- `🕐` - Successful marking
- `✅` - Check completion summary
- `❌` - Errors

Example log output:
```
🕐 [Missed Clock-out Check] Starting check for 2026-02-15 at 17:35 (Asia/Manila)
⏰ Grace period: 30 minutes
📊 Found 3 open sessions (clocked in, not clocked out)
  📋 TSI00001: Shift ends at 17:00, current 17:35, ended+grace: true
  🕐 TSI00001: Marked as Missed Clock-out (shift ended at 17:00)
  📋 TSI00003: Shift ends at 18:00, current 17:35, ended+grace: false
  ✅ TSI00003: Shift still active or within grace period
✅ [Missed Clock-out Check] Complete: 1 marked out of 3 checked
```

## Comparison with Biometric App

### Biometric App (`DataService.cs`)
- Runs every time `MarkAbsentEmployees()` is called
- Checks local SQLite database
- Marks both absent and missed clock-out in same function
- Uses `HasShiftEndedWithGracePeriod()` helper

### Web Backend (This Implementation)
- Runs every 5 minutes automatically
- Checks PostgreSQL database
- Only marks missed clock-out (absent marking still handled by biometric app)
- Uses same logic as biometric app for consistency

## Key Differences from Absent Marking

| Feature | Absent Marking | Missed Clock-out Marking |
|---------|---------------|-------------------------|
| Trigger | Shift START + 30 min grace | Shift END + grace period |
| Condition | No clock_in | Has clock_in, no clock_out |
| Status Change | NULL → "Absent" | "Present"/"Late" → "Missed Clock-out" |
| Handled By | Biometric app only | Both biometric app AND backend |

## Future Improvements

1. **Configurable Check Interval**: Allow admins to configure how often the check runs (currently hardcoded to 5 minutes)

2. **Notification System**: Send notifications to employees/supervisors when missed clock-out is detected

3. **Auto Clock-out**: Option to automatically clock out employees at shift end + grace period (instead of just marking)

4. **Dashboard Widget**: Show real-time count of missed clock-outs on admin dashboard

5. **Report Generation**: Generate daily/weekly reports of missed clock-outs by department/employee

## Troubleshooting

### Issue: Employees not being marked
**Check:**
1. Is the server running? Check logs for `🚀 Starting missed clock-out marking job`
2. Does employee have a schedule for today? Check `EmployeeSchedule` table
3. Is `shift_end` time set in the schedule?
4. Has the grace period passed? Current time must be >= shift_end + grace_period
5. Is the employee's status "Present" or "Late"? (Not "Absent" or "Overtime")

### Issue: Wrong timezone
**Check:**
1. Verify `system-config.json` has correct timezone
2. Check server logs for timezone being used
3. Ensure timezone format is valid (e.g., "Asia/Manila", not "GMT+8")

### Issue: Grace period not working
**Check:**
1. Verify `clockOutGracePeriodMinutes` in `system-config.json`
2. Default is 30 minutes if not specified
3. Check logs for "⏰ Grace period: X minutes"

## Related Files

- `backend/services/missedClockoutService.js` - Main service implementation
- `backend/controllers/attendanceController.js` - Manual trigger endpoint
- `backend/routes/attendanceRoutes.js` - Route definition
- `backend/server.js` - Service startup
- `backend/scripts/testMissedClockoutService.js` - Test script
- `backend/config/system-config.json` - Configuration
- `BiometricEnrollmentApp/Services/DataService.cs` - Biometric app equivalent

## Date Implemented
February 15, 2026

## Author
Kiro AI Assistant
