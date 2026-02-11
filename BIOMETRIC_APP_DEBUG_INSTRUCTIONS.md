# Biometric App Absent Marking Debug Instructions

## What I Fixed

I found and fixed a **critical bug** in the absent marking logic:

### The Problem
The code was checking the `Status` field BEFORE checking if the employee had a missing clock-out. This meant:
- If James Tojon's status was "Present", the code would skip checking if he had a clock-out
- The logic would never reach the condition that marks "Missed Clock-out"

### The Solution
I reordered the logic to:
1. **FIRST** check if employee has clock-in but NO clock-out
2. **THEN** check the status field
3. This ensures employees with missing clock-outs are caught regardless of their current status

### Additional Improvements
- Added detailed logging at every step to help debug
- Added logging to show what session data was found (clock-in, clock-out, status)
- Added logging to show shift end time calculations
- Created a DiagnosticHelper class for comprehensive debugging

## How to Test the Fix

### Step 1: Rebuild the Biometric App
```bash
cd BiometricEnrollmentApp
dotnet build
```

### Step 2: Run the App
- Open the biometric app
- Wait for it to load (it will automatically sync schedules and run absent marking)

### Step 3: Check the Log File
The log file is located at:
```
C:\Users\[YourUsername]\AppData\Local\BiometricEnrollment\biometric_log.txt
```

Look for these key log entries:

#### A. Schedule Check
```
📅 Getting schedules for Monday (2026-02-10)
📊 Total schedules found for today: X
```
- If X = 0, schedules aren't syncing from server

#### B. Employee Check (for James TSI00111)
```
📋 Checking TSI00111: Shift [ShiftName] (XX:XX - XX:XX)
⏰ TSI00111 - Checking if shift ended (end time: XX:XX, grace: 30 min)
⏰ TSI00111 - Shift ended result: true/false
```
- If "Shift ended result: false", the shift hasn't ended yet

#### C. Session Check
```
📊 TSI00111 - Found session: ClockIn=10:53:55, ClockOut=NULL, Status=Present
🕐 TSI00111 - Marked as Missed Clock-out (clocked in at 10:53:55, shift ended at XX:XX, previous status: Present)
```
- This should show the status being updated from "Present" to "Missed Clock-out"

### Step 4: Verify in the UI
- Check the attendance grid in the biometric app
- James Tojon should now show "Missed Clock-out" status
- Lorence Rodriguez should show "Absent" status (if he didn't clock in)

## Common Issues and Solutions

### Issue 1: "No schedules found for today"
**Cause**: Schedules aren't syncing from server

**Solutions**:
1. Check network connection
2. Verify backend API is running: https://secureattend-2-0.onrender.com
3. Check if schedules are published in admin panel
4. Look for API errors in log file

### Issue 2: "Shift not ended yet"
**Cause**: Current time is before shift end + grace period

**Example**:
- Shift ends at 17:00 (5:00 PM)
- Grace period is 30 minutes
- Marking will only happen after 17:30 (5:30 PM)

**Solution**: Wait until shift end + grace period has passed

### Issue 3: "Already marked as [status]"
**Cause**: Employee was already marked in a previous run

**Solution**: This is normal - the app won't re-mark employees

### Issue 4: Still showing "Present" after fix
**Possible causes**:
1. App wasn't rebuilt after code changes
2. Shift hasn't ended + grace period yet
3. Schedule not found in database
4. Employee not enrolled (no fingerprints)

**Debug steps**:
1. Rebuild the app: `dotnet build`
2. Check log file for detailed information
3. Verify current time vs shift end time
4. Run diagnostics (see below)

## Running Diagnostics

I added a diagnostic helper that provides a comprehensive report. To use it:

### Option 1: Add a button to the UI
Add this to AttendancePage.xaml.cs in the button click handlers section:
```csharp
private void DiagnosticButton_Click(object sender, RoutedEventArgs e)
{
    RunDiagnostics();
}
```

### Option 2: Call it from code
The `RunDiagnostics()` method is already added to AttendancePage.xaml.cs. You can:
1. Add a button in the XAML
2. Or temporarily call it in the constructor for testing

The diagnostic report will show:
- Current date/time and timezone
- Total schedules in database
- Schedules for today
- Attendance sessions for today
- Detailed check for James Tojon (TSI00111)
- Detailed check for Lorence Rodriguez (TSI12345)
- Test run of absent marking logic

## What Should Happen Now

With the fix applied:

1. **On app startup**:
   - Syncs schedules from server (after 2 seconds)
   - Runs absent marking (after 3 seconds total)
   - Starts timer to run absent marking every minute

2. **Every minute**:
   - Checks all scheduled employees
   - For each employee with shift ended + grace period:
     - If no attendance session → Mark as "Absent"
     - If has clock-in but no clock-out → Mark as "Missed Clock-out"
   - Syncs new records to server

3. **For James Tojon** (TSI00111):
   - Has clock-in: 10:53:55
   - Has no clock-out
   - Should be marked as "Missed Clock-out" after his shift ends + 30 min grace

4. **For Lorence Rodriguez** (TSI12345):
   - Has no attendance session
   - Should be marked as "Absent" after his shift ends + 30 min grace

## Next Steps

1. **Rebuild the app** (IMPORTANT!)
2. **Run the app** and wait for automatic marking
3. **Check the log file** for detailed information
4. **Share the log entries** for James and Lorence if still not working
5. **Verify shift times** - what time do their shifts end?

## Questions to Answer

To help debug further, please provide:

1. What time is it now in Philippines? (Current time)
2. What time does James's shift end?
3. What time does Lorence's shift end?
4. What does the log file show for these employees?
5. Did you rebuild the app after the code changes?

## Log File Location

The log file is at:
```
%LOCALAPPDATA%\BiometricEnrollment\biometric_log.txt
```

Or in full path:
```
C:\Users\[YourUsername]\AppData\Local\BiometricEnrollment\biometric_log.txt
```

You can open it with Notepad or any text editor.
