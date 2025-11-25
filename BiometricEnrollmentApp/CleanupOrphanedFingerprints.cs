using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    /// <summary>
    /// Standalone utility to clean up fingerprint records for deleted employees.
    /// Run this to manually sync and remove orphaned fingerprints.
    /// </summary>
    public class CleanupOrphanedFingerprints
    {
        public static async Task Main(string[] args)
        {
            Console.WriteLine("=== Fingerprint Cleanup Utility ===\n");
            
            var dataService = new DataService();
            
            try
            {
                // Get all local enrollments
                var localEnrollments = dataService.GetAllEnrollments();
                Console.WriteLine($"📋 Found {localEnrollments.Count} fingerprint records in local database\n");
                
                // Fetch employees from server
                Console.WriteLine("🌐 Connecting to server...");
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                
                var employees = await client.GetFromJsonAsync<List<EmployeeDto>>("http://localhost:5000/employees");
                
                if (employees == null || employees.Count == 0)
                {
                    Console.WriteLine("❌ Server returned no employees. Aborting for safety.");
                    return;
                }
                
                Console.WriteLine($"✅ Server has {employees.Count} active employees\n");
                
                // Find orphaned records
                var activeEmployeeIds = employees.Select(e => e.employeeId).ToHashSet();
                var orphaned = localEnrollments.Where(e => !activeEmployeeIds.Contains(e.EmployeeId)).ToList();
                
                if (orphaned.Count == 0)
                {
                    Console.WriteLine("✅ No orphaned fingerprint records found. All records are valid!");
                    return;
                }
                
                Console.WriteLine($"⚠️  Found {orphaned.Count} orphaned fingerprint record(s):\n");
                foreach (var record in orphaned)
                {
                    Console.WriteLine($"   - {record.EmployeeId} ({record.Name})");
                }
                
                Console.Write($"\n❓ Delete these {orphaned.Count} record(s)? (yes/no): ");
                var response = Console.ReadLine()?.Trim().ToLower();
                
                if (response != "yes" && response != "y")
                {
                    Console.WriteLine("❌ Cleanup cancelled.");
                    return;
                }
                
                // Delete orphaned records
                Console.WriteLine("\n🗑️  Deleting orphaned records...");
                int deleted = 0;
                foreach (var record in orphaned)
                {
                    try
                    {
                        dataService.DeleteEnrollment(record.EmployeeId);
                        Console.WriteLine($"   ✅ Deleted: {record.EmployeeId}");
                        deleted++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   ❌ Failed to delete {record.EmployeeId}: {ex.Message}");
                    }
                }
                
                Console.WriteLine($"\n✅ Cleanup complete! Deleted {deleted} of {orphaned.Count} record(s).");
                Console.WriteLine("\n💡 Tip: Restart the biometric app to reload templates.");
            }
            catch (HttpRequestException)
            {
                Console.WriteLine("❌ Cannot connect to server at http://localhost:5000");
                Console.WriteLine("   Make sure the backend server is running (node server.js)");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
            }
            
            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}
