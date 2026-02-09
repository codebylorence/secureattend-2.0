# Biometric App - Connect to Deployed Backend

## Overview
The biometric app can now connect to your deployed backend on Render instead of just localhost!

## How to Configure

### Step 1: Build the Biometric App
1. Open the solution in Visual Studio
2. Build the project (Ctrl+Shift+B)
3. Run the application

### Step 2: Access Admin Settings
1. Click the **"Admin Login"** button in the main window
2. Enter admin credentials (if required)
3. Navigate to the **"Settings"** page

### Step 3: Configure API URL
1. Find the **"Server Settings"** section
2. In the **"Server URL"** field, enter your Render backend URL:
   ```
   https://secureattend-2-0.onrender.com
   ```
   ⚠️ **Important**: Do NOT include `/api` at the end!

3. Click **"🔗 Test & Save"** button

### Step 4: Verify Connection
- If successful, you'll see:
  - ✅ "Connected successfully (X employees found)"
  - A popup showing the number of employees in your system
  - The URL will be automatically saved

- If failed, check:
  - ❌ URL is correct (no typos)
  - ❌ Backend is running on Render
  - ❌ Internet connection is working

## URL Examples

### ✅ Correct URLs
```
http://localhost:5000
https://secureattend-2-0.onrender.com
https://your-app.onrender.com
```

### ❌ Incorrect URLs
```
https://secureattend-2-0.onrender.com/api  ← Don't include /api
http://localhost:5000/                     ← Trailing slash is OK but not needed
```

## Features

### Automatic URL Management
- The app automatically saves the URL when connection test succeeds
- URL is stored in the local SQLite database
- All API calls will use the configured URL
- No need to restart the app after changing URL

### Connection Test
The "Test & Save" button:
1. Validates the URL format
2. Attempts to fetch employees from the server
3. Shows the number of employees found
4. Saves the URL if successful
5. Updates all API services to use the new URL

## Troubleshooting

### "Connection failed - No response from server"
**Possible causes:**
- Backend is sleeping on Render (free tier)
- URL is incorrect
- No internet connection

**Solution:**
1. Open your backend URL in a browser first to wake it up
2. Wait 30-60 seconds for Render to start the service
3. Try the connection test again

### "Could not connect to server"
**Possible causes:**
- Typo in the URL
- Backend is down
- Firewall blocking the connection

**Solution:**
1. Double-check the URL spelling
2. Verify backend is running: https://secureattend-2-0.onrender.com/api/employees
3. Check your firewall settings

### Backend URL Not Saved
**Possible causes:**
- Connection test failed
- Database permission issues

**Solution:**
1. Make sure connection test shows "✅ Connected successfully"
2. Check the logs for any database errors
3. Try running the app as administrator

## Technical Details

### Where is the URL Stored?
- Location: `biometric_local.db` (SQLite database)
- Table: `Settings`
- Key: `api_base_url`
- Default: `http://localhost:5000`

### How API Calls Work
1. App starts → Reads URL from database
2. ApiService initializes with configured URL
3. All API calls use this URL
4. When URL changes → ApiService updates immediately

### Supported Endpoints
The biometric app uses these API endpoints:
- `GET /api/employees` - Fetch all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/attendances` - Record attendance
- `POST /api/attendances/sync-from-biometric` - Bulk sync
- `GET /api/schedules/biometric` - Fetch schedules
- `POST /api/overtime/assign` - Assign overtime
- `DELETE /api/overtime/:id` - Remove overtime

## Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Backend URL is accessible (test in browser)
- [ ] Biometric app built and running
- [ ] Admin settings page opened
- [ ] Server URL configured
- [ ] Connection test successful
- [ ] Employees visible in the app
- [ ] Attendance recording works
- [ ] Sync to server works

## Next Steps

After configuring the URL:
1. Test fingerprint enrollment
2. Test clock-in/clock-out
3. Verify attendance syncs to server
4. Check attendance records in web app
5. Test schedule synchronization

## Support

If you encounter issues:
1. Check the logs in the biometric app
2. Verify backend logs on Render
3. Test the API endpoints directly in browser
4. Ensure CORS is configured correctly on backend

## Backend CORS Configuration

Make sure your backend allows requests from the biometric app:

```javascript
// backend/server.js
app.use(cors({
  origin: '*', // Or specify your IP address
  credentials: true
}));
```

The current backend configuration already supports this! ✅
