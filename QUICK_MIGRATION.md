# Quick Migration: 2 Simple Steps

## Step 1: Export from Local MySQL
```bash
cd backend
node scripts/exportAllDataForRender.js
```
✅ Creates `backend/scripts/render_import_data.json`

## Step 2: Import to Render PostgreSQL
```bash
cd backend
node scripts/importDataToRender.js
```
✅ Imports all data to Render

## That's it! 🎉

Your data is now on Render:
- ✅ All users (with passwords)
- ✅ All employees
- ✅ All positions
- ✅ All departments
- ✅ Last 30 days of attendance
- ✅ All schedules
- ✅ All templates

## Verify
1. Login at: https://secureattend-2-0.vercel.app
2. Check employees, positions, departments
3. Test biometric app connection

## Need Help?
See `DATA_MIGRATION_GUIDE.md` for detailed instructions.
