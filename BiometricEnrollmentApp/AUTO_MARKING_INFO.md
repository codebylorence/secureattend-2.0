# Auto Absent Marking & Missed Clock-out

## ✅ ALREADY IMPLEMENTED

The biometric app automatically handles absent marking and missed clock-outs when it opens!

## How It Works

### On App Startup
When you open the biometric app (`MainWindow.xaml.cs`):

1. **Immediate Check** (Line 48-49)
   ```csharp
   // Run absent marking immediately on startup - check last 7 days to catch missed absences
   Task.Run(() => RunAbsentMarking(daysToCheck: 7));
   ```
   - Checks the last 7 days for any missed absences
   - Catches up on any employees who should have been marked absent
   - Processes missed clock-outs from previous days

2. **Background Timer** (Line 40-46)
   ```csharp
   // Start absent marking timer (runs every 30 seconds for real-time absent marking)
   _absentMarkingTimer = new DispatcherTimer();
   _absentMarkingTimer.Interval = TimeSpan.FromSeconds(30);
   _absentMarkingTimer.Tick += AbsentMarkingTimer_Tick;
   _absentMarkingTimer.Start();
   ```
   - Runs every 30 seconds while app is open
   - Checks last 7 days for comprehensive marking
   - Ensures no absences or missed clock-outs are missed

### What Gets Marked

#### Absent Marking
- Employee has a schedule for the date
- Shift has started (with grace period)
- No attendance session exists (no clock-in)
- Creates "Absent" status in local database
- Syncs to web app automatically

#### Missed Clock-out
- Employee clocked in but didn't clock out
- Shift has ended + 60 minute grace period
- Session still shows as "open" (no clock_out time)
- Marks as "Missed Clock-out" status
- Syncs to web app automatically

## Logs

Check the logs to see it working:
```
⏰ Running absent marking check (last 7 day(s))...
📅 Checking last 7 day(s) for missed absences and clock-outs
📅 Processing date: 2026-02-15
📋 Found 21 schedules for 2026-02-15
👤 Checking TSI00001 - Morning Shift (08:00-17:00)
⏰ Shift hasn't started yet
✅ Absent marking complete: 5 absent, 2 missed clock-outs
⚡ Triggering immediate sync for new absent/missed clock-out records...
```

## Configuration

The system uses these settings:

- **Startup check**: Last 7 days
- **Timer interval**: Every 30 seconds
- **Timer check range**: Last 7 days (comprehensive)
- **Grace period for shift start**: Configurable per shift
- **Grace period for missed clock-out**: 60 minutes after shift end
- **Auto-sync**: Immediately syncs new records to web app

## No Action Needed

The feature is already working! Just open the biometric app and it will:
1. Check for missed absences from the past week
2. Mark any missed clock-outs
3. Continue monitoring in real-time every 30 seconds (checking last 7 days)
4. Sync everything to the web app automatically

## Testing

To verify it's working:
1. Open the biometric app
2. Check the logs (look for "⏰ Running absent marking check")
3. Check the web app attendance page
4. You should see absent/missed clock-out records appear automatically
