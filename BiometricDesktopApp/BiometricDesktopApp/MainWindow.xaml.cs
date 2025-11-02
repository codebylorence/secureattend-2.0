using System;
using System.Threading.Tasks;
using System.Windows;
using BiometricDesktopApp.Services;

namespace BiometricDesktopApp
{
    public partial class MainWindow : Window
    {
        private readonly ZKTecoService _zkService = new();

        public MainWindow()
        {
            InitializeComponent();
        }

        private void ConnectBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_zkService.Initialize())
                {
                    StatusText.Text = "✅ Device connected successfully!";
                    EnrollBtn.IsEnabled = true;
                }
                else
                {
                    StatusText.Text = "❌ Failed to connect to fingerprint device.";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"⚠️ Connection error:\n{ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void EnrollBtn_Click(object sender, RoutedEventArgs e)
        {
            string empId = EmployeeIdInput.Text.Trim();
            if (string.IsNullOrEmpty(empId))
            {
                MessageBox.Show("Please enter an Employee ID first.", "Missing Info", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            EnrollBtn.IsEnabled = false;
            StatusText.Text = "🖐️ Place your finger 3 times...";

            try
            {
                string? template = await Task.Run(() => _zkService.EnrollFingerprint(empId));

                if (!string.IsNullOrEmpty(template))
                {
                    StatusText.Text = $"✅ Employee {empId} enrolled successfully!";
                    Console.WriteLine($"🧬 Template: {template.Substring(0, Math.Min(50, template.Length))}...");
                }
                else
                {
                    StatusText.Text = $"❌ Enrollment failed for Employee {empId}.";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"❌ Enrollment error:\n{ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                EnrollBtn.IsEnabled = true;
            }
        }

        private void ExitBtn_Click(object sender, RoutedEventArgs e)
        {
            _zkService.Close();
            Application.Current.Shutdown();
        }
    }
}
