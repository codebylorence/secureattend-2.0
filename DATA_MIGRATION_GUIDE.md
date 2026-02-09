# Data Migration Guide: Local MySQL → Render PostgreSQL

## Overview
This guide will help you migrate all your local database data (users, employees, positions, departments, attendances, schedules) to your Render PostgreSQL database.

## Prerequisites

✅ Local MySQL database running with data
✅ Render PostgreSQL database created
✅ `DATABASE_URL` environment variable set in `backend/.env`

## Step-by-Step Migration

### Step 1: Export Data from Local MySQL

Run the export script to extract all data from your local database:

```bash
cd backend
node scripts/exportAllDataForRender.js
```

**What it does:**
- Connects to your local MySQL database
- Exports all tables: Users, Employees, Positions, Departments, Attendances, Schedules, Templates
- Saves to `backend/scripts/render_import_data.json`
- Shows summary of exported data

**Expected Output:**
```
✅ Connected to local MySQL database

📋 Found X users
👥 Found X employees
💼 Found X positions
🏢 Found X departments
📊 Found X attendance records (last 30 days)
📅 Found X employee schedules
📝 Found X schedule templates

✅ Data exported successfully!
📁 File saved to: backend/scripts/render_import_data.json
```

### Step 2: Verify Export File

Check that the export file was created:

```bash
# Windows
dir backend\scripts\render_import_data.json

# Linux/Mac
ls -lh backend/scripts/render_import_data.json
```

You should see a JSON file with your data.

### Step 3: Set Up Render Database Connection

Make sure your `backend/.env` file has the correct `DATABASE_URL`:

```env
DATABASE_URL=postgresql://username:password@host/database
```

You can find this in your Render dashboard:
1. Go to your PostgreSQL database
2. Click "Connect"
3. Copy the "External Database URL"

### Step 4: Import Data to Render

Run the import script:

```bash
cd backend
node scripts/importDataToRender.js
```

**What it does:**
- Connects to Render PostgreSQL database
- Reads the export file
- Imports data in correct order (respecting foreign keys)
- Uses transactions (all or nothing)
- Handles conflicts (updates existing records)

**Expected Output:**
```
✅ Connected to Render PostgreSQL database

📁 Loaded export data:
   Users: X
   Employees: X
   Positions: X
   Departments: X
   Attendances: X
   Schedules: X
   Templates: X

📋 Importing positions...
✅ Imported X positions

🏢 Importing departments...
✅ Imported X departments

👥 Importing employees...
✅ Imported X employees

👤 Importing users...
✅ Imported X users

📝 Importing schedule templates...
✅ Imported X schedule templates

📅 Importing employee schedules...
✅ Imported X employee schedules

📊 Importing attendances...
✅ Imported X attendances

✅ All data imported successfully!
```

### Step 5: Verify Import

Test your deployed app:

1. **Login Test:**
   ```
   Go to: https://secureattend-2-0.vercel.app
   Login with your local credentials
   ```

2. **Check Data:**
   - Employees page should show all employees
   - Positions page should show all positions
   - Departments page should show all departments
   - Attendance records should be visible

3. **API Test:**
   ```
   https://secureattend-2-0.onrender.com/api/employees
   https://secureattend-2-0.onrender.com/api/positions
   ```

## Import Order (Important!)

The script imports in this order to respect foreign key relationships:

1. **Positions** (no dependencies)
2. **Departments** (no dependencies)
3. **Employees** (depends on Positions, Departments)
4. **Users** (depends on Employees)
5. **Schedule Templates** (no dependencies)
6. **Employee Schedules** (depends on Employees, Templates)
7. **Attendances** (depends on Employees)

## What Gets Migrated

### ✅ Users Table
- All user accounts with hashed passwords
- Roles (admin, supervisor, teamleader, employee, warehouseadmin)
- Links to employee records

### ✅ Employees Table
- All employee information
- Photos (base64 encoded)
- Department and position assignments
- Status (Active/Inactive)

### ✅ Positions Table
- All position definitions
- Descriptions

### ✅ Departments Table
- All departments
- Managers
- Descriptions

### ✅ Attendances Table
- Last 30 days of attendance records
- Clock-in/clock-out times
- Status (Present, Late, Absent, Overtime, Missed Clock-out)
- Overtime hours

### ✅ Employee Schedules Table
- All active schedules
- Shift assignments
- Days and times

### ✅ Schedule Templates Table
- All schedule templates
- Assigned employees
- Created by information

## Troubleshooting

### Error: "Export file not found"
**Solution:** Run the export script first:
```bash
node backend/scripts/exportAllDataForRender.js
```

### Error: "Connection refused"
**Solution:** Check your `DATABASE_URL` in `.env`:
```bash
# Make sure it's the External Database URL from Render
DATABASE_URL=postgresql://...
```

### Error: "Relation does not exist"
**Solution:** Make sure the backend has been deployed and tables created:
1. Deploy backend to Render
2. Wait for it to start (check logs)
3. Tables should be created automatically
4. Then run import script

### Error: "Duplicate key value violates unique constraint"
**Solution:** The script uses `ON CONFLICT DO UPDATE`, so this shouldn't happen. If it does:
1. Check if data already exists
2. The script will update existing records
3. Safe to run multiple times

### Error: "Foreign key constraint violation"
**Solution:** The import order is designed to prevent this. If it happens:
1. Check that all referenced records exist
2. Verify the export file is complete
3. Try running the import again

## Safety Features

### 🔒 Transactions
- All imports happen in a single transaction
- If any step fails, everything rolls back
- Your database stays consistent

### 🔄 Conflict Handling
- Uses `ON CONFLICT DO UPDATE`
- Safe to run multiple times
- Updates existing records instead of failing

### 📊 Validation
- Checks for export file before importing
- Verifies database connection
- Shows detailed progress

## Post-Migration Checklist

After successful migration:

- [ ] Test login with all user accounts
- [ ] Verify employee data is correct
- [ ] Check attendance records
- [ ] Test schedule assignments
- [ ] Verify positions and departments
- [ ] Test biometric app connection
- [ ] Check web app functionality

## Backup Recommendation

Before importing, consider backing up your Render database:

```bash
# From Render dashboard
1. Go to your PostgreSQL database
2. Click "Backups"
3. Create a manual backup
```

## Re-running the Migration

If you need to update data:

1. Export from local again:
   ```bash
   node backend/scripts/exportAllDataForRender.js
   ```

2. Import to Render again:
   ```bash
   node backend/scripts/importDataToRender.js
   ```

The script will update existing records, so it's safe to run multiple times.

## Notes

- **Passwords:** Already hashed in local database, imported as-is
- **Photos:** Base64 encoded, imported directly
- **Timestamps:** Preserved from local database
- **IDs:** Preserved to maintain relationships
- **Attendances:** Only last 30 days to keep database size manageable

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify your `DATABASE_URL` is correct
3. Make sure backend is deployed and running
4. Check Render logs for any errors
5. Try running the export script again

---

**Ready to migrate!** 🚀 Follow the steps above to move your data to Render.
