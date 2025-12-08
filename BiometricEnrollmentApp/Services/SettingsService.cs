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
    }
}
