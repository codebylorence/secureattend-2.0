SecureAttend Biometric App - Release Package
==========================================

Version: 2.0
Build Date: February 20, 2026
Platform: Windows x86

WHAT'S NEW IN THIS RELEASE:
---------------------------
✅ Auto absent marking - Checks last 7 days every 30 seconds
✅ Auto missed clock-out detection - Marks employees who forgot to clock out
✅ Automatic sync to web app - Sends all records from last 7 days
✅ Fixed duplicate attendance records - Deletes Absent records when employee clocks in
✅ Improved schedule synchronization
✅ Real-time attendance monitoring

INSTALLATION:
-------------
1. Extract all files to a folder on your computer
2. Run BiometricEnrollmentApp.exe
3. Connect your ZKTeco fingerprint scanner
4. The app will automatically:
   - Check for absent employees (last 7 days)
   - Mark missed clock-outs
   - Sync all data to the web app every 30 seconds

REQUIREMENTS:
-------------
- Windows 7 or later (32-bit or 64-bit)
- ZKTeco fingerprint scanner (compatible models)
- Internet connection for syncing to web app
- .NET 9.0 Runtime (included in the executable)

FEATURES:
---------
✓ Employee Mode - Quick fingerprint scanning for clock in/out
✓ Admin Mode - Full management access
  - Attendance logs and management
  - Employee schedules
  - Fingerprint enrollment
  - System settings
✓ Automatic absent marking (every 30 seconds, checks last 7 days)
✓ Automatic missed clock-out detection
✓ Real-time sync to web app
✓ Offline mode with local database
✓ Philippine timezone support (Asia/Manila)

CONFIGURATION:
--------------
The app connects to: https://secureattend-2-0.onrender.com/api
This is configured in the app and syncs automatically.

TROUBLESHOOTING:
----------------
- If the scanner is not detected, check USB connection
- If sync fails, check internet connection
- Logs are saved in the app directory
- For admin access, use your web app credentials

SUPPORT:
--------
For issues or questions, contact your system administrator.

© 2026 SecureAttend - Attendance Management System
