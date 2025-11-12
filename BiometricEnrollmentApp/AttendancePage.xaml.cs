using System;
using System.Collections.Generic;
using System.Linq;
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
        private CancellationTokenSource? _overlayCts;

        public AttendancePage() : this(new ZKTecoService()) { }

        public AttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService ?? new ZKTecoService();
            _dataService = new DataService();

            _zkService.OnStatus += (msg) => Dispatcher.Invoke(() => UpdateStatus(msg));
            Loaded += AttendancePage_Loaded;
        }

        private void AttendancePage_Loaded(object? sender, RoutedEventArgs e)
        {
            // initialize device and try loading enrollments into SDK DB (best-effort)
            Task.Run(() =>
            {
                try
                {
                    if (_zkService.EnsureInitialized())
                    {
                        // Load templates to SDK so identify works immediately
                        _zkService.LoadEnrollmentsToSdk(_data_service_get());
                        Dispatcher.Invoke(() => UpdateStatus("Device connected and templates loaded."));
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

        private DataService _data_service_get() => _dataService;

        private void UpdateStatus(string message)
        {
            try { StatusTextBlock.Text = message; } catch { }
            LogHelper.Write(message);
        }

        private void GoEnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            try { NavigationService?.Navigate(new EnrollmentPage(_zkService)); }
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

        private void CancelOverlayBtn_Click(object sender, RoutedEventArgs e)
        {
            _overlayCts?.Cancel();
            HideOverlay();
            UpdateStatus("Scan cancelled.");
        }

        private async void ScanFingerBtn_Click(object sender, RoutedEventArgs e)
        {
            ShowOverlay("Place finger on the scanner...");
            _overlayCts = new CancellationTokenSource();

            try
            {
                await Task.Run(() => CaptureIdentifyAndProcess(_overlayCts.Token), _overlayCts.Token);
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

        private void ShowOverlay(string initialStatus)
        {
            Dispatcher.Invoke(() =>
            {
                try
                {
                    OverlayGrid.Visibility = Visibility.Visible;
                    OverlayNameText.Text = "Name Placeholder";
                    OverlayIdText.Text = "ID Placeholder";
                    OverlayStatusText.Text = initialStatus;
                    PhotoPlaceholderText.Text = "PHOTO";
                }
                catch { /* UI may not exist in some contexts */ }
            });
        }

        private void HideOverlay()
        {
            Dispatcher.Invoke(() =>
            {
                try { OverlayGrid.Visibility = Visibility.Collapsed; } catch { }
            });
        }

        private void CaptureIdentifyAndProcess(CancellationToken ct)
        {
            // 1) Ensure device initialized (idempotent)
            if (!_zkService.EnsureInitialized())
            {
                Dispatcher.Invoke(() => OverlayStatusText.Text = "❌ Device not initialized.");
                Thread.Sleep(900);
                HideOverlay();
                return;
            }

            // 2) Capture single template
            Dispatcher.Invoke(() => OverlayStatusText.Text = "Scanning fingerprint (single-scan)...");
            string? capturedBase64 = null;
            try
            {
                capturedBase64 = _zkService.CaptureSingleTemplate();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Capture error: {ex}");
            }

            if (string.IsNullOrEmpty(capturedBase64))
            {
                Dispatcher.Invoke(() => OverlayStatusText.Text = "⚠️ No fingerprint captured.");
                Thread.Sleep(1200);
                HideOverlay();
                return;
            }

            Dispatcher.Invoke(() => OverlayStatusText.Text = "Captured. Identifying...");

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
                    Dispatcher.Invoke(() => OverlayStatusText.Text = "⚠️ Captured template corrupt.");
                    Thread.Sleep(900);
                    HideOverlay();
                    return;
                }

                var (fid, score) = _zkService.IdentifyTemplate(capturedBytes);
                if (fid > 0)
                {
                    matchedFid = fid;
                    matchedScore = score;
                    // Map fid -> employee id
                    var emp = _data_service_get().GetEmployeeIdByRowId(fid);
                    if (!string.IsNullOrEmpty(emp))
                    {
                        matchedEmployeeId = emp;
                        var info = _data_service_get().GetAllEnrollments().FirstOrDefault(e => e.EmployeeId == emp);
                        matchedName = info.Name;
                        matchedDept = info.Department;
                        sdkMatched = true;
                        LogHelper.Write($"🔍 SDK matched fid={fid} -> emp={emp} score={score}");
                    }
                    else
                    {
                        LogHelper.Write($"🔍 SDK returned fid={fid} but no employee found for that fid.");
                    }
                }
                else
                {
                    LogHelper.Write("🔍 SDK did not find a match (fid<=0).");
                }

                // if SDK didn't match, fallback below
            }
            catch (Exception ex)
            {
                LogHelper.Write($"SDK identify invocation failed: {ex}");
            }

            // 4) If SDK didn't match, fall back to heuristic matching
            double bestScore = 0.0;
            if (!sdkMatched)
            {
                Dispatcher.Invoke(() => OverlayStatusText.Text = "SDK identify unavailable/no-match — using fallback verification...");
                var enrollments = _data_service_get().GetAllEnrollments();
                var capturedBytes = Convert.FromBase64String(capturedBase64);
                const double MatchThreshold = 0.72;

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
                            matchedDept = en.Department;
                        }
                        if (sim >= MatchThreshold)
                        {
                            bestScore = sim;
                            matchedEmployeeId = en.EmployeeId;
                            matchedName = en.Name;
                            matchedDept = en.Department;
                            break;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogHelper.Write($"Heuristic compare error for {en.EmployeeId}: {ex.Message}");
                        continue;
                    }
                }

                if (string.IsNullOrEmpty(matchedEmployeeId) || bestScore < MatchThreshold)
                {
                    Dispatcher.Invoke(() => OverlayStatusText.Text = $"❌ No matching employee (best score {bestScore:P0}).");
                    Thread.Sleep(1500);
                    HideOverlay();
                    return;
                }

                LogHelper.Write($"Fallback matched {matchedEmployeeId} with score {bestScore:F2}");
            }

            // 5) Show placeholder photo + name + id
            Dispatcher.Invoke(() =>
            {
                OverlayNameText.Text = string.IsNullOrEmpty(matchedName) ? "Name Placeholder" : matchedName;
                OverlayIdText.Text = matchedEmployeeId;
                OverlayStatusText.Text = sdkMatched
                    ? $"Identified (fid={matchedFid}, score={matchedScore}) — processing..."
                    : $"Identified (score {bestScore:P0}) — processing...";
                PhotoPlaceholderText.Text = "PHOTO";
            });

            Thread.Sleep(1000);
            ct.ThrowIfCancellationRequested();

            // 6) Clock-in / Clock-out using session API
            var now = DateTime.Now;

            try
            {
                long openSessionId = _data_service_get().GetOpenSessionId(matchedEmployeeId, now);

                if (openSessionId > 0)
                {
                    // clock-out the open session
                    double hours = _data_service_get().SaveClockOut(openSessionId, now);
                    Dispatcher.Invoke(() => OverlayStatusText.Text = hours >= 0 ? $"✅ Clock-out recorded. Hours: {hours:F2}" : "⚠️ Clock-out failed.");
                    Thread.Sleep(1000); // keep overlay visible 10s
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
                        hasCompleted = false; // safe default
                    }

                    if (hasCompleted)
                    {
                        Dispatcher.Invoke(() => OverlayStatusText.Text = $"⚠️ {matchedEmployeeId} already completed attendance for today. No new clock-in created.");
                        Thread.Sleep(1000);
                    }
                    else
                    {
                        // create new clock-in
                        long sid = _data_service_get().SaveClockIn(matchedEmployeeId, now, "IN");
                        Dispatcher.Invoke(() => OverlayStatusText.Text = sid > 0 ? $"✅ Clock-in recorded at {now:HH:mm:ss}" : "⚠️ Clock-in failed.");
                        Thread.Sleep(1000);
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"Clock-in/out processing failed: {ex}");
                Dispatcher.Invoke(() => OverlayStatusText.Text = "⚠️ Attendance processing failed.");
                Thread.Sleep(10000);
            }

            // Refresh UI & hide overlay
            Dispatcher.Invoke(() => RefreshAttendances());
            Thread.Sleep(600);
            HideOverlay();
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
    }
}
