using System.Windows;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    public partial class AdminLoginDialog : Window
    {
        public bool IsAuthenticated { get; private set; } = false;
        private readonly DataService _dataService;

        public AdminLoginDialog()
        {
            InitializeComponent();
            _dataService = new DataService();
            UsernameTextBox.Focus();
            
            // Allow Enter key to login
            KeyDown += (sender, e) =>
            {
                if (e.Key == System.Windows.Input.Key.Enter)
                {
                    LoginButton_Click(sender, e);
                }
            };
        }

        private void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            var username = UsernameTextBox.Text.Trim();
            var password = PasswordBox.Password;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                ShowError("Please enter both username and password.");
                return;
            }

            // Validate credentials against database
            if (_dataService.ValidateAdminCredentials(username, password))
            {
                IsAuthenticated = true;
                DialogResult = true;
                LogHelper.Write($"✅ Admin login successful: {username}");
                Close();
            }
            else
            {
                ShowError("Invalid username or password.");
                PasswordBox.Clear();
                PasswordBox.Focus();
                LogHelper.Write($"❌ Failed admin login attempt: {username}");
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            IsAuthenticated = false;
            DialogResult = false;
            Close();
        }

        private void ShowError(string message)
        {
            ErrorMessage.Text = message;
            ErrorMessage.Visibility = Visibility.Visible;
        }
    }
}