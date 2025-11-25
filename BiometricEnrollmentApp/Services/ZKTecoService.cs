using System;
using System.Threading;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using libzkfpcsharp;

namespace BiometricEnrollmentApp.Services
{
    public class ZKTecoService
    {
        private IntPtr _deviceHandle = IntPtr.Zero;
        private IntPtr _dbHandle = IntPtr.Zero;
        private bool _initialized;

        public int SensorWidth { get; private set; } = 0;
        public int SensorHeight { get; private set; } = 0;
        public int ExpectedImageSize => SensorWidth * SensorHeight;

        public event Action<string>? OnStatus;
        public event Action<byte[]>? OnImageCaptured;

        private void UpdateStatus(string msg)
        {
            LogHelper.Write(msg);
            OnStatus?.Invoke(msg);
        }

        /// <summary>
        /// Initialize device and SDK DB handle.
        /// Idempotent: repeated calls will not re-create the in-memory DB or close/open device.
        /// </summary>
        public bool Initialize()
        {
            try
            {
                if (_initialized)
                {
                    UpdateStatus("⚠️ Device already initialized (idempotent).");
                    return true;
                }

                UpdateStatus("🔌 Initializing ZKTeco device...");
                int ret = zkfp2.Init();
                if (ret != zkfp.ZKFP_ERR_OK)
                {
                    UpdateStatus($"❌ zkfp2.Init failed with code {ret}");
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

                // Open device if not opened already
                if (_deviceHandle == IntPtr.Zero)
                {
                    _deviceHandle = zkfp2.OpenDevice(0);
                    if (_deviceHandle == IntPtr.Zero)
                    {
                        UpdateStatus("❌ Failed to open device.");
                        zkfp2.Terminate();
                        return false;
                    }
                }

                // Initialize SDK DB only if not already created
                if (_dbHandle == IntPtr.Zero)
                {
                    _dbHandle = zkfp2.DBInit();
                    if (_dbHandle == IntPtr.Zero)
                    {
                        UpdateStatus("❌ Failed to initialize SDK fingerprint DB (DBInit returned null).");
                        // Close device we opened and terminate
                        try { if (_deviceHandle != IntPtr.Zero) zkfp2.CloseDevice(_deviceHandle); } catch { }
                        zkfp2.Terminate();
                        _deviceHandle = IntPtr.Zero;
                        return false;
                    }
                    UpdateStatus("🗄️ SDK fingerprint DB initialized (new in-memory DB).");
                }
                else
                {
                    UpdateStatus("🗄️ Reusing existing SDK fingerprint DB handle (no re-init).");
                }

                // Read sensor size (safe to run every init)
                try
                {
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
                }
                catch { /* non-fatal */ }

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

        /// <summary>
        /// Alias to ensure initialization.
        /// </summary>
        public bool EnsureInitialized() => Initialize();

        /// <summary>
        /// Add a single template blob to the SDK in-memory DB using fid (row id).
        /// Does NOT re-init or clear the DB. Returns true on success.
        /// </summary>
        public bool AddTemplateToSdk(int fid, byte[] templateBlob)
        {
            try
            {
                if (!_initialized || _dbHandle == IntPtr.Zero)
                {
                    UpdateStatus("⚠️ SDK DB not initialized. Call Initialize() first.");
                    return false;
                }

                if (templateBlob == null || templateBlob.Length == 0)
                {
                    UpdateStatus("⚠️ Empty template provided to AddTemplateToSdk.");
                    return false;
                }

                // Try to find DBAdd method on zkfp2 type by reflection
                var zkType = typeof(zkfp2);
                var methods = zkType.GetMethods(BindingFlags.Public | BindingFlags.Static)
                                     .Where(m => string.Equals(m.Name, "DBAdd", StringComparison.OrdinalIgnoreCase))
                                     .ToArray();

                if (methods.Length == 0)
                {
                    UpdateStatus("⚠️ DBAdd method not found on zkfp2 wrapper.");
                    return false;
                }

                int lastRet = int.MinValue;
                Exception? lastEx = null;

                // Try common candidate parameter sets in order (most likely first)
                var candidateArgsList = new List<object[]>
        {
            new object[] { _dbHandle, fid, templateBlob, templateBlob.Length }, // 4-arg
            new object[] { _dbHandle, fid, templateBlob },                      // 3-arg (db, fid, blob)
            new object[] { _dbHandle, templateBlob, templateBlob.Length },     // 3-arg (db, blob, len)
            new object[] { fid, templateBlob },                                // 2-arg (fid, blob)
            new object[] { templateBlob }                                      // 1-arg (blob)
        };

                foreach (var args in candidateArgsList)
                {
                    // find method with matching parameter count
                    var method = methods.FirstOrDefault(m => m.GetParameters().Length == args.Length);
                    if (method == null) continue;

                    try
                    {
                        var res = method.Invoke(null, args); // static method
                        if (res is int ret)
                        {
                            lastRet = ret;
                            LogHelper.Write($"DBAdd invoked via reflection with {args.Length} args -> ret={ret}");
                        }
                        else if (res != null)
                        {
                            // some wrappers return bool or other types
                            LogHelper.Write($"DBAdd invoked via reflection returned type {res.GetType().Name}: {res}");
                            if (res is bool b && b) return true;
                        }

                        // Evaluate ret codes - the SDK constant is zkfp.ZKFP_ERR_OK
                        if (lastRet == zkfp.ZKFP_ERR_OK)
                        {
                            UpdateStatus($"📥 Template added to SDK (fid={fid}).");
                            return true;
                        }
                        else
                        {
                            // Not OK — continue trying other overloads or finish with a logged message
                            lastEx = null;
                        }
                    }
                    catch (TargetInvocationException tie)
                    {
                        lastEx = tie.InnerException ?? tie;
                        LogHelper.Write($"DBAdd invoke inner error (args {args.Length}): {lastEx.Message}");
                    }
                    catch (Exception ex)
                    {
                        lastEx = ex;
                        LogHelper.Write($"DBAdd invoke error (args {args.Length}): {ex.Message}");
                    }
                }

                // If we get here no candidate returned OK
                UpdateStatus($"⚠️ DBAdd failed (last ret={lastRet}). See logs for details.");
                if (lastEx != null) LogHelper.Write($"DBAdd last exception: {lastEx}");
                return false;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 AddTemplateToSdk error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Load all enrollments from disk into the SDK DB handle.
        /// Does NOT call DBInit; only calls AddTemplateToSdk for each row.
        /// </summary>
        public void LoadEnrollmentsToSdk(DataService ds)
        {
            try
            {
                if (!_initialized)
                {
                    UpdateStatus("⚠️ Device not initialized — cannot load enrollments to SDK.");
                    return;
                }

                if (ds == null)
                {
                    UpdateStatus("⚠️ DataService not provided to LoadEnrollmentsToSdk.");
                    return;
                }

                var enrolls = ds.GetAllEnrollmentsWithRowId();
                LogHelper.Write($"📥 Loading {enrolls.Count} enrollments into SDK...");
                
                int loaded = 0;
                int failed = 0;
                foreach (var e in enrolls)
                {
                    if (e.RowId <= 0 || string.IsNullOrEmpty(e.Template))
                    {
                        LogHelper.Write($"⚠️ Skipping enrollment {e.EmployeeId}: invalid RowId or Template");
                        continue;
                    }
                    
                    byte[] blob;
                    try 
                    { 
                        blob = Convert.FromBase64String(e.Template);
                        LogHelper.Write($"📄 Loading template for {e.EmployeeId} (RowId={e.RowId}, size={blob.Length} bytes)");
                    } 
                    catch (Exception ex)
                    {
                        LogHelper.Write($"❌ Failed to decode template for {e.EmployeeId}: {ex.Message}");
                        failed++;
                        continue;
                    }

                    // Try add; if fails because it already exists, we ignore that error.
                    var ok = AddTemplateToSdk((int)e.RowId, blob);
                    if (ok)
                    {
                        loaded++;
                        LogHelper.Write($"✅ Successfully loaded template for {e.EmployeeId} (RowId={e.RowId})");
                    }
                    else
                    {
                        failed++;
                        LogHelper.Write($"❌ Failed to load template for {e.EmployeeId} (RowId={e.RowId})");
                    }
                }

                UpdateStatus($"📥 Loaded {loaded}/{enrolls.Count} enrollment(s) into SDK DB ({failed} failed).");
                LogHelper.Write($"📊 Template loading complete: {loaded} success, {failed} failed out of {enrolls.Count} total");
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 LoadEnrollmentsToSdk failed: {ex.Message}");
                LogHelper.Write($"💥 LoadEnrollmentsToSdk exception: {ex}");
            }
        }

        // ---------------------------
        // Enrollment / capture helper methods (kept similar to your earlier code)
        // ---------------------------

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
                Thread.Sleep(300);

                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);

                int imageBufferSize = width * height;
                byte[] imageBuffer = new byte[imageBufferSize];
                byte[][] templates = { new byte[4096], new byte[4096], new byte[4096] };

                // ensure _dbHandle exists (initialized previously in Initialize())
                if (_dbHandle == IntPtr.Zero)
                {
                    UpdateStatus("⚠️ SDK DB handle missing. Ensure Initialize() was called earlier.");
                    return null;
                }

                for (int i = 0; i < 3; i++)
                {
                    UpdateStatus($"👉 Please place finger #{i + 1}");
                    bool captured = false;
                    int retry = 0;

                    while (retry < 60)
                    {
                        int tmplLen = templates[i].Length;
                        int ret = zkfp2.AcquireFingerprint(_deviceHandle, imageBuffer, templates[i], ref tmplLen);

                        if (ret == zkfp.ZKFP_ERR_OK && tmplLen > 0)
                        {
                            UpdateStatus($"✅ Captured {i + 1}/3 (template {tmplLen} bytes)");
                            var imgFull = new byte[imageBuffer.Length];
                            Array.Copy(imageBuffer, imgFull, imageBuffer.Length);
                            OnImageCaptured?.Invoke(imgFull);
                            captured = true;
                            break;
                        }

                        Thread.Sleep(200);
                        retry++;
                        if (retry % 10 == 0) UpdateStatus($"⏳ Waiting for finger #{i + 1} ({retry * 200 / 1000}s)");
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
                UpdateStatus($"💥 Enrollment error: {ex.Message}");
                return null;
            }
        }

        public string? CaptureSingleTemplate(int timeoutSeconds = 10, CancellationToken cancellationToken = default)
        {
            if (!_initialized)
            {
                UpdateStatus("❌ Device not initialized. Please connect first.");
                return null;
            }

            try
            {
                UpdateStatus("✋ (Attendance) Place finger on scanner...");
                int size = 4;
                byte[] pv = new byte[4];
                zkfp2.GetParameters(_deviceHandle, 1, pv, ref size);
                int width = BitConverter.ToInt32(pv, 0);
                size = 4;
                zkfp2.GetParameters(_deviceHandle, 2, pv, ref size);
                int height = BitConverter.ToInt32(pv, 0);

                int imageBufferSize = width * height;
                byte[] imageBuffer = new byte[imageBufferSize];
                byte[] templateBuf = new byte[4096];

                int retry = 0;
                int maxRetry = Math.Max(1, timeoutSeconds * 5);

                while (retry < maxRetry)
                {
                    // Check if cancellation requested
                    if (cancellationToken.IsCancellationRequested)
                    {
                        UpdateStatus("⚠️ Fingerprint capture cancelled.");
                        LogHelper.Write("Fingerprint capture cancelled by user");
                        return null;
                    }

                    int tmplLen = templateBuf.Length;
                    int ret = zkfp2.AcquireFingerprint(_deviceHandle, imageBuffer, templateBuf, ref tmplLen);

                    if (ret == zkfp.ZKFP_ERR_OK && tmplLen > 0)
                    {
                        UpdateStatus($"✅ (Attendance) Captured template ({tmplLen} bytes).");
                        var outTpl = new byte[tmplLen];
                        Array.Copy(templateBuf, outTpl, tmplLen);
                        return Convert.ToBase64String(outTpl);
                    }

                    Thread.Sleep(200);
                    retry++;
                    if (retry % 10 == 0) UpdateStatus($"⏳ Waiting for finger... {retry * 200 / 1000}s");
                }

                UpdateStatus("⚠️ (Attendance) Capture timed out.");
                return null;
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 (Attendance) Capture error: {ex.Message}");
                return null;
            }
        }

        // returns (fid, score). fid <= 0 => no match. score may be -1 if not provided.
        public (long Fid, double Score) IdentifyTemplate(byte[] templateBlob)
        {
            try
            {
                if (!_initialized || _dbHandle == IntPtr.Zero)
                {
                    UpdateStatus("⚠️ SDK DB not initialized. Call Initialize() first.");
                    return (-1, -1);
                }

                if (templateBlob == null || templateBlob.Length == 0)
                {
                    UpdateStatus("⚠️ Empty template provided to IdentifyTemplate.");
                    return (-1, -1);
                }

                var zkType = typeof(zkfp2);
                var methods = zkType.GetMethods(BindingFlags.Public | BindingFlags.Static)
                                     .Where(m => m.Name.IndexOf("identify", StringComparison.OrdinalIgnoreCase) >= 0
                                              || m.Name.IndexOf("match", StringComparison.OrdinalIgnoreCase) >= 0)
                                     .ToArray();

                if (methods.Length == 0)
                {
                    UpdateStatus("⚠️ Identify/Match method not found on zkfp2 wrapper.");
                    return (-1, -1);
                }

                Exception? lastEx = null;
                int lastRet = int.MinValue;

                // candidate argument sets to try (common SDK signatures)
                var candidates = new List<object[]>
        {
            // DBIdentify(dbHandle, template, tmplLen, ref fid, ref score) -> int
            new object[] { _dbHandle, templateBlob, templateBlob.Length, 0, 0.0 },
            // DBIdentify(dbHandle, template, tmplLen, out fid) -> int
            new object[] { _dbHandle, templateBlob, templateBlob.Length, 0 },
            // DBIdentify(template, tmplLen, ref fid) -> int (no dbHandle)
            new object[] { templateBlob, templateBlob.Length, 0 },
            // DBMatch(dbHandle, fid, template, tmplLen, ref score) -> int
            new object[] { _dbHandle, 0, templateBlob, templateBlob.Length, 0.0 },
            // DBMatch(template, templateLen) -> fid or int (various wrappers)
            new object[] { templateBlob, templateBlob.Length },
            // fallback: DBIdentify(template) -> fid?
            new object[] { templateBlob }
        };

                foreach (var args in candidates)
                {
                    var method = methods.FirstOrDefault(m => m.GetParameters().Length == args.Length);
                    if (method == null) continue;

                    try
                    {
                        // Prepare arguments array (need to possibly use refs/out). We'll use Invoke and inspect return value.
                        var invokeArgs = new object[args.Length];
                        for (int i = 0; i < args.Length; i++) invokeArgs[i] = args[i];

                        var res = method.Invoke(null, invokeArgs);

                        // Some wrappers return an int error code and set out/ref args in invokeArgs
                        if (res is int ret)
                        {
                            lastRet = ret;
                            // try extract fid & score from out/ref invokeArgs if present
                            long fid = -1;
                            double score = -1;
                            for (int i = 0; i < invokeArgs.Length; i++)
                            {
                                if (invokeArgs[i] is int iv) { /* maybe fid */ }
                                if (invokeArgs[i] is long lv) { fid = lv; }
                                if (invokeArgs[i] is double dv) { score = dv; }
                                if (invokeArgs[i] is short sv) { fid = sv; }
                            }

                            // Some wrappers put fid in the return value if positive
                            if (fid <= 0 && ret > 0 && ret != zkfp.ZKFP_ERR_OK) { /* ret is error */ }

                            if (fid <= 0)
                            {
                                // try to find any integer/out param that looks like fid
                                foreach (var a in invokeArgs)
                                {
                                    if (a is int ai && ai > 0) { fid = ai; break; }
                                    if (a is long al && al > 0) { fid = al; break; }
                                }
                            }

                            if (fid > 0)
                            {
                                UpdateStatus($"🔍 SDK identify ok: fid={fid}, ret={ret}, score={(score < 0 ? "n/a" : score.ToString())}");
                                return (fid, score);
                            }
                            // else continue trying
                        }
                        else if (res is long lres && lres > 0)
                        {
                            UpdateStatus($"🔍 SDK identify returned fid={lres}");
                            return (lres, -1);
                        }
                        else if (res is bool bres && bres)
                        {
                            // Unclear, but assume success and try to extract fid from out args
                            long fid = -1; double score = -1;
                            foreach (var a in invokeArgs)
                            {
                                if (a is int ai && ai > 0) { fid = ai; break; }
                                if (a is long al && al > 0) { fid = al; break; }
                            }
                            if (fid > 0) return (fid, score);
                        }
                        else if (res != null)
                        {
                            // other return types -- try to parse numeric
                            if (long.TryParse(res.ToString(), out var parsed) && parsed > 0)
                            {
                                UpdateStatus($"🔍 SDK identify returned fid parse={parsed}");
                                return (parsed, -1);
                            }
                        }
                    }
                    catch (TargetInvocationException tie)
                    {
                        lastEx = tie.InnerException ?? tie;
                        LogHelper.Write($"Identify invoke inner error (args {args.Length}): {lastEx.Message}");
                    }
                    catch (Exception ex)
                    {
                        lastEx = ex;
                        LogHelper.Write($"Identify invoke error (args {args.Length}): {ex.Message}");
                    }
                }

                // nothing matched
                UpdateStatus($"⚠️ SDK identify failed (lastRet={lastRet}). See logs.");
                if (lastEx != null) LogHelper.Write($"Identify last exception: {lastEx}");
                return (-1, -1);
            }
            catch (Exception ex)
            {
                UpdateStatus($"💥 IdentifyTemplate error: {ex.Message}");
                return (-1, -1);
            }
        }

        public void Close()
        {
            try
            {
                if (!_initialized) return;

                // Free SDK DB only when fully closing device, not every reconnect
                if (_dbHandle != IntPtr.Zero)
                {
                    try { zkfp2.DBFree(_dbHandle); } catch { /* ignore */ }
                    _dbHandle = IntPtr.Zero;
                }

                if (_deviceHandle != IntPtr.Zero)
                {
                    try { zkfp2.CloseDevice(_deviceHandle); } catch { /* ignore */ }
                    _deviceHandle = IntPtr.Zero;
                }

                try { zkfp2.Terminate(); } catch { /* ignore */ }
                _initialized = false;
                UpdateStatus("🧹 ZKTeco device closed.");
            }
            catch (Exception ex)
            {
                UpdateStatus($"⚠️ Close error: {ex.Message}");
            }
        }
    }
}
