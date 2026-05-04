using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class EmployeeAttendancePage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly SyncService _syncService;
        private readonly PhotoService _photoService;
        private readonly ShiftAttendanceEngine _shiftEngine;
        private CancellationTokenSource? _continuousScanCts;
        private static bool _isPageActive = false;
        private DispatcherTimer? _clockTimer;
        private readonly Dictionary<string, BitmapImage?> _photoCache = new Dictionary<string, BitmapImage?>();

        public EmployeeAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _shiftEngine = new ShiftAttendanceEngine(_dataService.ConnectionString);
            _apiService = new ApiService();
            _syncService = new SyncService(_dataService, _apiService);
            _photoService = new PhotoService();

            // Clear configuration cache to ensure fresh settings are loaded
            _clockOutConfirmationEnabled = null;
            LogHelper.Write("🔄 Configuration cache cleared on EmployeeAttendancePage initialization");

            Loaded += EmployeeAttendancePage_Loaded;
            Unloaded += EmployeeAttendancePage_Unloaded;

            // Start clock timer
            _clockTimer = new DispatcherTimer();
            _clockTimer.Interval = TimeSpan.FromSeconds(1);
            _clockTimer.Tick += (_, _) => UpdateClock();
            _clockTimer.Start();
            UpdateClock(); // Initial update
        }

        private void UpdateClock()
        {
            try
            {
                var now = TimezoneHelper.Now;
                CurrentTimeText.Text = now.ToString("HH:mm:ss");
                CurrentDateText.Text = now.ToString("dddd, MMMM d, yyyy");
                
                // Also update header time
                HeaderTimeText.Text = TimezoneHelper.FormatTimeDisplay(now);
                HeaderDateText.Text = now.ToString("ddd, MMM dd");
            }
            catch { }
        }

        private void EmployeeAttendancePage_Loaded(object sender, RoutedEventArgs e)
        {
            _isPageActive = true;
            
            Task.Run(async () =>
            {
                try
                {
                    if (_zkService.EnsureInitialized())
                    {
                        LogHelper.Write("Loading enrollments to SDK...");
                        _zkService.LoadEnrollmentsToSdk(_dataService);
                        
                        var enrollments = _dataService.GetAllEnrollmentsWithRowId();
                        LogHelper.Write($"Total enrollments in database: {enrollments.Count}");
                        
                        Dispatcher.Invoke(() => UpdateInstruction("Place finger to scan..."));
                        
                        StartContinuousScanning();
                    }
                    else
                    {
                        Dispatcher.Invoke(() => UpdateInstruction("⚠️ Device not connected."));
                    }
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"Init/load failed: {ex}");
                    Dispatcher.Invoke(() => UpdateInstruction($"Init error: {ex.Message}"));
                }
            });
        }

        private void EmployeeAttendancePage_Unloaded(object sender, RoutedEventArgs e)
        {
            _isPageActive = false;
            _continuousScanCts?.Cancel();
            _clockTimer?.Stop();
            LogHelper.Write("📴 Employee attendance page unloaded - continuous scanning stopped");
        }

        private void StartContinuousScanning()
        {
            _continuousScanCts?.Cancel();
            _continuousScanCts = new CancellationTokenSource();
            var token = _continuousScanCts.Token;

            Task.Run(async () =>
            {
                LogHelper.Write("🔄 Starting continuous attendance scanning...");
                
                while (!token.IsCancellationRequested && _isPageActive)
                {
                    try
                    {
                        if (!_isPageActive)
                        {
                            LogHelper.Write("📴 Page inactive - stopping scan loop");
                            break;
                        }

                        if (!_zkService.EnsureInitialized())
                        {
                            await Task.Delay(2000, token);
                            continue;
                        }

                        await Task.Run(() => QuickScanAndProcess(), token);
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
                var capturedBase64 = _zkService.CaptureSingleTemplate(2, CancellationToken.None);
                
                if (string.IsNullOrEmpty(capturedBase64))
                {
                    return;
                }

                Dispatcher.Invoke(() => UpdateInstruction("🔍 Identifying..."));

                byte[] capturedBytes = Convert.FromBase64String(capturedBase64);
                var (fid, score) = _zkService.IdentifyTemplate(capturedBytes);

                LogHelper.Write($"SDK Identify result: fid={fid}, score={score}");

                string matchedEmployeeId = string.Empty;
                string matchedName = string.Empty;
                bool matched = false;

                // Try SDK match first
                if (fid > 0)
                {
                    var enrollment = _dataService.GetAllEnrollmentsWithRowId()
                        .FirstOrDefault(e => e.RowId == fid);

                    if (!string.IsNullOrEmpty(enrollment.EmployeeId))
                    {
                        matchedEmployeeId = enrollment.EmployeeId;
                        matchedName = enrollment.Name;
                        matched = true;
                        LogHelper.Write($"✅ SDK matched: {matchedName} ({matchedEmployeeId})");
                    }
                }

                // Fallback matching if SDK didn't match
                if (!matched)
                {
                    LogHelper.Write("SDK didn't match, trying fallback matching...");
                    var enrollments = _dataService.GetAllEnrollments();
                    const double MatchThreshold = 0.55;
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
                    ProcessAttendance(matchedEmployeeId, matchedName);
                }
                else
                {
                    Dispatcher.Invoke(() => {
                        UpdateInstruction("❌ Fingerprint not recognized. Try again...");
                        Task.Delay(3000).ContinueWith(_ => 
                            Dispatcher.Invoke(() => UpdateInstruction("Place your finger to Clock-In/Clock-Out.")));
                    });
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Quick scan error: {ex.Message}");
            }
        }

        private void ProcessAttendance(string employeeId, string employeeName)
        {
            var now = TimezoneHelper.Now;
            try
            {
                // ── Use ShiftAttendanceEngine for all clock-in/out logic ──
                long openSessionId = _dataService.GetOpenSessionId(employeeId, now);

                // ── Fetch the open session — check today AND recent days (overnight/closing shifts) ──
                (long Id, string EmployeeId, string Date, string ClockIn, string ClockOut, double TotalHours, string Status) openSession = default;
                if (openSessionId > 0)
                {
                    var todaySessions = _dataService.GetTodaySessions();
                    openSession = todaySessions.FirstOrDefault(s => s.Id == openSessionId);

                    if (openSession.Id == 0)
                    {
                        var recentSessions = _dataService.GetRecentSessions(2, includeTomorrow: true);
                        var recent = recentSessions.FirstOrDefault(s => s.Id == openSessionId);
                        if (recent.Id > 0)
                            openSession = (recent.Id, recent.EmployeeId, recent.Date,
                                           recent.ClockIn, recent.ClockOut,
                                           recent.TotalHours, recent.Status);
                    }
                }

                // Determine if the open session is a past Missed Clock-out that should be ignored
                bool hasPastMissedClockout = openSessionId > 0
                    && openSession.Id > 0
                    && openSession.Status == "Missed Clock-out"
                    && openSession.Date != now.ToString("yyyy-MM-dd")
                    && openSession.Date != now.AddDays(1).ToString("yyyy-MM-dd");

                // Block current-shift Missed Clock-out attempts
                if (openSessionId > 0 && openSession.Id > 0
                    && openSession.Status == "Missed Clock-out"
                    && !hasPastMissedClockout)
                {
                    LogHelper.Write($"⛔ {employeeId} session {openSessionId} is Missed Clock-out for today — shift has ended");
                    Dispatcher.Invoke(() =>
                    {
                        UpdateInstruction("⛔ Shift has ended. Attendance marked as Missed Clock-out.");
                        ShowEmployeeResult(employeeId, employeeName, "Shift Ended", now);
                    });
                    Thread.Sleep(3000);
                    return;
                }

                if (openSessionId > 0 && !hasPastMissedClockout)
                {
                    // ── CLOCK-OUT ──
                    if (hasPastMissedClockout)
                        LogHelper.Write($"ℹ️ {employeeId} past Missed Clock-out on {openSession.Date} — skipping to clock-in");

                    // Show confirmation dialog if enabled
                    if (IsClockOutConfirmationEnabled())
                    {
                        bool shouldClockOut = false;
                        DateTime clockInTime = DateTime.MinValue;

                        if (openSession.Id > 0 && !string.IsNullOrEmpty(openSession.ClockIn))
                            DateTime.TryParse(openSession.ClockIn, out clockInTime);

                        using (var dialogCompleted = new System.Threading.ManualResetEventSlim(false))
                        {
                            Dispatcher.Invoke(() =>
                            {
                                try
                                {
                                    var confirmDialog = new ConfirmationDialog();
                                    var parentWindow = Window.GetWindow(this) ?? Application.Current.MainWindow;
                                    if (parentWindow != null)
                                        confirmDialog.Owner = parentWindow;
                                    confirmDialog.Topmost = true;
                                    confirmDialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                                    confirmDialog.ShowInTaskbar = true;
                                    confirmDialog.SetEmployeeInfo(employeeName, employeeId, clockInTime);

                                    var dialogResult = confirmDialog.ShowDialog();
                                    shouldClockOut = dialogResult == true && confirmDialog.IsConfirmed;

                                    if (!shouldClockOut)
                                    {
                                        UpdateInstruction("❌ Clock-out cancelled by user");
                                        ShowEmployeeResult(employeeId, employeeName, "Cancelled", now);
                                    }
                                }
                                catch (Exception dialogEx)
                                {
                                    LogHelper.Write($"Dialog error: {dialogEx.Message}");
                                    shouldClockOut = false;
                                }
                                finally
                                {
                                    dialogCompleted.Set();
                                }
                            });
                            dialogCompleted.Wait();
                        }

                        if (!shouldClockOut)
                        {
                            Thread.Sleep(2000);
                            return;
                        }
                    }

                    var result = _shiftEngine.ClockOut(employeeId, now);

                    if (!result.Success)
                    {
                        LogHelper.Write($"🚫 Clock-out denied for {employeeId}: {result.Message}");
                        Dispatcher.Invoke(() =>
                        {
                            UpdateInstruction($"❌ {result.Message}");
                            ShowEmployeeResult(employeeId, employeeName, "Clock-out Denied", now);
                        });
                        Thread.Sleep(3000);
                        return;
                    }

                    // Sync to server
                    var sessions2 = _dataService.GetTodaySessions();
                    var session   = sessions2.FirstOrDefault(s => s.Id == openSessionId);
                    if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                    {
                        var clockInTime = DateTime.Parse(session.ClockIn);
                        Task.Run(async () => await _syncService.QueueAttendanceSync(
                            employeeId, openSessionId, clockInTime, now, session.Status));
                    }

                    Dispatcher.Invoke(() => ShowEmployeeResult(employeeId, employeeName, "Clock-out", now));
                }
                else
                {
                    // ── CLOCK-IN ──
                    if (hasPastMissedClockout)
                        LogHelper.Write($"ℹ️ {employeeId} has past Missed Clock-out on {openSession.Date} — proceeding to clock-in for new shift");

                    var result = _shiftEngine.ClockIn(employeeId, now);

                    if (!result.Success)
                    {
                        LogHelper.Write($"🚫 Clock-in denied for {employeeId}: {result.Message}");
                        Dispatcher.Invoke(() =>
                        {
                            UpdateInstruction($"❌ {result.Message}");
                            ShowEmployeeResult(employeeId, employeeName, "No Active Shift", now);
                        });
                        Thread.Sleep(3000);
                        return;
                    }

                    string status = result.Message.Contains("Late") ? "Late" : "Present";
                    Task.Run(async () => await _syncService.QueueAttendanceSync(
                        employeeId, result.SessionId, now, null, status));

                    Dispatcher.Invoke(() => ShowEmployeeResult(employeeId, employeeName, status, now));
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Clock-in/out processing failed: {ex}");
                Dispatcher.Invoke(() => UpdateInstruction("⚠️ Attendance processing failed."));
            }
        }

        private void ShowEmployeeResult(string employeeId, string employeeName, string status, DateTime timestamp)
        {
            try
            {
                // Show detailed employee information
                EmployeeNameText.Text = $"{employeeName}\nID: {employeeId}";
                EmployeeNameText.FontSize = 30;
                EmployeeNameText.TextAlignment = TextAlignment.Left;
                EmployeeNameText.Visibility = Visibility.Visible;

                // Enhanced status message with side-by-side layout
                var timeStr = TimezoneHelper.FormatTimeDisplay(timestamp);
                var (statusColor, statusIcon, mainMessage, detailMessage) = GetOptimizedStatusInfo(status, timeStr, employeeId);
                
                // Set status icon
                if (StatusIcon != null)
                {
                    StatusIcon.Text = statusIcon;
                    StatusIcon.Visibility = Visibility.Visible;
                }
                
                // Set main status message
                StatusMessage.Text = mainMessage;
                StatusMessage.FontSize = 22;
                StatusMessage.TextAlignment = TextAlignment.Left;
                StatusMessage.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(statusColor));
                StatusMessage.Visibility = Visibility.Visible;
                
                // Set additional details
                if (StatusDetails != null && !string.IsNullOrEmpty(detailMessage))
                {
                    StatusDetails.Text = detailMessage;
                    StatusDetails.Visibility = Visibility.Visible;
                }
                
                // Show the status panel
                if (StatusPanel != null)
                {
                    StatusPanel.Visibility = Visibility.Visible;
                }

                // Try to load employee photo (skip for cancelled)
                if (status != "Cancelled")
                {
                    LoadEmployeePhoto(employeeId);
                }

                // Hide the result after appropriate delay
                var hideDelay = status == "Cancelled" ? 4000 : 7000;
                Task.Delay(hideDelay).ContinueWith(_ => Dispatcher.Invoke(HideEmployeeResult));
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error showing employee result: {ex.Message}");
            }
        }

        private (string color, string icon, string mainMessage, string detailMessage) GetOptimizedStatusInfo(string status, string timeStr, string employeeId)
        {
            return status switch
            {
                "Present"          => ("#4CAF50", "✅", $"Successfully clocked in at {timeStr}", "Status: Present"),
                "Late"             => ("#FF9800", "⏰", $"Clocked in late at {timeStr}", "Status: Late Arrival"),
                "Clock-out"        => ("#2196F3", "👋", $"Successfully clocked out at {timeStr}", "Shift ended"),
                "Clock-out Denied" => ("#FF5722", "🚫", "Shift has ended", "Clock-out not allowed"),
                "Overtime"         => ("#9C27B0", "⭐", $"Clocked out during overtime at {timeStr}", "Overtime hours recorded"),
                "Missed Clock-out" => ("#FFC107", "⚠️", $"Late clock-out at {timeStr}", "Beyond scheduled shift time"),
                "DoubleTap"        => ("#FF5722", "⏳", "Please wait before scanning again", "Cooldown period active"),
                "Cancelled"        => ("#9E9E9E", "❌", "Clock-out cancelled", "No changes made"),
                "Not Scheduled"    => ("#FF5722", "📅", $"Not scheduled today", $"Employee {employeeId} — contact supervisor"),
                "Outside Hours"    => ("#FF5722", "🕐", "Outside shift hours", "Not within scheduled work time"),
                _                  => ("#4CAF50", "✅", $"Action completed at {timeStr}", $"Status: {status}")
            };
        }

        private void HideEmployeeResult()
        {
            try
            {
                EmployeeNameText.Visibility = Visibility.Collapsed;
                StatusMessage.Visibility = Visibility.Collapsed;
                EmployeePhoto.Visibility = Visibility.Collapsed;
                DefaultUserIcon.Visibility = Visibility.Visible;
                
                // Hide the status panel and its components
                if (StatusPanel != null)
                {
                    StatusPanel.Visibility = Visibility.Collapsed;
                }
                if (StatusIcon != null)
                {
                    StatusIcon.Visibility = Visibility.Collapsed;
                }
                if (StatusDetails != null)
                {
                    StatusDetails.Visibility = Visibility.Collapsed;
                }
                
                UpdateInstruction("Place your finger to Clock-In/Clock-Out.");
            }
            catch { }
        }

        private async void LoadEmployeePhoto(string employeeId)
        {
            try
            {
                // Check cache first
                lock (_photoCache)
                {
                    if (_photoCache.TryGetValue(employeeId, out var cachedPhoto))
                    {
                        if (cachedPhoto != null)
                        {
                            EmployeePhoto.Source = cachedPhoto;
                            EmployeePhoto.Visibility = Visibility.Visible;
                            DefaultUserIcon.Visibility = Visibility.Collapsed;
                        }
                        else
                        {
                            EmployeePhoto.Visibility = Visibility.Collapsed;
                            DefaultUserIcon.Visibility = Visibility.Visible;
                        }
                        return;
                    }
                }

                // Load photo asynchronously
                await Task.Run(async () =>
                {
                    try
                    {
                        // Try local file first (fast)
                        var localPhoto = _photoService.LoadPhoto(employeeId);
                        
                        if (localPhoto != null)
                        {
                            // Cache and display
                            lock (_photoCache)
                            {
                                _photoCache[employeeId] = localPhoto;
                            }
                            
                            Dispatcher.Invoke(() =>
                            {
                                EmployeePhoto.Source = localPhoto;
                                EmployeePhoto.Visibility = Visibility.Visible;
                                DefaultUserIcon.Visibility = Visibility.Collapsed;
                            });
                            
                            LogHelper.Write($"📷 Loaded local photo for {employeeId}");
                            return;
                        }

                        // Fallback to server (slower)
                        var photoBase64 = await _apiService.GetEmployeePhotoAsync(employeeId);
                        
                        if (!string.IsNullOrEmpty(photoBase64))
                        {
                            var photoBytes = Convert.FromBase64String(photoBase64);
                            var bitmap = new BitmapImage();
                            
                            using (var stream = new System.IO.MemoryStream(photoBytes))
                            {
                                bitmap.BeginInit();
                                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                                bitmap.StreamSource = stream;
                                bitmap.EndInit();
                                bitmap.Freeze();
                            }
                            
                            // Cache and display
                            lock (_photoCache)
                            {
                                _photoCache[employeeId] = bitmap;
                            }
                            
                            Dispatcher.Invoke(() =>
                            {
                                EmployeePhoto.Source = bitmap;
                                EmployeePhoto.Visibility = Visibility.Visible;
                                DefaultUserIcon.Visibility = Visibility.Collapsed;
                            });
                            
                            LogHelper.Write($"📷 Loaded server photo for {employeeId}");
                        }
                        else
                        {
                            // Cache as "no photo"
                            lock (_photoCache)
                            {
                                _photoCache[employeeId] = null;
                            }
                            
                            Dispatcher.Invoke(() =>
                            {
                                EmployeePhoto.Visibility = Visibility.Collapsed;
                                DefaultUserIcon.Visibility = Visibility.Visible;
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"⚠️ Error loading photo for {employeeId}: {ex.Message}");
                        
                        // Cache as "no photo"
                        lock (_photoCache)
                        {
                            _photoCache[employeeId] = null;
                        }
                        
                        Dispatcher.Invoke(() =>
                        {
                            EmployeePhoto.Visibility = Visibility.Collapsed;
                            DefaultUserIcon.Visibility = Visibility.Visible;
                        });
                    }
                });
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Could not load photo for {employeeId}: {ex.Message}");
                EmployeePhoto.Visibility = Visibility.Collapsed;
                DefaultUserIcon.Visibility = Visibility.Visible;
            }
        }

        private void UpdateInstruction(string message)
        {
            try 
            { 
                InstructionText.Text = message; 
            } 
            catch { }
        }

        private double ComputeTemplateSimilarity(byte[] template1, byte[] template2)
        {
            // Simple similarity calculation - you may want to implement a more sophisticated algorithm
            if (template1.Length != template2.Length) return 0.0;
            
            int matches = 0;
            for (int i = 0; i < template1.Length; i++)
            {
                if (template1[i] == template2[i]) matches++;
            }
            
            return (double)matches / template1.Length;
        }

        // Configuration cache
        private static bool? _clockOutConfirmationEnabled = null;

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
    }
}