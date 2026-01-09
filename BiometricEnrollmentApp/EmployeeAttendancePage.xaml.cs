using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class EmployeeAttendancePage : Page
    {
        private readonly ZKTecoService _zkService;
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private CancellationTokenSource? _continuousScanCts;
        private static bool _isPageActive = false;
        private DispatcherTimer? _clockTimer;

        public EmployeeAttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();

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
                HeaderTimeText.Text = now.ToString("HH:mm");
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
                long openSessionId = _dataService.GetOpenSessionId(employeeId, now);

                if (openSessionId > 0)
                {
                    // Clock-out
                    double hours = _dataService.SaveClockOut(openSessionId, now);
                    
                    var sessions = _dataService.GetTodaySessions();
                    var session = sessions.FirstOrDefault(s => s.Id == openSessionId);
                    if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                    {
                        DateTime clockInTime = DateTime.Parse(session.ClockIn);
                        string finalStatus = session.Status;
                        Task.Run(async () => await _apiService.SendAttendanceAsync(employeeId, clockInTime, now, finalStatus));
                    }
                    
                    Dispatcher.Invoke(() => ShowEmployeeResult(employeeId, employeeName, "Clock-out", now));
                }
                else
                {
                    // Check if employee is scheduled today
                    var scheduleCheck = _dataService.IsEmployeeScheduledToday(employeeId);
                    
                    if (!scheduleCheck.IsScheduled)
                    {
                        Dispatcher.Invoke(() => {
                            UpdateInstruction($"⚠️ {employeeId} is not scheduled to work today.");
                            Task.Delay(3000).ContinueWith(_ => 
                                Dispatcher.Invoke(() => UpdateInstruction("Place your finger to Clock-In/Clock-Out.")));
                        });
                        return;
                    }

                    var timeWindowCheck = _dataService.IsWithinShiftTimeWindow(scheduleCheck.StartTime, scheduleCheck.EndTime);
                    
                    if (!timeWindowCheck.IsWithinShiftTime)
                    {
                        Dispatcher.Invoke(() => {
                            UpdateInstruction($"⚠️ {timeWindowCheck.Message}");
                            Task.Delay(3000).ContinueWith(_ => 
                                Dispatcher.Invoke(() => UpdateInstruction("Place your finger to Clock-In/Clock-Out.")));
                        });
                        return;
                    }

                    // Check if already clocked in today
                    var todaySessions = _dataService.GetTodaySessions();
                    bool hasCompleted = todaySessions.Any(s => s.EmployeeId == employeeId && (s.Status == "Present" || s.Status == "Late"));

                    if (hasCompleted)
                    {
                        Dispatcher.Invoke(() => {
                            UpdateInstruction($"⚠️ Already clocked in for today.");
                            Task.Delay(3000).ContinueWith(_ => 
                                Dispatcher.Invoke(() => UpdateInstruction("Place your finger to Clock-In/Clock-Out.")));
                        });
                        return;
                    }

                    // Clock-in
                    string status = _dataService.DetermineAttendanceStatus(now, scheduleCheck.StartTime);
                    long sid = _dataService.SaveClockIn(employeeId, now, status);
                    
                    Task.Run(async () => await _apiService.SendAttendanceAsync(employeeId, now, null, status));
                    
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
                // Show employee name
                EmployeeNameText.Text = employeeName;
                EmployeeNameText.Visibility = Visibility.Visible;

                // Show status message with appropriate color
                var timeStr = timestamp.ToString("HH:mm");
                var statusColor = status switch
                {
                    "Present" => "#4CAF50", // Green
                    "Late" => "#FF9800",    // Orange
                    "Clock-out" => "#2196F3", // Blue
                    _ => "#4CAF50"          // Default green
                };

                var actionText = status == "Clock-out" ? "Clock-out" : "Clock-in";
                StatusMessage.Text = $"{actionText} successful at {timeStr}";
                StatusMessage.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(statusColor));
                StatusMessage.Visibility = Visibility.Visible;

                // Try to load employee photo
                LoadEmployeePhoto(employeeId);

                // Hide the result after 5 seconds
                Task.Delay(5000).ContinueWith(_ => Dispatcher.Invoke(HideEmployeeResult));
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
                UpdateInstruction("Place your finger to Clock-In/Clock-Out.");
            }
            catch { }
        }

        private async void LoadEmployeePhoto(string employeeId)
        {
            try
            {
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
                    EmployeePhoto.Visibility = Visibility.Collapsed;
                    DefaultUserIcon.Visibility = Visibility.Visible;
                }
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
    }
}