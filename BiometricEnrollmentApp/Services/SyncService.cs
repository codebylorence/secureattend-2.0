using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using System.Timers;

namespace BiometricEnrollmentApp.Services
{
    public class SyncService
    {
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly Timer _syncTimer;
        private bool _isRunning = false;

        public SyncService(DataService dataService, ApiService apiService)
        {
            _dataService = dataService;
            _apiService = apiService;
            
            // Set up timer to retry failed syncs every 5 minutes
            _syncTimer = new Timer(5 * 60 * 1000); // 5 minutes
            _syncTimer.Elapsed += OnSyncTimerElapsed;
            _syncTimer.AutoReset = true;
        }

        public void StartSyncService()
        {
            LogHelper.Write("🔄 Starting sync service...");
            _syncTimer.Start();
        }

        public void StopSyncService()
        {
            LogHelper.Write("⏹️ Stopping sync service...");
            _syncTimer.Stop();
        }

        private async void OnSyncTimerElapsed(object sender, ElapsedEventArgs e)
        {
            if (_isRunning) return; // Prevent overlapping sync operations
            
            _isRunning = true;
            try
            {
                await ProcessPendingSyncs();
            }
            finally
            {
                _isRunning = false;
            }
        }

        public async Task ProcessPendingSyncs()
        {
            try
            {
                var pendingItems = _dataService.GetPendingSyncItems();
                
                if (pendingItems.Count == 0)
                {
                    LogHelper.Write("🔄 No pending sync items");
                    return;
                }

                LogHelper.Write($"🔄 Processing {pendingItems.Count} pending sync items...");

                int succeeded = 0;
                int failed = 0;

                foreach (var item in pendingItems)
                {
                    try
                    {
                        LogHelper.Write($"🔄 Retrying sync for {item.EmployeeId} (attempt {item.RetryCount + 1}/5)");

                        // Parse the payload to extract attendance data
                        var payload = JsonSerializer.Deserialize<AttendancePayload>(item.Payload);
                        
                        // Attempt to sync
                        bool success = await _apiService.SendAttendanceAsync(
                            payload.employee_id,
                            !string.IsNullOrEmpty(payload.clock_in) ? DateTime.Parse(payload.clock_in) : null,
                            !string.IsNullOrEmpty(payload.clock_out) ? DateTime.Parse(payload.clock_out) : null,
                            payload.status
                        );

                        if (success)
                        {
                            _dataService.MarkSyncCompleted(item.Id);
                            succeeded++;
                            LogHelper.Write($"✅ Sync retry succeeded for {item.EmployeeId}");
                        }
                        else
                        {
                            _dataService.MarkSyncFailed(item.Id);
                            failed++;
                            LogHelper.Write($"❌ Sync retry failed for {item.EmployeeId}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _dataService.MarkSyncFailed(item.Id);
                        failed++;
                        LogHelper.Write($"💥 Sync retry exception for {item.EmployeeId}: {ex.Message}");
                    }
                }

                LogHelper.Write($"🔄 Sync retry complete: {succeeded} succeeded, {failed} failed");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 ProcessPendingSyncs error: {ex.Message}");
            }
        }

        /// <summary>
        /// Queue an attendance record for sync with retry mechanism
        /// </summary>
        public async Task<bool> QueueAttendanceSync(string employeeId, long sessionId, DateTime? clockIn, DateTime? clockOut, string status)
        {
            try
            {
                // First, try immediate sync
                bool immediateSuccess = await _apiService.SendAttendanceAsync(employeeId, clockIn, clockOut, status);
                
                if (immediateSuccess)
                {
                    LogHelper.Write($"✅ Immediate sync succeeded for {employeeId}");
                    return true;
                }

                // If immediate sync fails, add to queue for retry
                var payload = new AttendancePayload
                {
                    employee_id = employeeId,
                    clock_in = clockIn?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    clock_out = clockOut?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    status = status
                };

                var payloadJson = JsonSerializer.Serialize(payload);
                _dataService.AddToSyncQueue(employeeId, sessionId, "attendance", payloadJson);
                
                LogHelper.Write($"📝 Queued attendance sync for retry: {employeeId}");
                return false; // Indicate that immediate sync failed but queued for retry
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 QueueAttendanceSync error: {ex.Message}");
                return false;
            }
        }
    }

    public class AttendancePayload
    {
        public string employee_id { get; set; }
        public string clock_in { get; set; }
        public string clock_out { get; set; }
        public string status { get; set; }
    }
}