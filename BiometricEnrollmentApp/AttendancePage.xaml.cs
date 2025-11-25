using System;
using System.Collections.Generic;
using System.Linq;
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
        private CancellationTokenSource? _overlayCts;
        private CancellationTokenSource? _continuousScanCts;
        private static bool _isAttendancePageActive = false;

        public AttendancePage() : this(new ZKTecoService()) { }

        public AttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();
            _apiService = new ApiService();

            _zkService.OnStatus += (msg) => Dispatcher.Invoke(() => UpdateStatus(msg));
            Loaded += AttendancePage_Loaded;
            Unloaded += AttendancePage_Unloaded;

            // Auto-sync deleted employees every 5 minutes
            var syncTimer = new System.Timers.Timer(5 * 60 * 1000); // every 5 minutes
            syncTimer.Elapsed += async (_, _) => await SyncDeletedEmployeesAsync();
            syncTimer.Start();
        }

        private void AttendancePage_Unloaded(object? sender, RoutedEventArgs e)
        {
            // Stop continuous scanning when leaving attendance page
            _isAttendancePageActive = false;
            _continuousScanCts?.Cancel();
            LogHelper.Write("📴 Attendance page unloaded - continuous scanning stopped");
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
                        var enrollments = _data_service_get().GetAllEnrollmentsWithRowId();
                        LogHelper.Write($"Total enrollments in database: {enrollments.Count}");
                        
                        Dispatcher.Invoke(() => UpdateStatus($"✅ Ready! {enrollments.Count} employees enrolled. Place finger to scan..."));
                        
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
                    Dispatcher.Invoke(() => UpdateStatus($"✅ Identified: {matchedName} ({matchedEmployeeId})"));
                    
                    // Process attendance - clock in/out logic
                    var now = DateTime.Now;
                    try
                    {
                        long openSessionId = _data_service_get().GetOpenSessionId(matchedEmployeeId, now);

                        if (openSessionId > 0)
                        {
                            // clock-out the open session
                            double hours = _data_service_get().SaveClockOut(openSessionId, now);
                            
                            // Send clock-out to server
                            var sessions = _data_service_get().GetTodaySessions();
                            var session = sessions.FirstOrDefault(s => s.Id == openSessionId);
                            if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                            {
                                DateTime clockInTime = DateTime.Parse(session.ClockIn);
                                Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, clockInTime, now, "COMPLETED"));
                            }
                            
                            Dispatcher.Invoke(() => UpdateStatus(hours >= 0 ? $"✅ Clock-out recorded. Hours: {hours:F2}" : "⚠️ Clock-out failed."));
                        }
                        else
                        {
                            // No open session. Check if already completed today
                            bool hasCompleted = false;
                            try
                            {
                                var todaySessions = _data_service_get().GetTodaySessions();
                                hasCompleted = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && string.Equals(s.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase));
                            }
                            catch (Exception ex)
                            {
                                LogHelper.Write($"Completed-session check failed: {ex}");
                                hasCompleted = false;
                            }

                            if (hasCompleted)
                            {
                                Dispatcher.Invoke(() => UpdateStatus($"⚠️ Already completed attendance for today."));
                            }
                            else
                            {
                                // create new clock-in
                                long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, "IN");
                                
                                // Send clock-in to server
                                Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, now, null, "IN"));
                                
                                Dispatcher.Invoke(() => UpdateStatus(sid > 0 ? $"✅ Clock-in recorded at {now:HH:mm:ss}" : "⚠️ Clock-in failed."));
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

        private void RefreshBtn_Click(object sender, RoutedEventArgs e) => RefreshAttendances();

        private void RefreshAttendances()
        {
            try
            {
                var sessions = _dataService.GetTodaySessions();
                var rows = sessions.Select(s => new
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    Date = s.Date,
                    ClockIn = s.ClockIn,
                    ClockOut = s.ClockOut,
                    TotalHours = s.TotalHours,
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
            var now = DateTime.Now;

            try
            {
                long openSessionId = _data_service_get().GetOpenSessionId(matchedEmployeeId, now);

                if (openSessionId > 0)
                {
                    // clock-out the open session
                    double hours = _data_service_get().SaveClockOut(openSessionId, now);
                    
                    // Send clock-out to server
                    var sessions = _data_service_get().GetTodaySessions();
                    var session = sessions.FirstOrDefault(s => s.Id == openSessionId);
                    if (session.Id > 0 && !string.IsNullOrEmpty(session.ClockIn))
                    {
                        DateTime clockInTime = DateTime.Parse(session.ClockIn);
                        Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, clockInTime, now, "COMPLETED"));
                    }
                    
                    window.UpdateStatus(hours >= 0 ? $"✅ Clock-out recorded. Hours: {hours:F2}" : "⚠️ Clock-out failed.");
                    Thread.Sleep(2000);
                }
                else
                {
                    // No open session. If user already has a completed session today, do not create another clock-in.
                    bool hasCompleted = false;
                    try
                    {
                        var todaySessions = _data_service_get().GetTodaySessions();
                        hasCompleted = todaySessions.Any(s => s.EmployeeId == matchedEmployeeId && string.Equals(s.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase));
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Completed-session check failed: {ex}");
                        hasCompleted = false;
                    }

                    if (hasCompleted)
                    {
                        window.UpdateStatus($"⚠️ Already completed attendance for today.");
                        Thread.Sleep(2000);
                    }
                    else
                    {
                        // create new clock-in
                        long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, "IN");
                        
                        // Send clock-in to server
                        Task.Run(async () => await _apiService.SendAttendanceAsync(matchedEmployeeId, now, null, "IN"));
                        
                        window.UpdateStatus(sid > 0 ? $"✅ Clock-in recorded at {now:HH:mm:ss}" : "⚠️ Clock-in failed.");
                        Thread.Sleep(2000);
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
    }
}
