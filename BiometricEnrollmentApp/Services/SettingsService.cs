using Microsoft.Data.Sqlite;
using System;
using System.IO;

namespace BiometricEnrollmentApp.Services
{
    public class SettingsService
    {
        private readonly string _dbPath;

        public SettingsService()
        {
            _dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
            InitializeSettingsTable();
        }

        private void InitializeSettingsTable()
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS Settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    );
                ";
                cmd.ExecuteNonQuery();

                // Set default late threshold if not exists
                cmd.CommandText = @"
                    INSERT OR IGNORE INTO Settings (key, value)
                    VALUES ('late_threshold_minutes', '15');
                ";
                cmd.ExecuteNonQuery();

                // Set default grace periods if not exists
                cmd.CommandText = @"
                    INSERT OR IGNORE INTO Settings (key, value)
                    VALUES ('clock_in_grace_period_minutes', '10');
                ";
                cmd.ExecuteNonQuery();

                cmd.CommandText = @"
                    INSERT OR IGNORE INTO Settings (key, value)
                    VALUES ('clock_out_grace_period_minutes', '10');
                ";
                cmd.ExecuteNonQuery();

                // Set default API URL if not exists
                cmd.CommandText = @"
                    INSERT OR IGNORE INTO Settings (key, value)
                    VALUES ('api_base_url', 'http://localhost:5000');
                ";
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error initializing settings table: {ex.Message}");
            }
        }

        public int GetLateThresholdMinutes()
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT value FROM Settings WHERE key = 'late_threshold_minutes'";
                
                var result = cmd.ExecuteScalar();
                if (result != null && int.TryParse(result.ToString(), out int minutes))
                {
                    return minutes;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting late threshold: {ex.Message}");
            }

            return 15; // Default to 15 minutes
        }

        public bool SetLateThresholdMinutes(int minutes)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('late_threshold_minutes', $value);
                ";
                cmd.Parameters.AddWithValue("$value", minutes.ToString());
                
                cmd.ExecuteNonQuery();
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting late threshold: {ex.Message}");
                return false;
            }
        }

        public int GetClockInGracePeriodMinutes()
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT value FROM Settings WHERE key = 'clock_in_grace_period_minutes'";
                
                var result = cmd.ExecuteScalar();
                if (result != null && int.TryParse(result.ToString(), out int minutes))
                {
                    return minutes;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting clock-in grace period: {ex.Message}");
            }

            return 10; // Default to 10 minutes
        }

        public bool SetClockInGracePeriodMinutes(int minutes)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('clock_in_grace_period_minutes', $value);
                ";
                cmd.Parameters.AddWithValue("$value", minutes.ToString());
                
                cmd.ExecuteNonQuery();
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting clock-in grace period: {ex.Message}");
                return false;
            }
        }

        public int GetClockOutGracePeriodMinutes()
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT value FROM Settings WHERE key = 'clock_out_grace_period_minutes'";
                
                var result = cmd.ExecuteScalar();
                if (result != null && int.TryParse(result.ToString(), out int minutes))
                {
                    return minutes;
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting clock-out grace period: {ex.Message}");
            }

            return 10; // Default to 10 minutes
        }

        public bool SetClockOutGracePeriodMinutes(int minutes)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('clock_out_grace_period_minutes', $value);
                ";
                cmd.Parameters.AddWithValue("$value", minutes.ToString());
                
                cmd.ExecuteNonQuery();
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting clock-out grace period: {ex.Message}");
                return false;
            }
        }

        public string GetApiBaseUrl()
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT value FROM Settings WHERE key = 'api_base_url'";
                
                var result = cmd.ExecuteScalar();
                if (result != null)
                {
                    return result.ToString() ?? "http://localhost:5000";
                }
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error getting API base URL: {ex.Message}");
            }

            return "http://localhost:5000"; // Default to localhost
        }

        public bool SetApiBaseUrl(string url)
        {
            try
            {
                // Validate URL format
                if (string.IsNullOrWhiteSpace(url))
                {
                    return false;
                }

                // Remove trailing slash if present
                url = url.TrimEnd('/');

                using var conn = new SqliteConnection($"Data Source={_dbPath}");
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('api_base_url', $value);
                ";
                cmd.Parameters.AddWithValue("$value", url);
                
                cmd.ExecuteNonQuery();
                LogHelper.Write($"✅ API base URL updated to: {url}");
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error setting API base URL: {ex.Message}");
                return false;
            }
        }
