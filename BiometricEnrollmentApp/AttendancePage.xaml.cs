using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AttendancePage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly SyncService _syncService;
        private CancellationTokenSource? _overlayCts;
        private CancellationTokenSource? _continuousScanCts;
        private static bool _isAttendancePageActive = false;
        private System.Timers.Timer? _clockTimer;
        private System.Timers.Timer? _absentMarkingTimer;
        private System.Timers.Timer? _gridRefreshTimer;
        
        // Double-tap prevention: Track recent scans per employee
        private static readonly Dictionary<string, DateTime> _lastScanTimes = new Dictionary<string, DateTime>();
        private static readonly object _scanLock = new object();
        
        // Configuration cache
        private static bool? _clockOutConfirmationEnabled = null;

        public AttendancePage() : this(new ZKTecoService()) { }

        public AttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);

            // Clear configuration cache to ensure fresh settings are loaded
            _clockOutConfirmationEnabled = null;
            LogHelper.Write("🔄 Configuration cache cleared on AttendancePage initialization");

            _zkService.OnStatus += (msg) => Dispatcher.Invoke(() => UpdateStatus(msg));
            Loaded += AttendancePage_Loaded;
            Unloaded += AttendancePage_Unloaded;

            // Start sync service for retry mechanism
            _syncService.StartSyncService();

            // Auto-sync deleted employees every 5 minutes
            var syncTimer = new System.Timers.Timer(5 * 60 * 1000); // every 5 minutes
            syncTimer.Elapsed += async (_, _) => await SyncDeletedEmployeesAsync();
            syncTimer.Start();

            // Start clock timer
            _clockTimer = new System.Timers.Timer(1000); // Update every second
            _clockTimer.Elapsed += (_, _) => Dispatcher.Invoke(UpdateClock);
            _clockTimer.Start();
            UpdateClock(); // Initial update
            
            // Start attendance grid auto-refresh timer (every 5 seconds for real-time updates)
            _gridRefreshTimer = new System.Timers.Timer(5000); // every 5 seconds
            _gridRefreshTimer.Elapsed += (_, _) => Dispatcher.Invoke(() => RefreshAttendances());
            _gridRefreshTimer.Start();
            
            // Start absent marking timer (runs every minute for real-time absent marking)
            _absentMarkingTimer = new System.Timers.Timer(60 * 1000); // every minute
            _absentMarkingTimer.Elapsed += async (_, _) => await MarkAndSyncAbsentEmployeesAsync();
            _absentMarkingTimer.Start();
            
            // Run absent marking immediately on startup
            Task.Run(async () => await MarkAndSyncAbsentEmployeesAsync());
            
            // Load schedules on startup (one-time)
            Task.Run(async () => 
            {
                await SyncSchedulesFromServerAsync();
            });
        }

        private void UpdateClock()
        {
            try
            {
                var now = TimezoneHelper.Now;
                
                // Update admin panel clock
                if (ClockTextBlock != null)
                {
                    ClockTextBlock.Text = now.ToString("HH:mm:ss");
                    DateTextBlock.Text = now.ToString("MMMM dd, yyyy");
                }
                
                // Update main display clock
                if (CurrentTimeText != null)
                {
                    CurrentTimeText.Text = now.ToString("HH:mm:ss");
                    CurrentDateText.Text = now.ToString("dddd, MMMM d, yyyy");
                }
            }
            catch { }
        }

        private void ShowEmployeeAttendanceResult(string employeeId, string employeeName, string status, DateTime timestamp)
        {
            try
            {
                Dispatcher.Invoke(() =>
                {
                    // Show employee name
                    EmployeeNameText.Text = employeeName;
                    EmployeeNameText.Visibility = Visibility.Visible;

                    // Show status message with appropriate color
                    var timeStr = TimezoneHelper.FormatTimeDisplay(timestamp);
                    var statusColor = status switch
                    {
                        "Present" => "#4CAF50", // Green
                        "Late" => "#FF9800",    // Orange
                        "DoubleTap" => "#FF5722", // Red for double-tap prevention
                        "Cancelled" => "#9E9E9E", // Gray for cancelled
                        _ => "#4CAF50"          // Default green
                    };

                    var actionText = status switch
                    {
                        "DoubleTap" => "Please wait before scanning again",
                        "Cancelled" => "Clock-out cancelled",
                        "Present" or "Late" => "Clock-in",
                        _ => "Clock-out"
                    };
                    
                    StatusMessage.Text = status == "DoubleTap" || status == "Cancelled" ? actionText : $"{actionText} successful at {timeStr}";
                    StatusMessage.Foreground = new System.Windows.Media.SolidColorBrush(
                        (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(statusColor));
                    StatusMessage.Visibility = Visibility.Visible;

                    // Try to load employee photo (skip for double-tap prevention and cancelled)
                    if (status != "DoubleTap" && status != "Cancelled")
                    {
                        LoadEmployeePhoto(employeeId);
                    }

                    // Hide the result after 5 seconds (or 3 seconds for double-tap/cancelled)
                    var hideDelay = status == "DoubleTap" || status == "Cancelled" ? 3000 : 5000;
                    var hideTimer = new System.Timers.Timer(hideDelay);
                    hideTimer.Elapsed += (_, _) => Dispatcher.Invoke(HideEmployeeResult);
                    hideTimer.AutoReset = false;
                    hideTimer.Start();
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error showing employee result: {ex.Message}");
            }
        }

        private void HideEmployeeResult()
        {
            try
            {
                EmployeeNameText.Visibility = Visibility.Collapsed;
                StatusMessage.Visibility = Visibility.Collapsed;
                EmployeePhoto.Visibility = Visibility.Collapsed;
                DefaultUserIcon.Visibility = Visibility.Visible;
            }
            catch { }
        }

        private async void LoadEmployeePhoto(string employeeId)
        {
            try
            {
                // Try to get employee photo from server
                var photoBase64 = await _apiService.GetEmployeePhotoAsync(employeeId);
                
                if (!string.IsNullOrEmpty(photoBase64))
                {
                    var photoBytes = Convert.FromBase64String(photoBase64);
                    var bitmap = new System.Windows.Media.Imaging.BitmapImage();
                    
                    using (var stream = new System.IO.MemoryStream(photoBytes))
                    {
                        bitmap.BeginInit();
                        bitmap.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                        bitmap.StreamSource = stream;
                        bitmap.EndInit();
                        bitmap.Freeze();
                    }
                    
                    EmployeePhoto.Source = bitmap;
                    EmployeePhoto.Visibility = Visibility.Visible;
                    DefaultUserIcon.Visibility = Visibility.Collapsed;
                }
                else
                {
                    // Keep default user icon if no photo available
                    EmployeePhoto.Visibility = Visibility.Collapsed;
                    DefaultUserIcon.Visibility = Visibility.Visible;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Could not load photo for {employeeId}: {ex.Message}");
                // Keep default user icon on error
                EmployeePhoto.Visibility = Visibility.Collapsed;
                DefaultUserIcon.Visibility = Visibility.Visible;
            }
        }

        private void AdminToggleBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (AdminPanel.Visibility == Visibility.Visible)
                {
                    // Switch to main attendance display
                    AdminPanel.Visibility = Visibility.Collapsed;
                    MainAttendanceDisplay.Visibility = Visibility.Visible;
                }
                else
                {
                    // Switch to admin panel
                    MainAttendanceDisplay.Visibility = Visibility.Collapsed;
                    AdminPanel.Visibility = Visibility.Visible;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error toggling view: {ex.Message}");
            }
        }

        private void ToggleViewBtn_Click(object sender, RoutedEventArgs e)
        {
            AdminToggleBtn_Click(sender, e);
        }

        private void AttendancePage_Unloaded(object? sender, RoutedEventArgs e)
        {
            // Stop continuous scanning when leaving attendance page
            _isAttendancePageActive = false;
            _continuousScanCts?.Cancel();
            _clockTimer?.Stop();
            _clockTimer?.Dispose();
            _gridRefreshTimer?.Stop();
            _gridRefreshTimer?.Dispose();
            _absentMarkingTimer?.Stop();
            _absentMarkingTimer?.Dispose();
            LogHelper.Write("📴 Attendance page unloaded - continuous scanning stopped");
        }
        
        private async Task MarkAndSyncAbsentEmployeesAsync()
        {
            try
            {
                LogHelper.Write("⏰ Running absent marking check...");
                
                // Mark absent employees locally (using current schedules in database)
                int markedAbsent = _dataService.MarkAbsentEmployees();
                
                LogHelper.Write($"📊 Absent marking result: {markedAbsent} new absent record(s)");
                
                // Only sync if new absent records were created
                if (markedAbsent > 0)
                {
                    LogHelper.Write($"📤 Syncing {markedAbsent} new absent record(s) to server...");
                    
                    // Get only the newly created absent records
                    var sessions = _dataService.GetTodaySessions();
                    var absentSessions = sessions.Where(s => s.Status == "Absent").ToList();
                    
                    int synced = 0;
                    int failed = 0;
                    foreach (var session in absentSessions)
                    {
                        try
                        {
                            LogHelper.Write($"  📤 Attempting to sync absent record for {session.EmployeeId}...");
                            
                            // Use sync service for absent records with retry mechanism
                            bool success = await _syncService.QueueAttendanceSync(
                                session.EmployeeId,
                                session.Id,
                                null,
                                null,
                                "Absent"
                            );
                            
                            if (success)
                            {
                                synced++;
                                LogHelper.Write($"  ✅ Successfully synced absent record for {session.EmployeeId}");
                            }
                            else
                            {
                                failed++;
                                LogHelper.Write($"  📝 Queued absent record for retry: {session.EmployeeId}");
                            }
                        }
                        catch (Exception ex)
                        {
                            failed++;
                            LogHelper.Write($"  ❌ Failed to sync absent record for {session.EmployeeId}: {ex.Message}");
                        }
                    }
                    
                    LogHelper.Write($"📊 Sync complete: {synced} succeeded, {failed} queued for retry");
                    
                    // Refresh the attendance grid immediately
                    Dispatcher.Invoke(() => 
                    {
                        RefreshAttendances();
                        if (failed == 0)
                        {
                            UpdateStatus($"✅ {markedAbsent} new absent, all synced to server");
                        }
                        else
                        {
                            UpdateStatus($"📝 {markedAbsent} new absent, {synced} synced, {failed} queued for retry");
                        }
                    });
                }
                else
                {
                    LogHelper.Write("ℹ️ No new absent records to sync");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in absent marking: {ex.Message}");
            }
        }

        private async Task SyncSchedulesFromServerAsync()
        {
            try
            {
                LogHelper.Write("📥 Syncing schedules from server...");
                
                var schedules = await _apiService.GetPublishedSchedulesAsync();
                
                if (schedules != null && schedules.Count > 0)
                {
                    int updated = _dataService.UpdateSchedules(schedules);
                    LogHelper.Write($"✅ Synced {updated} schedule(s) from server");
                }
                else
                {
                    LogHelper.Write("ℹ️ No published schedules found on server");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error syncing schedules: {ex.Message}");
            }
        }

        private void AttendancePage_Loaded(object? sender, RoutedEventArgs e)
        {
            // Mark attendance page as active
            _isAttendancePageActive = true;
            
            // initialize device and try loading enrollments into SDK DB (best-effort)
            Task.Run(async () =>
            {
                try
                {
                    // First, sync with server to remove deleted employees
                    await SyncDeletedEmployeesAsync();

                    if (_zkService.EnsureInitialized())
                    {
                        // Load templates to SDK so identify works immediately
                        LogHelper.Write("Loading enrollments to SDK...");
                        _zkService.LoadEnrollmentsToSdk(_data_service_get());
                        
                        // Verify templates were loaded
                        // var enrollments = _data_service_get().GetAllEnrollmentsWithRowId();
                        // LogHelper.Write($"Total enrollments in database: {enrollments.Count}");
                        
                        Dispatcher.Invoke(() => UpdateStatus($"Place finger to scan..."));
                        
                        // Start continuous scanning
                        StartContinuousScanning();
                    }
                    else
                    {
                        Dispatcher.Invoke(() => UpdateStatus("⚠️ Device not connected."));
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"Init/load failed: {ex}");
                    Dispatcher.Invoke(() => UpdateStatus($"Init error: {ex.Message}"));
                }

                Dispatcher.Invoke(() => RefreshAttendances());
            });
        }

        private void StartContinuousScanning()
        {
            // Cancel any existing scanning task
            _continuousScanCts?.Cancel();
            _continuousScanCts = new CancellationTokenSource();
            var token = _continuousScanCts.Token;

            Task.Run(async () =>
            {
                LogHelper.Write("🔄 Starting continuous attendance scanning...");
                
                while (!token.IsCancellationRequested && _isAttendancePageActive)
                {
                    try
                    {
                        // Check if still on attendance page
                        if (!_isAttendancePageActive)
                        {
                            LogHelper.Write("📴 Attendance page inactive - stopping scan loop");
                            break;
                        }

                        // Check if device is still initialized
                        if (!_zkService.EnsureInitialized())
                        {
                            await Task.Delay(2000, token);
                            continue;
                        }

                        // Try to capture and identify
                        await Task.Run(() => QuickScanAndProcess(), token);
                        
                        // Small delay between scans
                        await Task.Delay(500, token);
                    }
                    catch (OperationCanceledException)
                    {
                        LogHelper.Write("📴 Continuous scanning cancelled");
                        break;
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Continuous scan error: {ex.Message}");
                        await Task.Delay(2000, token);
                    }
                }
                
                LogHelper.Write("🛑 Continuous attendance scanning stopped");
            }, token);
        }

        private void QuickScanAndProcess()
        {
            try
            {
                // Quick capture (2 second timeout)
                var capturedBase64 = _zkService.CaptureSingleTemplate(2, CancellationToken.None);
                
                if (string.IsNullOrEmpty(capturedBase64))
                {
                    return; // No finger detected, continue loop
                }

                Dispatcher.Invoke(() => UpdateStatus("🔍 Identifying..."));

                // Identify
                byte[] capturedBytes = Convert.FromBase64String(capturedBase64);
                var (fid, score) = _zkService.IdentifyTemplate(capturedBytes);

                LogHelper.Write($"SDK Identify result: fid={fid}, score={score}");

                string matchedEmployeeId = string.Empty;
                string matchedName = string.Empty;
                bool matched = false;

                // Try SDK match first (accept if fid > 0, regardless of score since score might be -1)
                if (fid > 0)
                {
                    var enrollment = _data_service_get().GetAllEnrollmentsWithRowId()
                        .FirstOrDefault(e => e.RowId == fid);

                    if (!string.IsNullOrEmpty(enrollment.EmployeeId))
                    {
                        matchedEmployeeId = enrollment.EmployeeId;
                        matchedName = enrollment.Name;
                        matched = true;
                        LogHelper.Write($"✅ SDK matched: {matchedName} ({matchedEmployeeId})");
                    }
                }

                // If SDK didn't match, try fallback matching
                if (!matched)
                {
                    LogHelper.Write("SDK didn't match, trying fallback matching...");
                    var enrollments = _data_service_get().GetAllEnrollments();
                    const double MatchThreshold = 0.55; // Lowered threshold
                    double bestScore = 0.0;

                    foreach (var en in enrollments)
                    {
                        if (string.IsNullOrEmpty(en.Template)) continue;
                        try
                        {
                            var storedBytes = Convert.FromBase64String(en.Template);
                            double sim = ComputeTemplateSimilarity(capturedBytes, storedBytes);
                            
                            if (sim > bestScore)
                            {
                                bestScore = sim;
                                matchedEmployeeId = en.EmployeeId;
                                matchedName = en.Name;
                            }
                        }
                        catch (Exception ex)
                        {
                            LogHelper.Write($"Fallback compare error for {en.EmployeeId}: {ex.Message}");
                            continue;
                        }
                    }

                    if (bestScore >= MatchThreshold)
                    {
                        matched = true;
                        LogHelper.Write($"✅ Fallback matched: {matchedName} ({matchedEmployeeId}) with score {bestScore:F4}");
                    }
                    else
                    {
                        LogHelper.Write($"❌ No match found. Best score: {bestScore:F4}");
                    }
                }

                if (matched && !string.IsNullOrEmpty(matchedEmployeeId))
                {
                    // Double-tap prevention: Check if this employee scanned recently
                    lock (_scanLock)
                    {
                        if (_lastScanTimes.ContainsKey(matchedEmployeeId))
                        {
                            var timeSinceLastScan = (TimezoneHelper.Now - _lastScanTimes[matchedEmployeeId]).TotalSeconds;
                            if (timeSinceLastScan < 10) // 10 second cooldown
                            {
                                var waitTime = Math.Ceiling(10 - timeSinceLastScan);
                                Dispatcher.Invoke(() => 
                                {
                                    UpdateStatus($"⚠️ Please wait {waitTime} seconds before scanning again");
                                    ShowEmployeeAttendanceResult(matchedEmployeeId, matchedName, "DoubleTap", TimezoneHelper.Now);
                                });
                                LogHelper.Write($"⚠️ Double-tap prevention: {matchedEmployeeId} scanned {timeSinceLastScan:F1}s ago, blocking");
                                Thread.Sleep(3000);
                                return;
                            }
                        }
                        
                        // Update last scan time for this employee
                        _lastScanTimes[matchedEmployeeId] = TimezoneHelper.Now;
                        
                        // Clean up old entries (older than 30 seconds)
                        var cutoffTime = TimezoneHelper.Now.AddSeconds(-30);
                        var keysToRemove = _lastScanTimes.Where(kvp => kvp.Value < cutoffTime).Select(kvp => kvp.Key).ToList();
                        foreach (var key in keysToRemove)
                        {
                            _lastScanTimes.Remove(key);
                        }
                    }

                    Dispatcher.Invoke(() => UpdateStatus($"✅ Identified: {matchedName} ({matchedEmployeeId})"));
                    
                    // Process attendance - clock in/out logic
                    var now = TimezoneHelper.Now;
                    try
                    {
                        long openSessionId = _data_service_get().GetOpenSessionId(matchedEmployeeId, now);

                        if (openSessionId > 0)
                        {
                            LogHelper.Write($"🔍 Found open session {openSessionId} for {matchedEmployeeId} - processing clock-out");
                            
                            // Found open session - this is a clock-out request
                            DateTime clockInTime = DateTime.MinValue;
                            
                            // Get session details
                            var sessions = _data_service_get().GetTodaySessions();
                            var session = sessions.FirstOrDefault(s => s.Id == openSessionId);
                            
                            if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                            {
                                clockInTime = DateTime.Parse(session.ClockIn);
                                LogHelper.Write($"🔍 Session found - Clock-in: {clockInTime}, checking confirmation setting...");
                                
                                // Check if confirmation is enabled
                                if (IsClockOutConfirmationEnabled())
                                {
                                    LogHelper.Write("🔍 Clock-out confirmation is ENABLED - showing dialog");
                                    
                                    // Show confirmation dialog on UI thread and wait for result
                                    bool shouldClockOut = false;
                                    Dispatcher.Invoke(() =>
                                    {
                                        LogHelper.Write("🔍 Creating and showing confirmation dialog...");
                                        var confirmDialog = new ConfirmationDialog();
                                        
                                        // Set proper window ownership for modal behavior
                                        var parentWindow = Application.Current.MainWindow;
                                        if (parentWindow != null)
                                        {
                                            confirmDialog.Owner = parentWindow;
                                            LogHelper.Write("🔍 Set dialog owner to main window");
                                        }
                                        else
                                        {
                                            LogHelper.Write("🔍 WARNING - No main window found, dialog may appear behind");
                                        }
                                        
                                        // Ensure dialog appears on top and centered
                                        confirmDialog.Topmost = true;
                                        confirmDialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                                        
                                        confirmDialog.SetEmployeeInfo(matchedName, matchedEmployeeId, clockInTime);
                                        
                                        LogHelper.Write("🔍 About to show confirmation dialog");
                                        var result = confirmDialog.ShowDialog();
                                        shouldClockOut = result == true && confirmDialog.IsConfirmed;
                                        
                                        LogHelper.Write($"🔍 Dialog result: {result}, IsConfirmed: {confirmDialog.IsConfirmed}, shouldClockOut: {shouldClockOut}");
                                        
                                        if (!shouldClockOut)
                                        {
                                            UpdateStatus("❌ Clock-out cancelled by user");
                                            ShowEmployeeAttendanceResult(matchedEmployeeId, matchedName, "Cancelled", now);
                                        }
                                    });
                                    
                                    if (!shouldClockOut)
                                    {
                                        LogHelper.Write("❌ User cancelled clock-out - stopping process");
                                        // User cancelled, don't process clock-out
                                        Thread.Sleep(2000);
                                        return;
                                    }
                                    
                                    LogHelper.Write("✅ User confirmed clock-out - proceeding");
                                }
                                else
                                {
                                    LogHelper.Write("🔍 Clock-out confirmation is DISABLED - proceeding directly");
                                }
                            }
                            
                            // User confirmed or confirmation disabled - proceed with clock-out
                            LogHelper.Write("💾 Saving clock-out to database...");
                            double hours = _data_service_get().SaveClockOut(openSessionId, now);
                            
                            // Send clock-out to server
                            if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                            {
                                // Keep the original status (Present or Late) when clocking out
                                string finalStatus = session.Status; // Will be "Present" or "Late"
                                
                                // Send clock-out to server using sync service with retry mechanism
                                Task.Run(async () => 
                                {
                                    bool syncSuccess = await _syncService.QueueAttendanceSync(matchedEmployeeId, session.Id, clockInTime, now, finalStatus);
                                    Dispatcher.Invoke(() => 
                                    {
                                        if (syncSuccess)
                                        {
                                            UpdateStatus($"✅ Clock-out synced to server. Hours: {hours:F2}");
                                        }
                                        else
                                        {
                                            UpdateStatus($"⚠️ Clock-out recorded, queued for sync. Hours: {hours:F2}");
                                        }
                                    });
                                });
                            }
                            
                            // Show employee result on main display
                            Dispatcher.Invoke(() => ShowEmployeeAttendanceResult(matchedEmployeeId, matchedName, "Clock-out", now));
                        }
                        else
                        {
                            // No open session. Check if employee is scheduled today
                            var scheduleCheck = _data_service_get().IsEmployeeScheduledToday(matchedEmployeeId);
                            
                            if (!scheduleCheck.IsScheduled)
                            {
                                // Check if employee has overtime assignment
                                bool hasOvertime = _data_service_get().HasOvertimeAssignment(matchedEmployeeId);
                                
                                if (hasOvertime)
                                {
                                    LogHelper.Write($"⏰ Employee {matchedEmployeeId} has overtime assignment - allowing clock-in");
                                    
                                    // Check if already completed overtime today
                                    bool hasCompletedOvertime = false;
                                    try
                                    {
                                        var todaySessions = _data_service_get().GetTodaySessions();
                                        hasCompletedOvertime = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && s.Status == "Overtime" && !string.IsNullOrEmpty(s.ClockIn));
                                    }
                                    catch (Exception ex)
                                    {
                                        LogHelper.Write($"Overtime session check failed: {ex}");
                                        hasCompletedOvertime = false;
                                    }

                                    if (hasCompletedOvertime)
                                    {
                                        Dispatcher.Invoke(() => UpdateStatus($"⚠️ Already clocked in for overtime today."));
                                    }
                                    else
                                    {
                                        // Create overtime clock-in
                                        long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, "Overtime");
                                        
                                        if (sid > 0)
                                        {
                                            // Send overtime clock-in to server
                                            Task.Run(async () => 
                                            {
                                                bool syncSuccess = await _syncService.QueueAttendanceSync(matchedEmployeeId, sid, now, null, "Overtime");
                                                Dispatcher.Invoke(() => 
                                                {
                                                    if (syncSuccess)
                                                    {
                                                        UpdateStatus($"⏰ Overtime clock-in synced to server");
                                                    }
                                                    else
                                                    {
                                                        UpdateStatus($"⏰ Overtime clock-in recorded, queued for sync");
                                                    }
                                                });
                                            });
                                            
                                            // Show employee result on main display
                                            Dispatcher.Invoke(() => ShowEmployeeAttendanceResult(matchedEmployeeId, matchedName, "Overtime", now));
                                        }
                                        else
                                        {
                                            Dispatcher.Invoke(() => UpdateStatus("⚠️ Overtime clock-in failed."));
                                        }
                                    }
                                }
                                else
                                {
                                    Dispatcher.Invoke(() => UpdateStatus($"⚠️ {matchedEmployeeId} is not scheduled to work today."));
                                    LogHelper.Write($"⚠️ Attendance denied: {matchedEmployeeId} not scheduled for {TimezoneHelper.Now.DayOfWeek}");
                                }
                            }
                            else
                            {
                                // Check if current time is within shift time window
                                var timeWindowCheck = _data_service_get().IsWithinShiftTimeWindow(scheduleCheck.StartTime, scheduleCheck.EndTime);
                                
                                if (!timeWindowCheck.IsWithinShiftTime)
                                {
                                    Dispatcher.Invoke(() => UpdateStatus($"⚠️ {timeWindowCheck.Message}"));
                                    LogHelper.Write($"⚠️ Attendance denied: {matchedEmployeeId} - {timeWindowCheck.Message}");
                                }
                                else
                                {
                                    // Check if already completed today
                                    bool hasCompleted = false;
                                    try
                                    {
                                        var todaySessions = _data_service_get().GetTodaySessions();
                                        hasCompleted = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && (s.Status == "Present" || s.Status == "Late"));
                                    }
                                    catch (Exception ex)
                                    {
                                        LogHelper.Write($"Completed-session check failed: {ex}");
                                        hasCompleted = false;
                                    }

                                    if (hasCompleted)
                                    {
                                        Dispatcher.Invoke(() => UpdateStatus($"⚠️ Already clocked in for today."));
                                    }
                                    else
                                    {
                                        // Determine status based on shift start time
                                        string status = _data_service_get().DetermineAttendanceStatus(now, scheduleCheck.StartTime);
                                        
                                        // create new clock-in
                                        long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, status);
                                        
                                        if (sid > 0)
                                        {
                                            // Send clock-in to server using sync service with retry mechanism
                                            Task.Run(async () => 
                                            {
                                                bool syncSuccess = await _syncService.QueueAttendanceSync(matchedEmployeeId, sid, now, null, status);
                                                Dispatcher.Invoke(() => 
                                                {
                                                    string statusEmoji = status == "Late" ? "⏰" : "✅";
                                                    if (syncSuccess)
                                                    {
                                                        UpdateStatus($"{statusEmoji} Clock-in synced to server - {status}");
                                                    }
                                                    else
                                                    {
                                                        UpdateStatus($"{statusEmoji} Clock-in recorded, queued for sync - {status}");
                                                    }
                                                });
                                            });
                                            
                                            // Show employee result on main display
                                            Dispatcher.Invoke(() => ShowEmployeeAttendanceResult(matchedEmployeeId, matchedName, status, now));
                                        }
                                        else
                                        {
                                            Dispatcher.Invoke(() => UpdateStatus("⚠️ Clock-in failed."));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Clock-in/out processing failed: {ex}");
                        Dispatcher.Invoke(() => UpdateStatus("⚠️ Attendance processing failed."));
                    }
                    
                    // Refresh the grid
                    Dispatcher.Invoke(() => RefreshAttendances());
                    
                    // Wait before next scan
                    Thread.Sleep(2000);
                }
                else
                {
                    Dispatcher.Invoke(() => UpdateStatus("❌ Fingerprint not recognized. Try again..."));
                    Thread.Sleep(1500);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Quick scan error: {ex.Message}");
            }
        }

        private DataService _data_service_get() => _dataService;

        private bool IsClockOutConfirmationEnabled()
        {
            if (_clockOutConfirmationEnabled.HasValue)
            {
                LogHelper.Write($"📋 Using cached clock-out confirmation setting: {_clockOutConfirmationEnabled.Value}");
                return _clockOutConfirmationEnabled.Value;
            }

            try
            {
                var configPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "config", "system-config.json");
                LogHelper.Write($"📋 Reading config from: {configPath}");
                
                if (System.IO.File.Exists(configPath))
                {
                    var configJson = System.IO.File.ReadAllText(configPath);
                    LogHelper.Write($"📋 Config JSON: {configJson}");
                    
                    var config = System.Text.Json.JsonSerializer.Deserialize<SystemConfig>(configJson, new System.Text.Json.JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    _clockOutConfirmationEnabled = config?.ClockOutConfirmation ?? true; // Default to true
                    LogHelper.Write($"📋 Clock-out confirmation setting loaded: {_clockOutConfirmationEnabled}");
                }
                else
                {
                    _clockOutConfirmationEnabled = true; // Default to enabled
                    LogHelper.Write("📋 Config file not found, using default clock-out confirmation: enabled");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Error reading config, using default clock-out confirmation: {ex.Message}");
                _clockOutConfirmationEnabled = true; // Default to enabled on error
            }

            return _clockOutConfirmationEnabled.Value;
        }

        private void TestClockOutBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LogHelper.Write("🧪 TEST: Starting clock-out confirmation test - BUTTON CLICKED!");
                UpdateStatus("🧪 TEST: Button clicked - starting test...");
                
                // Create a test session for employee 001 (Lorence Rodriguez)
                var testEmployeeId = "001";
                var testEmployeeName = "Lorence Rodriguez";
                var testClockInTime = TimezoneHelper.Now.AddHours(-2); // 2 hours ago
                
                // Create a test session in the database
                var sessionId = _dataService.SaveClockIn(testEmployeeId, testClockInTime, "Present");
                LogHelper.Write($"🧪 TEST: Created test session {sessionId} for {testEmployeeId}");
                
                // Now simulate the clock-out process
                var now = TimezoneHelper.Now;
                LogHelper.Write($"🧪 TEST: Simulating clock-out for session {sessionId}");
                
                // Check if confirmation is enabled
                if (IsClockOutConfirmationEnabled())
                {
                    LogHelper.Write("🧪 TEST: Clock-out confirmation is ENABLED - showing dialog");
                    UpdateStatus("🧪 TEST: Showing confirmation dialog...");
                    
                    try
                    {
                        // Show confirmation dialog with proper window ownership
                        var confirmDialog = new ConfirmationDialog();
                        
                        // Set the owner to ensure proper modal behavior
                        var parentWindow = Window.GetWindow(this);
                        if (parentWindow != null)
                        {
                            confirmDialog.Owner = parentWindow;
                            LogHelper.Write("🧪 TEST: Set dialog owner to parent window");
                        }
                        else
                        {
                            LogHelper.Write("🧪 TEST: WARNING - No parent window found, dialog may appear behind");
                        }
                        
                        // Ensure dialog appears on top
                        confirmDialog.Topmost = true;
                        confirmDialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                        
                        LogHelper.Write("🧪 TEST: Setting employee info on dialog");
                        confirmDialog.SetEmployeeInfo(testEmployeeName, testEmployeeId, testClockInTime);
                        
                        LogHelper.Write("🧪 TEST: About to show dialog - this should be visible!");
                        
                        // Show modal dialog properly
                        var result = confirmDialog.ShowDialog();
                        bool shouldClockOut = result == true && confirmDialog.IsConfirmed;
                        
                        LogHelper.Write($"🧪 TEST: Dialog result: {result}, IsConfirmed: {confirmDialog.IsConfirmed}, shouldClockOut: {shouldClockOut}");
                        
                        if (shouldClockOut)
                        {
                            // User confirmed - proceed with clock-out
                            double hours = _dataService.SaveClockOut(sessionId, now);
                            LogHelper.Write($"🧪 TEST: Clock-out confirmed and saved. Hours: {hours:F2}");
                            UpdateStatus($"✅ TEST: Clock-out confirmed! Hours worked: {hours:F2}");
                            ShowEmployeeAttendanceResult(testEmployeeId, testEmployeeName, "Clock-out", now);
                        }
                        else
                        {
                            // User cancelled
                            LogHelper.Write("🧪 TEST: Clock-out cancelled by user");
                            UpdateStatus("❌ TEST: Clock-out cancelled by user");
                            ShowEmployeeAttendanceResult(testEmployeeId, testEmployeeName, "Cancelled", now);
                            
                            // Clean up the test session
                            LogHelper.Write($"🧪 TEST: Would clean up test session {sessionId} (delete method needed)");
                        }
                    }
                    catch (Exception dialogEx)
                    {
                        LogHelper.Write($"🧪 TEST: Dialog error: {dialogEx.Message}");
                        LogHelper.Write($"🧪 TEST: Dialog stack trace: {dialogEx.StackTrace}");
                        UpdateStatus($"❌ TEST: Dialog error - {dialogEx.Message}");
                    }
                }
                else
                {
                    LogHelper.Write("🧪 TEST: Clock-out confirmation is DISABLED");
                    UpdateStatus("⚠️ TEST: Clock-out confirmation is disabled in settings");
                    
                    // Clean up the test session
                    LogHelper.Write($"🧪 TEST: Would clean up test session {sessionId} (delete method needed)");
                }
                
                // Refresh the attendance grid
                RefreshAttendances();
                
            }
            catch (Exception ex)
            {
                LogHelper.Write($"🧪 TEST ERROR: {ex.Message}");
                LogHelper.Write($"🧪 TEST ERROR STACK: {ex.StackTrace}");
                UpdateStatus($"❌ TEST ERROR: {ex.Message}");
            }
        }

        private void SimpleTestBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LogHelper.Write("🔍 SIMPLE TEST: Button clicked!");
                UpdateStatus("🔍 SIMPLE TEST: Showing basic dialog...");
                
                // Create and show a simple confirmation dialog
                var confirmDialog = new ConfirmationDialog();
                
                // Set the owner to ensure proper modal behavior
                var parentWindow = Window.GetWindow(this);
                if (parentWindow != null)
                {
                    confirmDialog.Owner = parentWindow;
                    LogHelper.Write("🔍 SIMPLE TEST: Set dialog owner");
                }
                
                // Set test employee info
                confirmDialog.SetEmployeeInfo("Test Employee", "TEST001", TimezoneHelper.Now.AddHours(-1));
                
                LogHelper.Write("🔍 SIMPLE TEST: About to show dialog");
                
                // Show the dialog
                var result = confirmDialog.ShowDialog();
                
                LogHelper.Write($"🔍 SIMPLE TEST: Dialog closed with result: {result}");
                UpdateStatus($"🔍 SIMPLE TEST: Dialog result = {result}");
                
                if (result == true)
                {
                    UpdateStatus("✅ SIMPLE TEST: User clicked Confirm");
                }
                else
                {
                    UpdateStatus("❌ SIMPLE TEST: User clicked Cancel or closed dialog");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"🔍 SIMPLE TEST ERROR: {ex.Message}");
                LogHelper.Write($"🔍 SIMPLE TEST STACK: {ex.StackTrace}");
                UpdateStatus($"❌ SIMPLE TEST ERROR: {ex.Message}");
            }
        }

        private void UpdateStatus(string message)
        {
            try { StatusTextBlock.Text = message; } catch { }
            LogHelper.Write(message);
        }

        private void GoEnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            try 
            { 
                // Stop continuous scanning before navigating to enrollment
                _isAttendancePageActive = false;
                _continuousScanCts?.Cancel();
                LogHelper.Write("📴 Navigating to enrollment - stopping attendance scanning");
                
                NavigationService?.Navigate(new EnrollmentPage(_zkService)); 
            }
            catch (Exception ex) { UpdateStatus($"❌ Navigation error: {ex.Message}"); }
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                UpdateStatus("🔄 Refreshing attendance list...");
                RefreshAttendances();
                UpdateStatus("✅ Refreshed!");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Refresh error: {ex.Message}");
                RefreshAttendances();
            }
        }

        private void RefreshAttendances()
        {
            try
            {
                var sessions = _dataService.GetTodaySessions();
                
                // Get all enrollments to map employee IDs to names
                var enrollments = _dataService.GetAllEnrollments();
                var employeeNameMap = enrollments.ToDictionary(e => e.EmployeeId, e => e.Name);
                
                var rows = sessions.Select(s => new
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    EmployeeName = employeeNameMap.ContainsKey(s.EmployeeId) ? employeeNameMap[s.EmployeeId] : "Unknown",
                    Date = s.Date,
                    ClockIn = FormatTimeOnly(s.ClockIn),
                    ClockOut = FormatTimeOnly(s.ClockOut),
                    TotalHours = FormatHours(s.TotalHours),
                    Status = s.Status
                }).ToList();

                var sessionsGrid = this.FindName("SessionsGrid") as DataGrid;
                if (sessionsGrid != null)
                {
                    sessionsGrid.ItemsSource = rows;
                }
                else
                {
                    // fallback try AttendancesGrid name
                    var attendGrid = this.FindName("AttendancesGrid") as DataGrid;
                    if (attendGrid != null) attendGrid.ItemsSource = rows;
                    else LogHelper.Write("⚠️ No DataGrid named SessionsGrid or AttendancesGrid found.");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Failed to load sessions: {ex.Message}");
                LogHelper.Write($"Failed to load sessions (stack): {ex}");
            }
        }

        private string FormatTimeOnly(string? dateTimeString)
        {
            if (string.IsNullOrEmpty(dateTimeString))
                return "-";
            
            try
            {
                if (DateTime.TryParse(dateTimeString, out DateTime dt))
                {
                    return dt.ToString("HH:mm:ss");
                }
                return dateTimeString;
            }
            catch
            {
                return dateTimeString ?? "-";
            }
        }

        private string FormatHours(double hours)
        {
            return hours.ToString("0.000");
        }



        private async void ScanFingerBtn_Click(object sender, RoutedEventArgs e)
        {
            var scanWindow = new ScanWindow();
            _overlayCts = new CancellationTokenSource();

            // Start scan process in background
            var scanTask = Task.Run(() => CaptureIdentifyAndProcess(_overlayCts.Token, scanWindow), _overlayCts.Token);

            // Show window modally
            var result = scanWindow.ShowDialog();

            if (scanWindow.WasCancelled)
            {
                _overlayCts?.Cancel();
                UpdateStatus("Scan cancelled.");
            }

            try
            {
                await scanTask;
            }
            catch (OperationCanceledException)
            {
                UpdateStatus("Scan cancelled.");
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 Scan failed: {ex.Message}");
                LogHelper.Write($"Scan failed: {ex}");
            }
            finally
            {
                _overlayCts?.Dispose();
                _overlayCts = null;
            }
        }



        private void CaptureIdentifyAndProcess(CancellationToken ct, ScanWindow window)
        {
            // 1) Ensure device initialized (idempotent)
            if (!_zkService.EnsureInitialized())
            {
                window.UpdateStatus("❌ Device not initialized.");
                Thread.Sleep(900);
                Dispatcher.Invoke(() => window.Close());
                return;
            }
            
            // Reload templates to ensure SDK DB is up to date
            try
            {
                LogHelper.Write("Reloading templates before identification...");
                _zkService.LoadEnrollmentsToSdk(_data_service_get());
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Warning: Failed to reload templates: {ex.Message}");
            }

            // 2) Capture single template
            window.UpdateStatus("Scanning fingerprint...");
            string? capturedBase64 = null;
            try
            {
                // Check if cancelled before capturing
                ct.ThrowIfCancellationRequested();
                capturedBase64 = _zkService.CaptureSingleTemplate(10, ct);
            }
            catch (OperationCanceledException)
            {
                LogHelper.Write("Fingerprint capture cancelled by user");
                Dispatcher.Invoke(() => window.Close());
                return;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Capture error: {ex}");
            }

            // Check if cancelled after capture attempt
            if (ct.IsCancellationRequested)
            {
                LogHelper.Write("Scan cancelled after capture attempt");
                Dispatcher.Invoke(() => window.Close());
                return;
            }

            if (string.IsNullOrEmpty(capturedBase64))
            {
                window.UpdateStatus("⚠️ No fingerprint captured.");
                Thread.Sleep(1200);
                Dispatcher.Invoke(() => window.Close());
                return;
            }

            window.UpdateStatus("Captured. Identifying...");

            // 3) Try SDK identify (preferred)
            bool sdkMatched = false;
            string matchedEmployeeId = string.Empty;
            string matchedName = string.Empty;
            string matchedDept = string.Empty;
            long matchedFid = -1;
            double matchedScore = -1;

            try
            {
                byte[] capturedBytes;
                try { capturedBytes = Convert.FromBase64String(capturedBase64); }
                catch
                {
                    window.UpdateStatus("⚠️ Captured template corrupt.");
                    Thread.Sleep(900);
                    Dispatcher.Invoke(() => window.Close());
                    return;
                }

                LogHelper.Write($"Attempting SDK identification with template size: {capturedBytes.Length} bytes");
                
                var (fid, score) = _zkService.IdentifyTemplate(capturedBytes);
                LogHelper.Write($"SDK IdentifyTemplate returned: fid={fid}, score={score}");
                
                if (fid > 0)
                {
                    matchedFid = fid;
                    matchedScore = score;
                    // Map fid -> employee id
                    var emp = _data_service_get().GetEmployeeIdByRowId(fid);
                    LogHelper.Write($"Mapped fid={fid} to employee_id={emp}");
                    
                    if (!string.IsNullOrEmpty(emp))
                    {
                        matchedEmployeeId = emp;
                        var info = _data_service_get().GetAllEnrollments().FirstOrDefault(e => e.EmployeeId == emp);
                        if (info.EmployeeId != null)
                        {
                            matchedName = info.Name;
                            matchedDept = info.Department;
                            sdkMatched = true;
                            LogHelper.Write($"🔍 SDK matched fid={fid} -> emp={emp} name={matchedName} score={score}");
                        }
                        else
                        {
                            LogHelper.Write($"⚠️ Employee info not found for {emp}");
                        }
                    }
                    else
                    {
                        LogHelper.Write($"🔍 SDK returned fid={fid} but no employee found for that fid.");
                    }
                }
                else
                {
                    LogHelper.Write("🔍 SDK did not find a match (fid<=0). Will try fallback matching.");
                }

                // if SDK didn't match, fallback below
            }
            catch (Exception ex)
            {
                LogHelper.Write($"SDK identify invocation failed: {ex}");
                LogHelper.Write($"Stack trace: {ex.StackTrace}");
            }

            // 4) If SDK didn't match, fall back to heuristic matching
            double bestScore = 0.0;
            if (!sdkMatched)
            {
                window.UpdateStatus("Using fallback verification...");
                var enrollments = _data_service_get().GetAllEnrollments();
                var capturedBytes = Convert.FromBase64String(capturedBase64);
                const double MatchThreshold = 0.65; // Lowered threshold for better matching
                
                LogHelper.Write($"Starting fallback matching against {enrollments.Count} enrollments");

                foreach (var en in enrollments)
                {
                    if (string.IsNullOrEmpty(en.Template)) continue;
                    try
                    {
                        var storedBytes = Convert.FromBase64String(en.Template);
                        double sim = ComputeTemplateSimilarity(capturedBytes, storedBytes);
                        
                        LogHelper.Write($"Comparing with {en.EmployeeId} ({en.Name}): similarity={sim:F4}");
                        
                        if (sim > bestScore)
                        {
                            bestScore = sim;
                            matchedEmployeeId = en.EmployeeId;
                            matchedName = en.Name;
                            matchedDept = en.Department;
                        }
                        if (sim >= MatchThreshold)
                        {
                            bestScore = sim;
                            matchedEmployeeId = en.EmployeeId;
                            matchedName = en.Name;
                            matchedDept = en.Department;
                            LogHelper.Write($"✅ Match found above threshold: {en.EmployeeId} with score {sim:F4}");
                            break;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Heuristic compare error for {en.EmployeeId}: {ex.Message}");
                        continue;
                    }
                }

                LogHelper.Write($"Fallback matching complete. Best match: {matchedEmployeeId} with score {bestScore:F4}");

                if (string.IsNullOrEmpty(matchedEmployeeId) || bestScore < MatchThreshold)
                {
                    window.UpdateStatus($"❌ No matching employee found. Best score: {bestScore:P0}");
                    LogHelper.Write($"❌ No match found. Best score {bestScore:F4} below threshold {MatchThreshold}");
                    Thread.Sleep(2000);
                    Dispatcher.Invoke(() => window.Close());
                    return;
                }

                LogHelper.Write($"✅ Fallback matched {matchedEmployeeId} ({matchedName}) with score {bestScore:F4}");
            }

            // Double-tap prevention: Check if this employee scanned recently
            lock (_scanLock)
            {
                if (_lastScanTimes.ContainsKey(matchedEmployeeId))
                {
                    var timeSinceLastScan = (TimezoneHelper.Now - _lastScanTimes[matchedEmployeeId]).TotalSeconds;
                    if (timeSinceLastScan < 10) // 10 second cooldown
                    {
                        var waitTime = Math.Ceiling(10 - timeSinceLastScan);
                        window.UpdateStatus($"⚠️ Please wait {waitTime} seconds before scanning again");
                        LogHelper.Write($"⚠️ Double-tap prevention: {matchedEmployeeId} scanned {timeSinceLastScan:F1}s ago, blocking");
                        Thread.Sleep(3000);
                        Dispatcher.Invoke(() => window.Close());
                        return;
                    }
                }
                
                // Update last scan time for this employee
                _lastScanTimes[matchedEmployeeId] = TimezoneHelper.Now;
                
                // Clean up old entries (older than 30 seconds)
                var cutoffTime = TimezoneHelper.Now.AddSeconds(-30);
                var keysToRemove = _lastScanTimes.Where(kvp => kvp.Value < cutoffTime).Select(kvp => kvp.Key).ToList();
                foreach (var key in keysToRemove)
                {
                    _lastScanTimes.Remove(key);
                }
            }

            // 5) Get employee photo from backend API
            string? photoBase64 = null;
            try
            {
                LogHelper.Write($"🔍 Fetching employee details for {matchedEmployeeId}...");
                var employeeDetails = Task.Run(async () => await _apiService.GetEmployeeDetailsAsync(matchedEmployeeId)).Result;
                
                if (employeeDetails != null)
                {
                    LogHelper.Write($"✅ Employee details retrieved: {employeeDetails.Fullname}");
                    
                    if (!string.IsNullOrEmpty(employeeDetails.Photo))
                    {
                        photoBase64 = employeeDetails.Photo;
                        int photoLength = employeeDetails.Photo.Length;
                        LogHelper.Write($"✅ Photo retrieved for {matchedEmployeeId} (length: {photoLength} chars)");
                    }
                    else
                    {
                        LogHelper.Write($"⚠️ No photo data in employee record for {matchedEmployeeId}");
                    }
                }
                else
                {
                    LogHelper.Write($"⚠️ Employee details not found for {matchedEmployeeId}");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Failed to retrieve employee details: {ex.Message}");
                LogHelper.Write($"Stack trace: {ex.StackTrace}");
            }

            window.UpdateEmployeeInfo(matchedEmployeeId, matchedName, photoBase64);
            // Check if cancelled before showing results
            if (ct.IsCancellationRequested)
            {
                LogHelper.Write("Scan cancelled before showing results");
                Dispatcher.Invoke(() => window.Close());
                return;
            }

            window.UpdateStatus(sdkMatched
                ? $"Identified! Processing attendance..."
                : $"Identified (score {bestScore:P0})! Processing...");

            Thread.Sleep(1000);
            
            // Check if cancelled during display
            if (ct.IsCancellationRequested)
            {
                LogHelper.Write("Scan cancelled during result display");
                Dispatcher.Invoke(() => window.Close());
                return;
            }

            // 6) Clock-in / Clock-out using session API
            var now = TimezoneHelper.Now;

            try
            {
                long openSessionId = _data_service_get().GetOpenSessionId(matchedEmployeeId, now);

                if (openSessionId > 0)
                {
                    // Found open session - this is a clock-out request
                    DateTime clockInTime = DateTime.MinValue;
                    
                    // Get session details
                    var sessions = _data_service_get().GetTodaySessions();
                    var session = sessions.FirstOrDefault(s => s.Id == openSessionId);
                    
                    if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                    {
                        clockInTime = DateTime.Parse(session.ClockIn);
                        
                        // Check if confirmation is enabled
                        if (IsClockOutConfirmationEnabled())
                        {
                            // Show confirmation dialog on UI thread and wait for result
                            bool shouldClockOut = false;
                            Dispatcher.Invoke(() =>
                            {
                                LogHelper.Write("🔍 Creating confirmation dialog in CaptureIdentifyAndProcess");
                                var confirmDialog = new ConfirmationDialog();
                                
                                // Set proper window ownership for modal behavior
                                var parentWindow = Application.Current.MainWindow;
                                if (parentWindow != null)
                                {
                                    confirmDialog.Owner = parentWindow;
                                    LogHelper.Write("🔍 Set dialog owner to main window");
                                }
                                else
                                {
                                    LogHelper.Write("🔍 WARNING - No main window found, dialog may appear behind");
                                }
                                
                                // Ensure dialog appears on top and centered
                                confirmDialog.Topmost = true;
                                confirmDialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                                
                                confirmDialog.SetEmployeeInfo(matchedName, matchedEmployeeId, clockInTime);
                                
                                LogHelper.Write("🔍 About to show confirmation dialog in CaptureIdentifyAndProcess");
                                var result = confirmDialog.ShowDialog();
                                shouldClockOut = result == true && confirmDialog.IsConfirmed;
                                
                                LogHelper.Write($"🔍 CaptureIdentifyAndProcess dialog result: {result}, IsConfirmed: {confirmDialog.IsConfirmed}");
                                
                                if (!shouldClockOut)
                                {
                                    window.UpdateStatus("❌ Clock-out cancelled by user");
                                }
                            });
                            
                            if (!shouldClockOut)
                            {
                                // User cancelled, don't process clock-out
                                Thread.Sleep(2000);
                                Dispatcher.Invoke(() => window.Close());
                                return;
                            }
                        }
                    }
                    
                    // User confirmed or confirmation disabled - proceed with clock-out
                    double hours = _data_service_get().SaveClockOut(openSessionId, now);
                    
                    // Send clock-out to server
                    if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                    {
                        // Keep the original status (Present or Late) when clocking out
                        string finalStatus = session.Status;
                        Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, clockInTime, now, finalStatus));
                    }
                    
                    window.UpdateStatus(hours >= 0 ? $"✅ Clock-out recorded. Hours: {hours:F2}" : "⚠️ Clock-out failed.");
                    Thread.Sleep(2000);
                }
                else
                {
                    // No open session. Check if employee is scheduled today
                    var scheduleCheck = _data_service_get().IsEmployeeScheduledToday(matchedEmployeeId);
                    
                    if (!scheduleCheck.IsScheduled)
                    {
                        // Check if employee has overtime assignment
                        bool hasOvertime = _data_service_get().HasOvertimeAssignment(matchedEmployeeId);
                        
                        if (hasOvertime)
                        {
                            LogHelper.Write($"⏰ Employee {matchedEmployeeId} has overtime assignment - allowing clock-in");
                            
                            // Check if already completed overtime today
                            bool hasCompletedOvertime = false;
                            try
                            {
                                var todaySessions = _data_service_get().GetTodaySessions();
                                hasCompletedOvertime = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && s.Status == "Overtime" && !string.IsNullOrEmpty(s.ClockIn));
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"Overtime session check failed: {ex}");
                                hasCompletedOvertime = false;
                            }

                            if (hasCompletedOvertime)
                            {
                                window.UpdateStatus($"⚠️ Already clocked in for overtime today.");
                                Thread.Sleep(2000);
                            }
                            else
                            {
                                // Create overtime clock-in
                                long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, "Overtime");
                                
                                // Send overtime clock-in to server
                                Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, now, null, "Overtime"));
                                
                                window.UpdateStatus(sid > 0 ? $"⏰ Overtime clock-in recorded at {now:HH:mm:ss}" : "⚠️ Overtime clock-in failed.");
                                Thread.Sleep(2000);
                            }
                        }
                        else
                        {
                            window.UpdateStatus($"⚠️ {matchedEmployeeId} is not scheduled to work today.");
                            LogHelper.Write($"⚠️ Attendance denied: {matchedEmployeeId} not scheduled for {TimezoneHelper.Now.DayOfWeek}");
                            Thread.Sleep(2500);
                        }
                    }
                    else
                    {
                        // Check if current time is within shift time window
                        var timeWindowCheck = _data_service_get().IsWithinShiftTimeWindow(scheduleCheck.StartTime, scheduleCheck.EndTime);
                        
                        if (!timeWindowCheck.IsWithinShiftTime)
                        {
                            window.UpdateStatus($"⚠️ {timeWindowCheck.Message}");
                            LogHelper.Write($"⚠️ Attendance denied: {matchedEmployeeId} - {timeWindowCheck.Message}");
                            Thread.Sleep(2500);
                        }
                        else
                        {
                            // Check if already clocked in today
                            bool hasCompleted = false;
                            try
                            {
                                var todaySessions = _data_service_get().GetTodaySessions();
                                hasCompleted = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && (s.Status == "Present" || s.Status == "Late"));
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"Completed-session check failed: {ex}");
                                hasCompleted = false;
                            }

                            if (hasCompleted)
                            {
                                window.UpdateStatus($"⚠️ Already clocked in for today.");
                                Thread.Sleep(2000);
                            }
                            else
                            {
                                // Determine status based on shift start time
                                string status = _data_service_get().DetermineAttendanceStatus(now, scheduleCheck.StartTime);
                                
                                // create new clock-in
                                long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, status);
                                
                                // Send clock-in to server
                                Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, now, null, status));
                                
                                string statusEmoji = status == "Late" ? "⏰" : "✅";
                                window.UpdateStatus(sid > 0 ? $"{statusEmoji} Clock-in recorded at {now:HH:mm:ss} - {status}" : "⚠️ Clock-in failed.");
                                Thread.Sleep(2000);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Clock-in/out processing failed: {ex}");
                window.UpdateStatus("⚠️ Attendance processing failed.");
                Thread.Sleep(2000);
            }

            // Refresh UI & close window
            Dispatcher.Invoke(() =>
            {
                RefreshAttendances();
                window.Close();
            });
        }

        /// <summary>
        /// Compute a simple similarity score between two templates represented as byte arrays.
        /// Returns 0..1 where 1 = identical. Heuristic: count equal bytes over min length.
        /// This is a placeholder algorithm — replace with SDK matching for production.
        /// </summary>
        private static double ComputeTemplateSimilarity(byte[] a, byte[] b)
        {
            if (a == null || b == null || a.Length == 0 || b.Length == 0) return 0.0;

            int len = Math.Min(a.Length, b.Length);
            int equal = 0;

            for (int i = 0; i < len; i++)
            {
                if (a[i] == b[i]) equal++;
            }

            double baseScore = (double)equal / len;
            double sizePenalty = 1.0 - (Math.Abs(a.Length - b.Length) / (double)Math.Max(a.Length, b.Length) * 0.2);
            if (sizePenalty < 0.6) sizePenalty = 0.6;
            return Math.Max(0.0, Math.Min(1.0, baseScore * sizePenalty));
        }

        /// <summary>
        /// Sync with server: deletes local enrollments for employees that no longer exist on server.
        /// Runs automatically on page load and every 5 minutes.
        /// </summary>
        private async Task SyncDeletedEmployeesAsync()
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                string url = "http://localhost:5000/employees";
                
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>(url);

                if (employees == null || employees.Count == 0)
                {
                    LogHelper.Write("⚠️ Sync skipped: server returned empty/null employees list.");
                    return;
                }

                var activeEmployeeIds = employees
                    .Where(e => e.employeeId != null)
                    .Select(e => e.employeeId)
                    .ToHashSet();
                
                var local = _dataService.GetAllEnrollments();
                var toDelete = local.Where(enroll => !activeEmployeeIds.Contains(enroll.EmployeeId)).ToList();

                if (toDelete.Count == 0)
                {
                    LogHelper.Write("✅ Sync: All enrollments match server.");
                    return;
                }

                // Safety check: only abort if ALL records would be deleted
                if (toDelete.Count == local.Count && local.Count > 0)
                {
                    LogHelper.Write($"⚠️ Sync aborted: Would delete ALL {local.Count} enrollments. Server might be returning wrong data.");
                    return;
                }

                // Delete enrollments
                int deleted = 0;
                foreach (var enroll in toDelete)
                {
                    try
                    {
                        LogHelper.Write($"🗑️ Deleting enrollment for {enroll.EmployeeId} - not found on server");
                        _dataService.DeleteEnrollment(enroll.EmployeeId);
                        deleted++;
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"❌ Failed to delete {enroll.EmployeeId}: {ex.Message}");
                    }
                }

                if (deleted > 0)
                {
                    LogHelper.Write($"✅ Sync complete: {deleted} enrollment(s) deleted.");
                    Dispatcher.Invoke(() => UpdateStatus($"🔄 Synced: {deleted} deleted employee(s) removed."));
                    
                    // Reload templates into SDK
                    try
                    {
                        _zkService.LoadEnrollmentsToSdk(_dataService);
                        LogHelper.Write("🔄 Templates reloaded into SDK after sync.");
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Failed to reload templates: {ex.Message}");
                    }
                }
            }
            catch (System.Net.Http.HttpRequestException)
            {
                // Server not reachable - expected when offline
                LogHelper.Write("ℹ️ Sync skipped: Server not reachable");
            }
            catch (TaskCanceledException)
            {
                LogHelper.Write("ℹ️ Sync skipped: Request timed out");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Sync error: {ex.Message}");
            }
        }

        private async void UpdateScheduleBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                UpdateStatus("📥 Fetching schedules from server...");

                var schedules = await _apiService.GetPublishedSchedulesAsync();

                if (schedules == null || schedules.Count == 0)
                {
                    UpdateStatus("⚠️ No schedules found on server");
                    MessageBox.Show("No published schedules found on the server.", "No Schedules", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                // Store schedules in local database
                int updatedCount = _dataService.UpdateSchedules(schedules);

                UpdateStatus($"✅ Successfully updated {updatedCount} schedule(s)");
                MessageBox.Show($"Successfully updated {updatedCount} employee schedule(s) from the server.", "Update Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                
                LogHelper.Write($"✅ Updated {updatedCount} schedules from server");
            }
            catch (HttpRequestException ex)
            {
                UpdateStatus("❌ Network error - Check WiFi connection");
                MessageBox.Show($"Network error: {ex.Message}\n\nPlease check your WiFi connection and try again.", "Connection Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Network error updating schedules: {ex.Message}");
            }
            catch (Exception ex)
            {
                UpdateStatus("❌ Failed to update schedules");
                MessageBox.Show($"Error updating schedules: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error updating schedules: {ex.Message}");
            }
        }

        private void OvertimeManagementBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var overtimeWindow = new OvertimeManagementWindow();
                overtimeWindow.Owner = Window.GetWindow(this);
                overtimeWindow.ShowDialog();
                
                // Refresh attendance grid after overtime management
                RefreshAttendances();
                
                LogHelper.Write("✅ Overtime management window closed");
            }
            catch (Exception ex)
            {
                UpdateStatus("❌ Failed to open overtime management");
                MessageBox.Show($"Error opening overtime management: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                LogHelper.Write($"💥 Error opening overtime management: {ex.Message}");
            }
        }


    }

    public class SystemConfig
    {
        public string? SystemName { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? Logo { get; set; }
        public string? CompanyName { get; set; }
        public string? Timezone { get; set; }
        public int ToolboxMeetingMinutes { get; set; }
        public bool ClockOutConfirmation { get; set; } = true;
        public string? LastUpdated { get; set; }
    }
}
