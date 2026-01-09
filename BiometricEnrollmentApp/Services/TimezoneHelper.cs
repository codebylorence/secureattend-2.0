using System;

namespace BiometricEnrollmentApp.Services
{
    public static class TimezoneHelper
    {
        // Philippines timezone - try different timezone IDs for compatibility
        private static readonly TimeZoneInfo PhilippinesTimeZone = GetPhilippinesTimeZone();
        
        private static TimeZoneInfo GetPhilippinesTimeZone()
        {
            try
            {
                // Try IANA timezone ID first (works on newer Windows versions)
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            }
            catch
            {
                try
                {
                    // Fallback to Windows timezone ID
                    return TimeZoneInfo.FindSystemTimeZoneById("Singapore Standard Time");
                }
                catch
                {
                    // Final fallback - create custom timezone (+8 hours from UTC)
                    return TimeZoneInfo.CreateCustomTimeZone(
                        "Philippines Standard Time",
                        TimeSpan.FromHours(8),
                        "Philippines Standard Time",
                        "Philippines Standard Time"
                    );
                }
            }
        }
        
        /// <summary>
        /// Gets the current time in Philippines timezone (Asia/Manila)
        /// </summary>
        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PhilippinesTimeZone);
        
        /// <summary>
        /// Converts UTC time to Philippines timezone
        /// </summary>
        public static DateTime FromUtc(DateTime utcTime)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(utcTime, PhilippinesTimeZone);
        }
        
        /// <summary>
        /// Converts Philippines time to UTC
        /// </summary>
        public static DateTime ToUtc(DateTime philippinesTime)
        {
            return TimeZoneInfo.ConvertTimeToUtc(philippinesTime, PhilippinesTimeZone);
        }
        
        /// <summary>
        /// Gets today's date in Philippines timezone
        /// </summary>
        public static DateTime Today => Now.Date;
        
        /// <summary>
        /// Formats Philippines time for API (ISO format with timezone)
        /// </summary>
        public static string FormatForApi(DateTime philippinesTime)
        {
            var utcTime = ToUtc(philippinesTime);
            return utcTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        }
        
        /// <summary>
        /// Formats Philippines time for database storage
        /// </summary>
        public static string FormatForDatabase(DateTime philippinesTime)
        {
            return philippinesTime.ToString("yyyy-MM-dd HH:mm:ss");
        }
        
        /// <summary>
        /// Gets the timezone display name for logging
        /// </summary>
        public static string TimeZoneName => PhilippinesTimeZone.DisplayName;
    }
}