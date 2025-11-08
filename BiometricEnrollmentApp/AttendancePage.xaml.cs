using System;
using System.Windows;
using System.Windows.Controls;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AttendancePage : Page
    {
        private readonly ZKTecoService _zkService;

        public AttendancePage(ZKTecoService zkService)
        {
            InitializeComponent();
            _zkService = zkService;
        }

        private void GoEnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            var enroll = new EnrollmentPage(_zkService);
            NavigationService?.Navigate(enroll);
        }

        private void SimulateScanBtn_Click(object sender, RoutedEventArgs e)
        {
            AttendanceLog.Items.Add($"Simulated attendance at {DateTime.Now:g}");
        }
    }
}
