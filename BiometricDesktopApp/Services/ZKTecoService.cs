using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;

namespace BiometricDesktopApp.Services
{
    public static class LogHelper
    {
        private static readonly string LogDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Logs");
        private static readonly string LogFile = Path.Combine(LogDir, $"ZKTecoLog_{DateTime.Now:yyyyMMdd_HHmmss}.txt");

        static LogHelper()
        {
            try
            {
                if (!Directory.Exists(LogDir))
                    Directory.CreateDirectory(LogDir);

                var files = new DirectoryInfo(LogDir).GetFiles("ZKTecoLog_*.txt");
                foreach (var old in files.OrderBy(f => f.CreationTime).Take(files.Length - 5))
                    old.Delete();
            }
            catch { }
        }

        public static void Write(string message)
        {
            string line = $"[{DateTime.Now:HH:mm:ss}] {message}";
            Console.WriteLine(line);
            try { File.AppendAllText(LogFile, line + Environment.NewLine); } catch { }
        }
    }

    public class ZKTecoService
    {
        public IntPtr DeviceHandle { get; private set; } = IntPtr.Zero;
        private bool _running = false;

        // ✅ Safe wrapper for native calls
        private static T SafeInvoke<T>(Func<T> action, string functionName)
        {
            try
            {
                return action();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Native call '{functionName}' crashed: {ex.Message}");
                LogHelper.Write(ex.StackTrace ?? "");
                return default!;
            }
        }

        private static void SafeInvoke(Action action, string functionName)
        {
            try
            {
                action();
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Native call '{functionName}' crashed: {ex.Message}");
                LogHelper.Write(ex.StackTrace ?? "");
            }
        }

        public bool Initialize()
        {
            try
            {
                string dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libzkfpcsharp.dll");
                if (!File.Exists(dllPath))
                {
                    LogHelper.Write($"❌ DLL not found at: {dllPath}");
                    return false;
                }

                var assembly = Assembly.LoadFile(dllPath);
                var zkfp2Type = assembly.GetType("libzkfpcsharp.zkfp2");

                if (zkfp2Type == null)
                {
                    LogHelper.Write("❌ zkfp2 type not found in DLL.");
                    return false;
                }

                int ret = SafeInvoke(() => (int)zkfp2Type.GetMethod("Init")!.Invoke(null, null)!, "Init");
                if (ret != 0)
                {
                    LogHelper.Write($"❌ Init() failed with code {ret}");
                    return false;
                }

                DeviceHandle = SafeInvoke(() => (IntPtr)zkfp2Type.GetMethod("OpenDevice")!.Invoke(null, new object[] { 0 })!, "OpenDevice");
                if (DeviceHandle == IntPtr.Zero)
                {
                    LogHelper.Write("❌ Failed to open fingerprint device.");
                    return false;
                }

                LogHelper.Write("✅ ZKTeco device initialized successfully.");
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"⚠️ Exception during initialization: {ex.Message}\n{ex.StackTrace}");
                return false;
            }
        }

        public string? EnrollFingerprint(string employeeId)
        {
            try
            {
                LogHelper.Write($"🖐️ Starting enrollment for {employeeId}...");

                IntPtr dbHandle = SafeInvoke(() => libzkfpcsharp.zkfp2.DBInit(), "DBInit");
                if (dbHandle == IntPtr.Zero)
                {
                    LogHelper.Write("❌ Failed to initialize fingerprint DB.");
                    return null;
                }

                // --- NEW: Get device parameters ---
                int size = 4;
                byte[] paramValue = new byte[4];

                int width = 0, height = 0, dpi = 0;
                SafeInvoke(() =>
                {
                    libzkfpcsharp.zkfp2.GetParameters(DeviceHandle, 1, paramValue, ref size);
                    width = BitConverter.ToInt32(paramValue, 0);
                    libzkfpcsharp.zkfp2.GetParameters(DeviceHandle, 2, paramValue, ref size);
                    height = BitConverter.ToInt32(paramValue, 0);
                    libzkfpcsharp.zkfp2.GetParameters(DeviceHandle, 3, paramValue, ref size);
                    dpi = BitConverter.ToInt32(paramValue, 0);
                }, "GetParameters");

                LogHelper.Write($"📏 Sensor: {width}x{height} @ {dpi} DPI");

                int imageSize = width * height;
                byte[] imageBuffer = new byte[imageSize];
                byte[][] templates = new byte[3][];
                byte[] tempTemplate = new byte[2048];
                int tempLen = 0;

                // --- Capture 3 times ---
                for (int i = 0; i < 3; i++)
                {
                    LogHelper.Write($"👉 Place finger #{i + 1}");
                    int retry = 0;
                    int ret;

                    do
                    {
                        ret = SafeInvoke(() => libzkfpcsharp.zkfp2.AcquireFingerprint(DeviceHandle, imageBuffer, tempTemplate, ref tempLen), "AcquireFingerprint");
                        if (ret == 0 && tempLen > 0)
                        {
                            templates[i] = new byte[tempLen];
                            Array.Copy(tempTemplate, templates[i], tempLen);
                            LogHelper.Write($"✅ Capture {i + 1} successful ({tempLen} bytes)");
                            break;
                        }

                        Thread.Sleep(250);
                        retry++;
                    } while (retry < 40);

                    if (templates[i] == null)
                    {
                        LogHelper.Write($"⚠️ Capture {i + 1} failed.");
                        libzkfpcsharp.zkfp2.DBFree(dbHandle);
                        return null;
                    }

                    Thread.Sleep(1000);
                }

                // --- Merge captured templates ---
                byte[] merged = new byte[2048];
                int mergedLen = 0;
                int mergeResult = SafeInvoke(() => libzkfpcsharp.zkfp2.DBMerge(dbHandle, templates[0], templates[1], templates[2], merged, ref mergedLen), "DBMerge");

                libzkfpcsharp.zkfp2.DBFree(dbHandle);

                if (mergeResult == 0)
                {
                    string base64Template = Convert.ToBase64String(merged, 0, mergedLen);
                    LogHelper.Write($"✅ Enrollment success for {employeeId}");
                    return base64Template;
                }

                LogHelper.Write($"❌ Merge failed with code {mergeResult}");
                return null;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"💥 Enrollment crashed: {ex.Message}\n{ex.StackTrace}");
                return null;
            }
        }


        public void Close()
        {
            SafeInvoke(() =>
            {
                if (DeviceHandle != IntPtr.Zero)
                {
                    libzkfpcsharp.zkfp2.CloseDevice(DeviceHandle);
                    libzkfpcsharp.zkfp2.Terminate();
                    DeviceHandle = IntPtr.Zero;
                    LogHelper.Write("🧹 ZKTeco device closed.");
                }
            }, "Close");
        }
    }
}
