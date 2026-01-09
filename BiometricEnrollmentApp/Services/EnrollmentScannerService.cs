using System;
using System.Threading;
using System.Threading.Tasks;
using libzkfpcsharp;

namespace BiometricEnrollmentApp.Services
{
    /// <summary>
    /// Dedicated scanner service for enrollment operations.
    /// This service creates its own device connection separate from attendance scanning.
    /// </summary>
    public class EnrollmentScannerService
    {
        private IntPtr _enrollmentDeviceHandle = IntPtr.Zero;
        private IntPtr _enrollmentDbHandle = IntPtr.Zero;
        private bool _enrollmentInitialized = false;

        public int SensorWidth { get; private set; } = 0;
        public int SensorHeight { get; private set; } = 0;
        public int ExpectedImageSize => SensorWidth * SensorHeight;

        public event Action<string>? OnStatus;
        public event Action<byte[]>? OnImageCaptured;

        private void UpdateStatus(string msg)
        {
            LogHelper.Write($"[ENROLLMENT] {msg}");
            OnStatus?.Invoke(msg);
        }

        /// <summary>
        /// Initialize a separate device connection for enrollment operations.
        /// This won't interfere with the attendance scanner.
        /// </summary>
        public bool InitializeForEnrollment()
        {
            try
            {
                if (_enrollmentInitialized)
                {
                    UpdateStatus("⚠️ Enrollment scanner already initialized.");
                    return true;
                }

                UpdateStatus("🔌 Initializing enrollment scanner...");
                
                // Note: We don't call zkfp2.Init() again if it's already been called by attendance scanner
                // The SDK can handle multiple device handles from the same initialization
                
                int count = zkfp2.GetDeviceCount();
                if (count <= 0)
                {
                    UpdateStatus("❌ No ZKTeco device detected for enrollment.");
                    return false;
                }

                UpdateStatus($"📦 Device count for enrollment: {count}");

                // Open a separate device handle for enrollment (device index 0)
                _enrollmentDeviceHandle = zkfp2.OpenDevice(0);
                if (_enrollmentDeviceHandle == IntPtr.Zero)
                {
                    UpdateStatus("❌ Failed to open device for enrollment.");
                    return false;
                }

                // Create a separate DB handle for enrollment operations
                _enrollmentDbHandle = zkfp2.DBInit();
                if (_enrollmentDbHandle == IntPtr.Zero)
                {
                    UpdateStatus("❌ Failed to initialize enrollment DB.");
                    try { if (_enrollmentDeviceHandle != IntPtr.Zero) zkfp2.CloseDevice(_enrollmentDeviceHandle); } catch { }
                    _enrollmentDeviceHandle = IntPtr.Zero;
                    return false;
                }

                // Read sensor size
                try
                {
                    int size = 4;
                    byte[] pv = new byte[4];
                    zkfp2.GetParameters(_enrollmentDeviceHandle, 1, pv, ref size);
                    int width = BitConverter.ToInt32(pv, 0);
                    size = 4;
                    zkfp2.GetParameters(_enrollmentDeviceHandle, 2, pv, ref size);
                    int height = BitConverter.ToInt32(pv, 0);
                    SensorWidth = width;
                    SensorHeight = height;
                    UpdateStatus($"📏 Enrollment sensor: {width}x{height}");
                }
                catch (Exception ex)
                {
                    UpdateStatus($"⚠️ Could not read sensor parameters: {ex.Message}");
                }

                _enrollmentInitialized = true;
                UpdateStatus("✅ Enrollment scanner initialized successfully.");
                return true;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 Enrollment scanner initialization error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Perform fingerprint enrollment using dedicated enrollment scanner.
        /// This won't interfere with attendance scanning operations.
        /// </summary>
        public async Task<string?> EnrollFingerprintAsync(string employeeId, CancellationToken cancellationToken = default)
        {
            if (!_enrollmentInitialized)
            {
                UpdateStatus("❌ Enrollment scanner not initialized. Please connect first.");
                return null;
            }

            try
            {
                UpdateStatus($"🖐️ Starting enrollment for {employeeId}...");
                await Task.Delay(300, cancellationToken);

                int imageBufferSize = SensorWidth * SensorHeight;
                if (imageBufferSize <= 0)
                {
                    imageBufferSize = 256 * 360; // Default size
                }

                byte[] imageBuffer = new byte[imageBufferSize];
                byte[][] templates = { new byte[4096], new byte[4096], new byte[4096] };

                for (int i = 0; i < 3; i++)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        UpdateStatus("❌ Enrollment cancelled.");
                        return null;
                    }

                    UpdateStatus($"👉 Please place finger #{i + 1}");
                    bool captured = false;
                    int retry = 0;

                    while (retry < 60 && !cancellationToken.IsCancellationRequested)
                    {
                        int tmplLen = templates[i].Length;
                        int ret = zkfp2.AcquireFingerprint(_enrollmentDeviceHandle, imageBuffer, templates[i], ref tmplLen);

                        if (ret == zkfp.ZKFP_ERR_OK && tmplLen > 0)
                        {
                            UpdateStatus($"✅ Captured {i + 1}/3 (template {tmplLen} bytes)");
                            
                            // Create a copy of the image for the event
                            var imgFull = new byte[imageBuffer.Length];
                            Array.Copy(imageBuffer, imgFull, imageBuffer.Length);
                            OnImageCaptured?.Invoke(imgFull);
                            
                            captured = true;
                            break;
                        }

                        await Task.Delay(200, cancellationToken);
                        retry++;
                        if (retry % 10 == 0) 
                        {
                            UpdateStatus($"⏳ Waiting for finger #{i + 1} ({retry * 200 / 1000}s)");
                        }
                    }

                    if (cancellationToken.IsCancellationRequested)
                    {
                        UpdateStatus("❌ Enrollment cancelled.");
                        return null;
                    }

                    if (!captured)
                    {
                        UpdateStatus($"⚠️ Failed to capture finger #{i + 1}. Aborting enrollment.");
                        return null;
                    }

                    await Task.Delay(800, cancellationToken);
                }

                if (cancellationToken.IsCancellationRequested)
                {
                    UpdateStatus("❌ Enrollment cancelled.");
                    return null;
                }

                // Merge the three templates
                byte[] merged = new byte[4096];
                int mergedLen = merged.Length;
                int mergeResult = zkfp2.DBMerge(_enrollmentDbHandle, templates[0], templates[1], templates[2], merged, ref mergedLen);
                
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
            catch (OperationCanceledException)
            {
                UpdateStatus("❌ Enrollment cancelled.");
                return null;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 Enrollment error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Close the enrollment scanner and free resources.
        /// This won't affect the attendance scanner.
        /// </summary>
        public void CloseEnrollmentScanner()
        {
            try
            {
                if (!_enrollmentInitialized) return;

                // Free enrollment DB handle
                if (_enrollmentDbHandle != IntPtr.Zero)
                {
                    try { zkfp2.DBFree(_enrollmentDbHandle); } catch { }
                    _enrollmentDbHandle = IntPtr.Zero;
                }

                // Close enrollment device handle
                if (_enrollmentDeviceHandle != IntPtr.Zero)
                {
                    try { zkfp2.CloseDevice(_enrollmentDeviceHandle); } catch { }
                    _enrollmentDeviceHandle = IntPtr.Zero;
                }

                _enrollmentInitialized = false;
                UpdateStatus("🧹 Enrollment scanner closed.");
            }
            catch (Exception ex)
            {
                UpdateStatus($"⚠️ Close enrollment scanner error: {ex.Message}");
            }
        }

        /// <summary>
        /// Ensure the enrollment scanner is initialized.
        /// </summary>
        public bool EnsureInitialized()
        {
            return _enrollmentInitialized || InitializeForEnrollment();
        }
    }
}