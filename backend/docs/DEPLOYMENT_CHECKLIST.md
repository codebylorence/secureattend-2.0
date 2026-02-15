# Deployment Checklist: Missed Clock-out Feature

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Created `backend/services/missedClockoutService.js`
- [x] Modified `backend/server.js` to import and start the service
- [x] Added `triggerMissedClockoutCheck` endpoint to `backend/controllers/attendanceController.js`
- [x] Added route to `backend/routes/attendanceRoutes.js`
- [x] Created test script `backend/scripts/testMissedClockoutService.js`
- [x] Created documentation files

### ✅ Code Quality
- [x] No syntax errors (verified with getDiagnostics)
- [x] Proper imports and exports
- [x] Error handling implemented
- [x] Logging added for debugging

### ✅ Configuration
- [x] Uses existing `system-config.json` for timezone and grace period
- [x] No new environment variables required
- [x] No database schema changes needed

## Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "feat: Add automatic missed clock-out marking service"
git push origin main
```

### 2. Monitor Render Deployment
- Go to Render dashboard
- Watch the deployment logs
- Look for successful build and deployment

### 3. Verify Service Started
Check Render logs for these messages:
```
✅ Node.js Server running on port 5000
🚀 Starting missed clock-out marking job (runs every 5 minutes)
🕐 [Missed Clock-out Check] Starting check for 2026-02-15 at XX:XX (Asia/Manila)
```

### 4. Test Manual Trigger (Optional)
Use Postman or curl to test the manual trigger:
```bash
curl -X POST https://secureattend-2-0.onrender.com/api/attendances/check-missed-clockouts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "message": "Missed clock-out check completed",
  "summary": {
    "checked": 0,
    "marked": 0
  }
}
```

### 5. Monitor Automatic Checks
- Wait 5 minutes
- Check Render logs again
- Should see another `🕐 [Missed Clock-out Check]` message
- Verify it's running every 5 minutes

### 6. Verify Database Updates
- Log into web app as admin
- Go to Attendance Reports
- Look for any records with status "Missed Clock-out"
- Verify they were marked correctly (shift ended + grace period passed)

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Check logs every hour to ensure service is running
- [ ] Verify no errors in Render logs
- [ ] Check database for "Missed Clock-out" records
- [ ] Confirm timing is correct (marked after shift end + grace period)

### First Week
- [ ] Monitor daily for any issues
- [ ] Check if employees are being marked correctly
- [ ] Verify no false positives (employees marked incorrectly)
- [ ] Gather feedback from admins/supervisors

## Rollback Plan

If issues occur, rollback by:
1. Revert the commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Or temporarily disable by commenting out in `server.js`:
   ```javascript
   // startMissedClockoutJob(); // Temporarily disabled
   ```

## Success Criteria

✅ Service starts automatically when server starts
✅ Runs every 5 minutes without errors
✅ Correctly identifies employees who missed clock-out
✅ Only marks after shift end + grace period
✅ Logs are clear and helpful for debugging
✅ Manual trigger endpoint works for admins
✅ No performance impact on server

## Known Limitations

1. **Cannot test locally**: Requires production database connection
2. **5-minute delay**: Employees won't be marked immediately when shift ends
3. **Requires schedule**: Employees without schedules won't be checked
4. **Requires shift_end**: Schedules must have shift_end time set

## Future Enhancements

1. Make check interval configurable (currently hardcoded to 5 minutes)
2. Add notifications when employees are marked
3. Add dashboard widget showing missed clock-outs
4. Generate reports of frequent offenders
5. Option to auto-clock-out instead of just marking

## Support Contacts

- **Developer**: Kiro AI Assistant
- **Date Implemented**: February 15, 2026
- **Documentation**: See `MISSED_CLOCKOUT_IMPLEMENTATION.md`

## Notes

- This feature complements the biometric app's missed clock-out marking
- Both systems now mark missed clock-outs independently
- Biometric app marks during its sync cycle
- Backend marks every 5 minutes
- This ensures consistency across both systems
