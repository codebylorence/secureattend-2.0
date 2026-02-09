# Biometric App API Configuration

## Summary

All hardcoded localhost URLs have been replaced with dynamic API URL configuration using `SettingsService`. The app now supports both localhost and deployed environments seamlessly.

---

## How It Works

### Default Behavior (Localhost)
- When first installed, the app defaults to `http://localhost:5000`
- This is stored in `SettingsService.cs` as the default value
- No configuration needed for local development

### Deployed Environment (Render)
- Open the biometric app
- Click "Admin" button (top right)
- Go to "Admin Settings"
- Set API URL to: `https://secureattend-2-0.onrender.com`
- Click "Test Connection" to verify
- Click "Save Settings"
- The URL is saved in SQLite database and persists across app restarts

---

## Files Modified

### ✅ Fixed Files (Now Use SettingsService)

1. **EnrollmentPage.xaml.cs**
   - Line ~548: `LoadEmployeeSuggestionsAsync()` - loads employee dropdown
   - Line ~738: Employee details fetch during enrollment
   - Line ~975: `SafeSyncCheckAsync()` - sync check
   - Line ~1000: `SyncDeletionsFromServerAsync()` - auto-sync deleted employees

2. **AttendancePage.xaml.cs**
   - Line ~2062: `SyncDeletedEmployeesAsync()` - syncs deleted employees

3. **CleanupOrphanedFingerprints.cs**
   - Line ~34: Standalone cleanup utility
   - Now reads API URL from settings

### ✅ Configuration File (Provides Default)

4. **SettingsService.cs**
   - Lines 56, 223, 231: Default value `http://localhost:5000`
   - This is intentional - provides fallback for local development
   - User can override in Admin Settings

---

## API Endpoints Used

All endpoints now use the configured base URL:

| Endpoint | Purpose | Used In |
|----------|---------|---------|
| `{baseUrl}/employees` | Get all active employees | EnrollmentPage, AttendancePage, CleanupUtility |
| `{baseUrl}/employees/{id}` | Get employee details | EnrollmentPage (during enrollment) |
| `{baseUrl}/employees/biometric` | Get employees for enrollment dropdown | EnrollmentPage |

---

## Testing

### Test Localhost (Default)
1. Start local backend: `cd backend && node server.js`
2. Open biometric app
3. Should connect to `http://localhost:5000` automatically

### Test Deployed (Render)
1. Open biometric app
2. Go to Admin Settings
3. Set API URL: `https://secureattend-2-0.onrender.com`
4. Test Connection
5. Save Settings
6. Try enrolling a fingerprint - should connect to Render

### Verify Configuration
Check the logs in `BiometricApp.log` to see which URL is being used:
```
🌐 ApiService initialized with base URL: https://secureattend-2-0.onrender.com
🔍 Attempting to load employees from: https://secureattend-2-0.onrender.com/employees/biometric
```

---

## Troubleshooting

### "Could not connect to server" Error

**Cause**: API URL not configured or incorrect

**Solution**:
1. Open Admin Settings
2. Verify API URL is correct:
   - Local: `http://localhost:5000`
   - Deployed: `https://secureattend-2-0.onrender.com`
3. Click "Test Connection"
4. If test fails, check:
   - Backend is running (for localhost)
   - Render service is active (for deployed)
   - No typos in URL
   - URL has no trailing slash

### No Employees in Enrollment Dropdown

**Cause**: API URL not configured or no employees in database

**Solution**:
1. Configure API URL in Admin Settings
2. Restart the app
3. Check backend has employees:
   - Run: `node backend/scripts/verifyRenderData.js`
   - Should show 12 employees
4. Check logs for connection errors

### App Still Using Localhost After Configuration

**Cause**: App not restarted after changing settings

**Solution**:
1. Close the biometric app completely
2. Restart the app
3. Settings are loaded on startup

---

## Development Notes

### Adding New API Calls

When adding new API calls to the biometric app, always use SettingsService:

```csharp
// ✅ CORRECT - Uses configured URL
var settingsService = new SettingsService();
string baseUrl = settingsService.GetApiBaseUrl();
string url = $"{baseUrl}/your-endpoint";

// ❌ WRONG - Hardcoded localhost
string url = "http://localhost:5000/your-endpoint";
```

### Default URL Location

The default URL is defined in `SettingsService.cs`:
- Line 56: Database initialization
- Line 223: Fallback when reading from database
- Line 231: Final fallback

**Do not remove these defaults** - they allow the app to work out-of-the-box for local development.

---

## Configuration Persistence

The API URL is stored in SQLite database at:
```
%LOCALAPPDATA%\BiometricEnrollmentApp\BiometricApp.db
```

Table: `Settings`
- Key: `api_base_url`
- Value: User-configured URL or default `http://localhost:5000`

---

## Summary

✅ All API calls now use dynamic configuration
✅ Defaults to localhost for easy local development  
✅ Can be configured for deployed environment
✅ Settings persist across app restarts
✅ No code changes needed to switch environments

**To use with Render**: Just configure the API URL once in Admin Settings!
