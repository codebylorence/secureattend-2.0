using System;
using System.Threading;
using System.Linq;
using libzkfpcsharp;

namespace BiometricEnrollmentApp.Services
{
    public class ZKTecoService
    {
        private IntPtr _deviceHandle = IntPtr.Zero;
        private IntPtr _dbHandle = IntPtr.Zero;
        private bool _initialized;

        // Public sensor info for the UI to render raw image buffers when available
        public int SensorWidth { get; private set; } = 0;
        public int SensorHeight { get; private set; } = 0;
        public int ExpectedImageSize => SensorWidth * SensorHeight;

        // 🔹 Raise this event so the UI can show progress messages
        public event Action<string>? OnStatus;

        public event Action<byte[]>? OnImageCaptured;

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

                // 🔹 Read sensor info and expose it
                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);

                SensorWidth = width;
                SensorHeight = height;

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
                Thread.Sleep(1000);

                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);

                int imageBufferSize = width * height;
                UpdateStatus($"DEBUG: Calculated image buffer size = {imageBufferSize}");

                byte[] imageBuffer = new byte[imageBufferSize];
                byte[][] templates = { new byte[4096], new byte[4096], new byte[4096] };

                // ✅ Ensure DB is initialized before capture
                if (_dbHandle == IntPtr.Zero)
                {
                    _dbHandle = zkfp2.DBInit();
                    if (_dbHandle == IntPtr.Zero)
                    {
                        UpdateStatus("❌ Failed to initialize fingerprint DB.");
                        return null;
                    }
                }

                for (int i = 0; i < 3; i++)
                {
                    UpdateStatus($"👉 Please place finger #{i + 1}");
                    bool captured = false;
                    int retry = 0;

                    while (retry < 60)
                    {
                        // tmplLen is the template/compressed length returned by SDK (not the image bytes)
                        int tmplLen = templates[i].Length; // request max template size
                        int ret = zkfp2.AcquireFingerprint(_deviceHandle, imageBuffer, templates[i], ref tmplLen);

                        if (ret == zkfp.ZKFP_ERR_OK && tmplLen > 0)
                        {
                            UpdateStatus($"✅ Captured {i + 1}/3 (template {tmplLen} bytes)");

                            // IMPORTANT: send the FULL raw image buffer to the UI for preview.
                            // The SDK writes the raw grayscale pixel data into imageBuffer (size = SensorWidth*SensorHeight).
                            // We will send the full imageBuffer (not the template slice).
                            var imgFull = new byte[imageBuffer.Length];
                            Array.Copy(imageBuffer, imgFull, imageBuffer.Length);
                            OnImageCaptured?.Invoke(imgFull);

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


                byte[] merged = new byte[4096];
                int mergedLen = merged.Length;
                int mergeResult = zkfp2.DBMerge(_dbHandle, templates[0], templates[1], templates[2], merged, ref mergedLen);
                UpdateStatus($"DEBUG: DBMerge result={mergeResult}, mergedLen={mergedLen}");

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
