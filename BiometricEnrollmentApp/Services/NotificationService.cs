using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace BiometricEnrollmentApp.Services
{
    public class NotificationService
    {
        private readonly ApiService _apiService;
        private readonly DispatcherTimer _notificationTimer;
        private List<ScheduleNotification> _currentNotifications;

        public event EventHandler<NotificationEventArgs>? NotificationReceived;

        public NotificationService(ApiService apiService)
        {
            _apiService = apiService;
            _currentNotifications = new List<ScheduleNotification>();
            
            // Check for notifications every 30 seconds
            _notificationTimer = new DispatcherTimer();
            _notificationTimer.Interval = TimeSpan.FromSeconds(30);
            _notificationTimer.Tick += CheckForNotifications;
        }

        public void StartMonitoring()
        {
            LogHelper.Write("📢 Starting schedule notification monitoring...");
            _notificationTimer.Start();
            
            // Check immediately on start
            _ = Task.Run(async () => await CheckForNotificationsAsync());
        }

        public void StopMonitoring()
        {
            LogHelper.Write("📢 Stopping schedule notification monitoring...");
            _notificationTimer.Stop();
        }

        private async void CheckForNotifications(object? sender, EventArgs e)
        {
            await CheckForNotificationsAsync();
        }

        private async Task CheckForNotificationsAsync()
        {
            try
            {
                var notifications = await _apiService.GetScheduleNotificationsAsync();
                
                if (notifications != null && notifications.Count > 0)
                {
                    LogHelper.Write($"📢 Found {notifications.Count} new schedule notification(s)");
                    
                    foreach (var notification in notifications)
                    {
                        // Check if this is a new notification
                        if (!_currentNotifications.Exists(n => n.Id == notification.Id))
                        {
                            _currentNotifications.Add(notification);
                            
                            // Raise event for new notification
                            Application.Current.Dispatcher.Invoke(() =>
                            {
                                NotificationReceived?.Invoke(this, new NotificationEventArgs(notification));
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error checking for notifications: {ex.Message}");
            }
        }

        public async Task<bool> AcknowledgeNotificationAsync(int notificationId)
        {
            try
            {
                var success = await _apiService.AcknowledgeNotificationAsync(notificationId);
                
                if (success)
                {
                    // Remove from current notifications
                    _currentNotifications.RemoveAll(n => n.Id == notificationId);
                    LogHelper.Write($"✅ Notification {notificationId} acknowledged and removed from local list");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error acknowledging notification: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> AcknowledgeAllNotificationsAsync()
        {
            try
            {
                var success = await _apiService.AcknowledgeAllNotificationsAsync();
                
                if (success)
                {
                    _currentNotifications.Clear();
                    LogHelper.Write("✅ All notifications acknowledged and cleared from local list");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error acknowledging all notifications: {ex.Message}");
                return false;
            }
        }

        public List<ScheduleNotification> GetCurrentNotifications()
        {
            return new List<ScheduleNotification>(_currentNotifications);
        }

        public int GetNotificationCount()
        {
            return _currentNotifications.Count;
        }
    }

    public class NotificationEventArgs : EventArgs
    {
        public ScheduleNotification Notification { get; }

        public NotificationEventArgs(ScheduleNotification notification)
        {
            Notification = notification;
        }
    }
}