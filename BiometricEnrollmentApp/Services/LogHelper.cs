using System;
using System.IO;
using System.Linq;

namespace BiometricEnrollmentApp.Services
{
    public static class LogHelper
    {
        private static readonly string LogDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Logs");
        private static readonly string LogFile = Path.Combine(LogDir, $"ZKTecoLog_{TimezoneHelper.Now:yyyyMMdd_HHmmss}.txt");

        static LogHelper()
        {
            try
            {
                if (!Directory.Exists(LogDir))
                    Directory.CreateDirectory(LogDir);

                // Keep only 5 recent logs
                var files = new DirectoryInfo(LogDir).GetFiles("ZKTecoLog_*.txt");
                if (files.Length > 5)
                {
                    foreach (var old in files.OrderBy(f => f.CreationTime).Take(files.Length - 5))
                        old.Delete();
                }
            }
            catch { /* ignore any I/O errors */ }
        }

        public static void Write(string message)
        {
            string line = $"[{TimezoneHelper.Now:HH:mm:ss}] {message}";
            Console.WriteLine(line);
            try
            {
                File.AppendAllText(LogFile, line + Environment.NewLine);
            }
            catch { }
        }
    }
}
