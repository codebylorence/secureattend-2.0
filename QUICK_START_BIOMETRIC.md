# Quick Start: Connect Biometric App to Render

## 🚀 3 Simple Steps

### Step 1: Open Admin Settings
```
1. Run the biometric app
2. Click "Admin Login" button
3. Go to "Settings" page
```

### Step 2: Enter Your Backend URL
```
Server URL field: https://secureattend-2-0.onrender.com
                  ↑
                  Paste your Render URL here (without /api)
```

### Step 3: Test & Save
```
Click "🔗 Test & Save" button
Wait for: ✅ Connected successfully (X employees found)
Done! 🎉
```

## 📋 Your Backend URLs

| Environment | URL |
|------------|-----|
| **Production (Render)** | `https://secureattend-2-0.onrender.com` |
| **Local Development** | `http://localhost:5000` |

## ✅ Success Indicators

When connected successfully, you'll see:
- ✅ Green checkmark in connection status
- 📊 Number of employees found (e.g., "10 employees found")
- 💾 URL automatically saved
- 🔄 All API calls now use the new URL

## ❌ Common Issues

### Issue: "Connection failed"
**Fix:** 
1. Open https://secureattend-2-0.onrender.com in browser
2. Wait 30 seconds (Render wakes up from sleep)
3. Try again

### Issue: "No employees found"
**Fix:**
1. Check if you have employees in the web app
2. Verify backend is running
3. Check backend logs on Render

### Issue: URL not saving
**Fix:**
1. Make sure connection test shows ✅ success
2. Don't close the app immediately after testing
3. Try running as administrator

## 🔧 Testing the Connection

### Method 1: In the App
```
Settings → Server Settings → Test & Save
```

### Method 2: In Browser
```
Open: https://secureattend-2-0.onrender.com/api/employees
Should show: JSON list of employees
```

### Method 3: Check Logs
```
Look for: "🌐 ApiService initialized with base URL: https://..."
```

## 📱 What Happens After Connection?

Once connected, the biometric app will:
1. ✅ Fetch employee data from Render
2. ✅ Fetch schedules from Render
3. ✅ Send attendance records to Render
4. ✅ Sync overtime assignments
5. ✅ Update in real-time

## 🎯 Next Steps

After successful connection:
1. [ ] Test fingerprint enrollment
2. [ ] Test clock-in (should sync to web app)
3. [ ] Test clock-out (should sync to web app)
4. [ ] Check attendance in web app
5. [ ] Verify schedules are syncing

## 💡 Pro Tips

1. **Keep Backend Awake**: Visit the web app regularly to prevent Render from sleeping
2. **Check Sync Status**: Look for "✅ Bulk sync successful" in logs
3. **Test Locally First**: Use localhost to test before switching to Render
4. **Backup Database**: Use "Backup" button in settings before major changes

## 🆘 Need Help?

1. Check `BIOMETRIC_APP_DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `DEPLOYMENT_FIX.md` for web app issues
3. Look at logs in the biometric app
4. Check Render logs for backend issues

## 🔐 Security Notes

- The biometric app connects directly to your backend
- No authentication required for biometric endpoints (by design)
- All data is sent over HTTPS (in production)
- Local database stores attendance records as backup

## 📊 Monitoring

### Check if it's working:
1. **Biometric App**: Look for sync messages in logs
2. **Web App**: Check attendance records appear
3. **Render**: Check backend logs for incoming requests

### Sync Frequency:
- Attendance: Every 5 seconds (automatic)
- Schedules: On WiFi connection (automatic)
- Employees: On demand (manual refresh)

---

**Ready to go!** 🚀 Your biometric app is now connected to your deployed backend!
