using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using System.Timers;
using System.Threading;

namespace BiometricEnrollmentApp.Services
{
    public class SyncService
    {
        private readonly DataService _dataService;
        private readonly ApiService _apiService;
        private readonly System.Timers.Timer _syncTimer;
        private readonly System.Timers.Timer _bulkSyncTimer;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private bool _isRunning = false;
        private bool _isScheduleSyncRunning = false;
        private bool _isBulkSyncRunning = false;
        private DateTime _lastScheduleSync = DateTime.MinValue;

        public SyncService(DataService dataService, ApiService apiService)
        {
            _dataService = dataService;
            _apiService = apiService;
            _cancellationTokenSource = new CancellationTokenSource();
            
            // Set up timer to retry failed syncs every 5 minutes
            _syncTimer = new System.Timers.Timer(5 * 60 * 1000); // 5 minutes
            _syncTimer.Elapsed += OnSyncTimerElapsed;
            _syncTimer.AutoReset = true;

            // Set up timer for bulk attendance sync every 2 seconds (faster for real-time sync)
            _bulkSyncTimer = new System.Timers.Timer(2 * 1000); // 2 seconds
            _bulkSyncTimer.Elapsed += OnBulkSyncTimerElapsed;
            _bulkSyncTimer.AutoReset = true;
        }
        
        /// <summary>
        /// Trigger immediate sync of pending attendance records
        /// Call this after creating new absent or missed clock-out records
        /// </summary>
        public async Task TriggerImmediateSync()
        {
            try
            {
                LogHelper.Write("⚡ Immediate sync triggered");
                await SyncTodayAttendanceRecords();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in immediate sync: {ex.Message}");
            }
        }

        public void StartSyncService()
        {
            LogHelper.Write("🔄 Starting sync service...");
            LogHelper.Write($"🔄 Attendance sync timer: {_syncTimer.Interval}ms ({_syncTimer.Interval / 1000}s)");
            LogHelper.Write($"🔄 Bulk sync timer: {_bulkSyncTimer.Interval}ms ({_bulkSyncTimer.Interval / 1000}s)");
            
            _syncTimer.Start();
            _bulkSyncTimer.Start();
            
            LogHelper.Write("✅ Sync timers started successfully");
            
            // Start background schedule sync task
            LogHelper.Write("🔄 Starting background schedule sync task...");
            Task.Run(async () => await BackgroundScheduleSyncLoop(_cancellationTokenSource.Token));
            
            // Perform initial schedule sync
            LogHelper.Write("🔄 Performing initial schedule sync...");
            Task.Run(async () => await SyncSchedulesAsync());
        }

        public void StopSyncService()
        {
            LogHelper.Write("⏹️ Stopping sync service...");
            _syncTimer.Stop();
            _bulkSyncTimer.Stop();
            _cancellationTokenSource.Cancel();
        }

        private async Task BackgroundScheduleSyncLoop(CancellationToken cancellationToken)
        {
            LogHelper.Write("🔄 Background schedule sync loop started");
            
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    if (!_isScheduleSyncRunning)
                    {
                        LogHelper.Write("⏰ Background schedule sync triggered");
                        await SyncSchedulesAsync();
                    }
                    
                    // Wait 30 seconds before next sync
                    await Task.Delay(30000, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    LogHelper.Write("🛑 Background schedule sync loop cancelled");
                    break;
                }
                catch (Exception ex)
                {
                    LogHelper.Write($"💥 Error in background schedule sync loop: {ex.Message}");
                    // Wait a bit before retrying
                    await Task.Delay(5000, cancellationToken);
                }
            }
            
            LogHelper.Write("🔄 Background schedule sync loop ended");
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

        private async void OnBulkSyncTimerElapsed(object sender, ElapsedEventArgs e)
        {
            if (_isBulkSyncRunning) return; // Prevent overlapping sync operations
            
            _isBulkSyncRunning = true;
            try
            {
                await SyncTodayAttendanceRecords();
            }
            finally
            {
                _isBulkSyncRunning = false;
            }
        }

        public async Task SyncSchedulesAsync()
        {
            if (_isScheduleSyncRunning)
            {
                LogHelper.Write("⚠️ Schedule sync already running, skipping");
                return;
            }
            
            _isScheduleSyncRunning = true;
            
            try
            {
                LogHelper.Write("🔄 SyncSchedulesAsync called");
                
                // Check if network is available
                if (!System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable())
                {
                    LogHelper.Write("🌐 Network not available - skipping schedule sync");
                    return;
                }

                LogHelper.Write("🔄 Auto-syncing schedules from server...");
                
                var schedules = await _apiService.GetAllSchedulesAsync();
                
                if (schedules != null)
                {
                    LogHelper.Write($"📥 Received {schedules.Count} schedules from server");
                    int updated = _dataService.UpdateSchedules(schedules);
                    
                    LogHelper.Write($"✅ Schedule sync: Updated {updated} schedule(s) from server");
                    
                    // Notify about schedule update
                    OnSchedulesUpdated?.Invoke(updated);
                    
                    _lastScheduleSync = DateTime.Now;
                }
                else
                {
                    LogHelper.Write("⚠️ Schedule sync: No schedules received from server (null response)");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in schedule sync: {ex.Message}");
                LogHelper.Write($"💥 Stack trace: {ex.StackTrace}");
            }
            finally
            {
                _isScheduleSyncRunning = false;
            }
        }

        public async Task ProcessPendingSyncs()
        {
            try
            {
                var pendingItems = _dataService.GetPendingSyncItems();
                
                if (pendingItems.Count == 0)
                {
                    return; // Don't log when no pending items to reduce spam
                }

                LogHelper.Write($"🔄 Processing {pendingItems.Count} pending sync items...");

                int succeeded = 0;
                int failed = 0;

                foreach (var item in pendingItems)
                {
                    try
                    {
                        LogHelper.Write($"🔄 Retrying sync for {item.EmployeeId} (type: {item.SyncType}, attempt {item.RetryCount + 1}/5)");

                        bool success = false;

                        // Handle different sync types
                        if (item.SyncType == "attendance")
                        {
                            // Regular attendance with clock in/out times
                            var payload = JsonSerializer.Deserialize<AttendancePayload>(item.Payload);
                            success = await _apiService.SendAttendanceAsync(
                                payload.employee_id,
                                !string.IsNullOrEmpty(payload.clock_in) ? DateTime.Parse(payload.clock_in) : null,
                                !string.IsNullOrEmpty(payload.clock_out) ? DateTime.Parse(payload.clock_out) : null,
                                payload.status
                            );
                        }
                        else if (item.SyncType == "absent" || item.SyncType == "missed_clockout")
                        {
                            // Absent or missed clock-out - get full session data from database
                            var session = _dataService.GetSessionById(item.AttendanceSessionId);
                            if (session != null)
                            {
                                DateTime? clockIn = !string.IsNullOrEmpty(session.Value.ClockIn) ? DateTime.Parse(session.Value.ClockIn) : null;
                                DateTime? clockOut = !string.IsNullOrEmpty(session.Value.ClockOut) ? DateTime.Parse(session.Value.ClockOut) : null;
                                
                                success = await _apiService.SendAttendanceAsync(
                                    item.EmployeeId,
                                    clockIn,
                                    clockOut,
                                    session.Value.Status
                                );
                            }
                            else
                            {
                                LogHelper.Write($"⚠️ Session {item.AttendanceSessionId} not found for {item.EmployeeId}");
                                _dataService.MarkSyncFailed(item.Id);
                                failed++;
                                continue;
                            }
                        }
                        else
                        {
                            LogHelper.Write($"⚠️ Unknown sync type: {item.SyncType}");
                            _dataService.MarkSyncFailed(item.Id);
                            failed++;
                            continue;
                        }

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

        /// <summary>
        /// Force an immediate schedule sync
        /// </summary>
        public async Task<int> ForceScheduleSyncAsync()
        {
            try
            {
                LogHelper.Write("🔄 Force syncing schedules from server...");
                
                var schedules = await _apiService.GetAllSchedulesAsync();
                
                if (schedules != null)
                {
                    int updated = _dataService.UpdateSchedules(schedules);
                    LogHelper.Write($"✅ Force sync: Updated {updated} schedule(s) from server");
                    
                    _lastScheduleSync = DateTime.Now;
                    
                    // Notify about schedule update
                    OnSchedulesUpdated?.Invoke(updated);
                    
                    return updated;
                }
                else
                {
                    LogHelper.Write("⚠️ Force sync: No schedules received from server");
                    return 0;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in force schedule sync: {ex.Message}");
                return -1;
            }
        }

        // Event to notify when schedules are updated
        public event Action<int>? OnSchedulesUpdated;

        /// <summary>
        /// Sync all today's attendance records to the server in bulk
        /// This is more efficient than syncing one by one
        /// </summary>
        public async Task<bool> SyncTodayAttendanceRecords()
        {
            try
            {
                // Get all today's sessions from local database
                var todaySessions = _dataService.GetTodaySessions();
                
                if (todaySessions.Count == 0)
                {
                    return true; // No records to sync
                }

                LogHelper.Write($"📤 Syncing {todaySessions.Count} attendance records to server...");

                // Prepare records for bulk sync
                var records = new List<object>();
                foreach (var session in todaySessions)
                {
                    // Parse dates
                    DateTime? clockIn = null;
                    DateTime? clockOut = null;
                    
                    if (!string.IsNullOrEmpty(session.ClockIn))
                    {
                        clockIn = DateTime.Parse(session.ClockIn);
                    }
                    
                    if (!string.IsNullOrEmpty(session.ClockOut))
                    {
                        clockOut = DateTime.Parse(session.ClockOut);
                    }

                    records.Add(new
                    {
                        employee_id = session.EmployeeId,
                        date = session.Date,
                        clock_in = clockIn?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        clock_out = clockOut?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        status = session.Status,
                        total_hours = session.TotalHours,
                        overtime_hours = (object?)null // Will be calculated by server if needed
                    });
                }

                // Send bulk sync request
                bool success = await _apiService.SyncAttendanceRecordsAsync(records);
                
                if (success)
                {
                    LogHelper.Write($"✅ Successfully synced {records.Count} attendance records");
                }
                else
                {
                    LogHelper.Write($"❌ Failed to sync attendance records");
                }

                return success;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error syncing attendance records: {ex.Message}");
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