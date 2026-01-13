using System;
using System.Windows;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class ScanWindow : Window
    {
        public bool WasCancelled { get; private set; }
        public string? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string? StatusMessage { get; set; }
        public string? PhotoBase64 { get; set; }
        
        private DispatcherTimer? _clockTimer;

        public ScanWindow()
        {
            InitializeComponent();
            WasCancelled = false;
            
            // Set initial time immediately
            Loaded += (s, e) => StartClock();
        }
        
        private void StartClock()
        {
            // Update clock immediately when window loads
            UpdateClock();
            
            // Create timer to update every second
            _clockTimer = new DispatcherTimer();
            _clockTimer.Interval = TimeSpan.FromSeconds(1);
            _clockTimer.Tick += (s, e) => UpdateClock();
            _clockTimer.Start();
        }
        
        private void UpdateClock()
        {
            try
            {
                var now = TimezoneHelper.Now;
                if (ClockText != null)
                {
                    ClockText.Text = now.ToString("HH:mm:ss");
                }
                if (DateText != null)
                {
                    DateText.Text = now.ToString("MMMM dd, yyyy");
                }
                LogHelper.Write($"🕐 Clock updated: {now:HH:mm:ss}");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Clock update error: {ex.Message}");
            }
        }
        
        protected override void OnClosed(EventArgs e)
        {
            _clockTimer?.Stop();
            base.OnClosed(e);
        }

        public void UpdateStatus(string status)
        {
            Dispatcher.Invoke(() =>
            {
                StatusText.Text = status;
                
                // Hide toolbox meeting info when status is reset to waiting
                if (status.Contains("Waiting for fingerprint") || status.Contains("Scanning"))
                {
                    ToolboxMeetingPanel.Visibility = Visibility.Collapsed;
                    IdText.Text = "---";
                    NameText.Text = "Scanning...";
                    PhotoImage.Visibility = Visibility.Collapsed;
                    PhotoPlaceholderText.Visibility = Visibility.Visible;
                }
            });
        }

        public void UpdateEmployeeInfo(string employeeId, string name, string? photoBase64 = null)
        {
            Dispatcher.Invoke(() =>
            {
                IdText.Text = employeeId;
                NameText.Text = name;

                // Show toolbox meeting information for this employee
                ShowToolboxMeetingInfo(employeeId);

                if (!string.IsNullOrEmpty(photoBase64))
                {
                    try
                    {
                        LogHelper.Write($"📸 Attempting to load photo (length: {photoBase64.Length} chars)");
                        
                        // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
                        string base64Data = photoBase64;
                        if (photoBase64.Contains(","))
                        {
                            int commaIndex = photoBase64.IndexOf(",");
                            base64Data = photoBase64.Substring(commaIndex + 1);
                            LogHelper.Write($"📸 Removed data URI prefix, new length: {base64Data.Length} chars");
                        }

                        byte[] imageBytes = Convert.FromBase64String(base64Data);
                        LogHelper.Write($"📸 Decoded base64 to {imageBytes.Length} bytes");
                        
                        BitmapImage bitmap = new BitmapImage();
                        bitmap.BeginInit();
                        bitmap.StreamSource = new System.IO.MemoryStream(imageBytes);
                        bitmap.CacheOption = BitmapCacheOption.OnLoad;
                        bitmap.EndInit();
                        
                        PhotoImage.Source = bitmap;
                        PhotoImage.Visibility = Visibility.Visible;
                        PhotoPlaceholderText.Visibility = Visibility.Collapsed;
                        
                        LogHelper.Write($"✅ Photo loaded and displayed successfully");
                    }
                    catch (Exception ex)
                    {
                        // If photo fails to load, keep placeholder
                        LogHelper.Write($"💥 Failed to load photo: {ex.Message}");
                        LogHelper.Write($"Stack trace: {ex.StackTrace}");
                        
                        // Ensure placeholder is visible
                        PhotoImage.Visibility = Visibility.Collapsed;
                        PhotoPlaceholderText.Visibility = Visibility.Visible;
                    }
                }
                else
                {
                    LogHelper.Write($"⚠️ No photo data provided for {employeeId}");
                    PhotoImage.Visibility = Visibility.Collapsed;
                    PhotoPlaceholderText.Visibility = Visibility.Visible;
                }
            });
        }

        private void ShowToolboxMeetingInfo(string employeeId)
        {
            try
            {
                var dataService = new DataService();
                var toolboxTimes = dataService.GetToolboxMeetingTimes(employeeId);
                
                if (!string.IsNullOrEmpty(toolboxTimes.ToolboxStart) && !string.IsNullOrEmpty(toolboxTimes.ToolboxEnd))
                {
                    ToolboxMeetingText.Text = $"{toolboxTimes.ToolboxStart} - {toolboxTimes.ToolboxEnd}";
                    ShiftTimeText.Text = $"Shift: {toolboxTimes.ShiftStart} - {toolboxTimes.ShiftEnd}";
                    ToolboxMeetingPanel.Visibility = Visibility.Visible;
                    
                    LogHelper.Write($"📋 Displaying toolbox meeting info for {employeeId}: {toolboxTimes.ToolboxStart} - {toolboxTimes.ToolboxEnd}");
                }
                else
                {
                    ToolboxMeetingPanel.Visibility = Visibility.Collapsed;
                    LogHelper.Write($"📋 No toolbox meeting info available for {employeeId} (not scheduled today)");
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error showing toolbox meeting info: {ex.Message}");
                ToolboxMeetingPanel.Visibility = Visibility.Collapsed;
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            WasCancelled = true;
            DialogResult = false;
            Close();
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            if (DialogResult == null)
            {
                WasCancelled = true;
            }
            base.OnClosing(e);
        }
    }
}
