using System;
using System.Threading;
using libzkfpcsharp;

namespace BiometricEnrollmentApp.Services
{
    public class ZKTecoService
    {
        private IntPtr _deviceHandle = IntPtr.Zero;
        private IntPtr _dbHandle = IntPtr.Zero;
        private bool _initialized;

        // 🔹 Raise this event so the UI can show progress messages
        public event Action<string>? OnStatus;

        private void UpdateStatus(string msg)
        {
            LogHelper.Write(msg);
            OnStatus?.Invoke(msg);
        }

        public bool Initialize()
        {
            try
            {
                if (_initialized)
                {
                    UpdateStatus("⚠️ Device already initialized.");
                    return true;
                }

                UpdateStatus("🔌 Initializing ZKTeco device...");
                int ret = zkfp2.Init();
                if (ret != zkfp.ZKFP_ERR_OK)
                {
                    UpdateStatus($"❌ Init failed with code {ret}");
                    return false;
                }

                int count = zkfp2.GetDeviceCount();
                if (count <= 0)
                {
                    UpdateStatus("❌ No ZKTeco device detected.");
                    zkfp2.Terminate();
                    return false;
                }

                UpdateStatus($"📦 Device count detected: {count}");
                _deviceHandle = zkfp2.OpenDevice(0);
                if (_deviceHandle == IntPtr.Zero)
                {
                    UpdateStatus("❌ Failed to open device.");
                    zkfp2.Terminate();
                    return false;
                }

                _dbHandle = zkfp2.DBInit();
                if (_dbHandle == IntPtr.Zero)
                {
                    UpdateStatus("❌ Failed to initialize fingerprint database.");
                    zkfp2.CloseDevice(_deviceHandle);
                    zkfp2.Terminate();
                    return false;
                }

                // 🔹 Read sensor info
                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);

                UpdateStatus($"📏 Sensor: {width}x{height}");
                _initialized = true;
                UpdateStatus("✅ ZKTeco device initialized successfully.");
                return true;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 Initialization error: {ex.Message}");
                return false;
            }
        }

        public string? EnrollFingerprint(string employeeId)
        {
            if (!_initialized)
            {
                UpdateStatus("❌ Device not initialized. Please connect first.");
                return null;
            }

            try
            {
                UpdateStatus($"🖐️ Starting enrollment for {employeeId}...");
                Thread.Sleep(1000); // let sensor warm up

                // Get real sensor size
                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);
                int imageBufferSize = width * height;

                byte[] imageBuffer = new byte[imageBufferSize];
                byte[][] templates = { new byte[2048], new byte[2048], new byte[2048] };

                for (int i = 0; i < 3; i++)
                {
                    UpdateStatus($"👉 Please place finger #{i + 1}");
                    bool captured = false;
                    int retry = 0;

                    while (retry < 60)
                    {
                        int len = 2048;
                        int ret = zkfp2.AcquireFingerprint(_deviceHandle, imageBuffer, templates[i], ref len);

                        if (ret == zkfp.ZKFP_ERR_OK && len > 0)
                        {
                            UpdateStatus($"✅ Captured {i + 1}/3 ({len} bytes)");
                            captured = true;
                            break;
                        }

                        Thread.Sleep(200);
                        retry++;

                        if (retry % 10 == 0)
                            UpdateStatus($"⏳ Waiting for finger #{i + 1} ({retry * 200 / 1000}s)");
                    }

                    if (!captured)
                    {
                        UpdateStatus($"⚠️ Failed to capture finger #{i + 1}. Aborting enrollment.");
                        return null;
                    }

                    Thread.Sleep(800);
                }

                // Ensure DB handle exists
                if (_dbHandle == IntPtr.Zero)
                {
                    _dbHandle = zkfp2.DBInit();
                    if (_dbHandle == IntPtr.Zero)
                    {
                        UpdateStatus("❌ Failed to initialize DB before merge.");
                        return null;
                    }
                }

                byte[] merged = new byte[2048];
                int mergedLen = 2048;
                int mergeResult = zkfp2.DBMerge(_dbHandle, templates[0], templates[1], templates[2], merged, ref mergedLen);

                if (mergeResult == zkfp.ZKFP_ERR_OK)
                {
                    string base64Template = Convert.ToBase64String(merged, 0, mergedLen);
                    UpdateStatus($"✅ Enrollment success for {employeeId}");
                    return base64Template;
                }

                UpdateStatus($"❌ Merge failed with code {mergeResult}");
                return null;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 Enrollment error: {ex.Message}\n{ex.StackTrace}");
                return null;
            }
        }


        public void Close()
        {
            try
            {
                if (!_initialized) return;

                if (_deviceHandle != IntPtr.Zero)
                    zkfp2.CloseDevice(_deviceHandle);
                if (_dbHandle != IntPtr.Zero)
                    zkfp2.DBFree(_dbHandle);

                zkfp2.Terminate();
                _initialized = false;
                _deviceHandle = IntPtr.Zero;
                _dbHandle = IntPtr.Zero;
                UpdateStatus("🧹 ZKTeco device closed.");
            }
            catch (Exception ex)
            {
                UpdateStatus($"⚠️ Close error: {ex.Message}");
            }
        }
    }
}
