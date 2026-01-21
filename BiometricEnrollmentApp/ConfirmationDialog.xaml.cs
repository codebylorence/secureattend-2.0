using System;
using System.Windows;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class ConfirmationDialog : Window
    {
        public bool IsConfirmed { get; private set; } = false;
        
        public ConfirmationDialog()
        {
            InitializeComponent();
            LogHelper.Write("🔍 ConfirmationDialog constructor called");
            
            // Ensure dialog is visible and on top
            this.Loaded += (s, e) => 
            {
                LogHelper.Write("🔍 ConfirmationDialog loaded event fired");
                this.Activate();
                this.Focus();
                this.Topmost = true;
                
                // Force window to front
                this.WindowState = WindowState.Normal;
                this.BringIntoView();
            };
            
            this.Activated += (s, e) => LogHelper.Write("🔍 ConfirmationDialog activated");
            this.Deactivated += (s, e) => LogHelper.Write("🔍 ConfirmationDialog deactivated");
            
            // Set initial properties to ensure visibility
            this.Topmost = true;
            this.ShowInTaskbar = true;
            this.WindowState = WindowState.Normal;
        }
        
        public void SetEmployeeInfo(string employeeName, string employeeId, DateTime clockInTime)
        {
            try
            {
                EmployeeNameText.Text = employeeName;
                EmployeeIdText.Text = $"Employee ID: {employeeId}";
                ClockInTimeText.Text = $"Clock-in time: {TimezoneHelper.FormatTimeDisplay(clockInTime)}";
                
                // Calculate working hours
                var workingTime = TimezoneHelper.Now - clockInTime;
                var hours = (int)workingTime.TotalHours;
                var minutes = workingTime.Minutes;
                
                if (hours > 0)
                {
                    WorkingHoursText.Text = $"Total working time: {hours} hour{(hours != 1 ? "s" : "")} {minutes} minute{(minutes != 1 ? "s" : "")}";
                }
                else
                {
                    WorkingHoursText.Text = $"Total working time: {minutes} minute{(minutes != 1 ? "s" : "")}";
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting employee info in confirmation dialog: {ex.Message}");
            }
        }
        
        private void ConfirmButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                IsConfirmed = true;
                LogHelper.Write("✅ User confirmed clock-out");
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in confirm button click: {ex.Message}");
            }
        }
        
        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                IsConfirmed = false;
                LogHelper.Write("❌ User cancelled clock-out");
                DialogResult = false;
                Close();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error in cancel button click: {ex.Message}");
            }
        }
        
        protected override void OnSourceInitialized(EventArgs e)
        {
            base.OnSourceInitialized(e);
            LogHelper.Write("🔍 ConfirmationDialog OnSourceInitialized called");
            
            // Auto-close after 30 seconds if no action taken
            var autoCloseTimer = new System.Timers.Timer(30000); // 30 seconds
            autoCloseTimer.Elapsed += (_, _) =>
            {
                Dispatcher.Invoke(() =>
                {
                    if (IsVisible)
                    {
                        LogHelper.Write("⏰ Confirmation dialog auto-closed after 30 seconds");
                        IsConfirmed = false;
                        DialogResult = false;
                        Close();
                    }
                });
            };
            autoCloseTimer.AutoReset = false;
            autoCloseTimer.Start();
        }
        
        protected override void OnActivated(EventArgs e)
        {
            base.OnActivated(e);
            LogHelper.Write("🔍 ConfirmationDialog OnActivated called");
        }
        
        protected override void OnContentRendered(EventArgs e)
        {
            base.OnContentRendered(e);
            LogHelper.Write("🔍 ConfirmationDialog OnContentRendered called - dialog should be visible now");
        }
    }
}