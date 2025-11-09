using Microsoft.Data.Sqlite;
using System;
using System.IO;
using System.Data.SQLite;
using System.Collections.Generic;

namespace BiometricEnrollmentApp.Services
{
    public class DataService
    {
        private readonly string _dbPath;

        public DataService()
        {
            _dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "biometric_local.db");
            InitializeDatabase();
        }

        private void InitializeDatabase()
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Enrollments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL UNIQUE,
                    name TEXT,
                    department TEXT,
                    fingerprint_template TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            ";
            cmd.ExecuteNonQuery();
        }

        public void SaveEnrollment(string employeeId, string templateBase64, string? name = null, string? department = null)
        {
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO Enrollments (employee_id, name, department, fingerprint_template)
                VALUES ($id, $name, $dept, $tmpl)
                ON CONFLICT(employee_id)
                DO UPDATE SET 
                    name = excluded.name,
                    department = excluded.department,
                    fingerprint_template = excluded.fingerprint_template;
            ";
            cmd.Parameters.AddWithValue("$id", employeeId);
            cmd.Parameters.AddWithValue("$name", name ?? "");
            cmd.Parameters.AddWithValue("$dept", department ?? "");
            cmd.Parameters.AddWithValue("$tmpl", templateBase64);
            cmd.ExecuteNonQuery();
        }

        public List<(string EmployeeId, string Name, string Department, string Template)> GetAllEnrollments()
        {
            var list = new List<(string, string, string, string)>();
            using var conn = new SqliteConnection($"Data Source={_dbPath}");
            conn.Open();

            var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT employee_id, name, department, fingerprint_template FROM Enrollments";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add((reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3)));
            }

            return list;
        }

        public void DeleteEnrollment(string employeeId)
        {
            try
            {
                using var conn = new SQLiteConnection(_dbPath);
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM enrollments WHERE employee_id = @id";
                cmd.Parameters.AddWithValue("@id", employeeId);
                int rows = cmd.ExecuteNonQuery();

                LogHelper.Write(rows > 0
                    ? $"🗑️ Deleted enrollment for {employeeId}"
                    : $"⚠️ No enrollment found for {employeeId} to delete.");
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Error deleting enrollment for {employeeId}: {ex.Message}");
            }
        }

    }
}
