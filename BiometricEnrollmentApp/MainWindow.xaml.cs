using System.Windows;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class MainWindow : Window
    {
        private readonly ZKTecoService _zkService = new();

        public MainWindow()
        {
            InitializeComponent();

            // Navigate to AttendancePage as the home page
            var attendance = new AttendancePage(_zkService);
            MainFrame.Navigate(attendance);
        }
    }
}
