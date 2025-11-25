using System;
using System.Linq;
using BiometricEnrollmentApp.Services;

namespace BiometricEnrollmentApp
{
    /// <summary>
    /// Simple diagnostic utility to check enrolled fingerprints
    /// Call CheckEnrollments.Run() to verify your enrollments are in the database
    /// </summary>
    public class CheckEnrollments
    {
        public static void Run()
        {
            Console.WriteLine("=== SecureAttend Enrollment Checker ===\n");
            
            try
            {
                var dataService = new DataService();
                var enrollments = dataService.GetAllEnrollmentsWithRowId();
                
                Console.WriteLine($"Total enrollments found: {enrollments.Count}\n");
                
                if (enrollments.Count == 0)
                {
                    Console.WriteLine("⚠️ No enrollments found in database!");
                    Console.WriteLine("Please enroll at least one fingerprint first.");
                }
                else
                {
                    Console.WriteLine("Enrolled employees:");
                    Console.WriteLine("-------------------");
                    
                    foreach (var e in enrollments)
                    {
                        Console.WriteLine($"Employee ID: {e.EmployeeId}");
                        Console.WriteLine($"  Name: {e.Name}");
                        Console.WriteLine($"  Department: {e.Department}");
                        Console.WriteLine($"  Row ID (FID): {e.RowId}");
                        Console.WriteLine($"  Template Size: {(string.IsNullOrEmpty(e.Template) ? "MISSING!" : $"{e.Template.Length} chars")}");
                        Console.WriteLine();
                    }
                }
                
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
                Console.WriteLine($"\nStack trace:\n{ex.StackTrace}");
            }
        }
    }
}
