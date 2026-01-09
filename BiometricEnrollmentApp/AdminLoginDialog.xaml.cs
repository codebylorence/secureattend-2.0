using System.Windows;

namespace BiometricEnrollmentApp
{
    public partial class AdminLoginDialog : Window
    {
        public bool IsAuthenticated { get; private set; } = false;

        // Simple hardcoded credentials - you can modify these or load from config
        private const string ADMIN_USERNAME = "admin";
        private const string ADMIN_PASSWORD = "admin123";

        public AdminLoginDialog()
        {
            InitializeComponent();
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

            // Simple authentication check
            if (username.Equals(ADMIN_USERNAME, System.StringComparison.OrdinalIgnoreCase) && 
                password == ADMIN_PASSWORD)
            {
                IsAuthenticated = true;
                DialogResult = true;
                Close();
            }
            else
            {
                ShowError("Invalid username or password.");
                PasswordBox.Clear();
                PasswordBox.Focus();
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