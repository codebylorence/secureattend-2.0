# Deployment Fix - Hardcoded URLs Issue

## Problem
The admin positions page and several other pages on Vercel were showing "Error loading positions" and "No token provided" errors because they were using hardcoded `http://localhost:5000` URLs instead of the axios instance configured with the Render backend URL.

## Root Cause
Multiple frontend files were using `fetch()` with hardcoded localhost URLs instead of the axios instance from `axiosConfig.js`. This caused two issues:
1. **Wrong URL**: Requests went to localhost instead of the Render backend
2. **Missing Auth**: The axios interceptor that adds the Authorization header wasn't being used

## Files Fixed
1. `frontend/src/pages/PositionManagementNew.jsx` - Admin positions page
2. `frontend/src/pages/EmployeeRegistration.jsx` - Public registration page
3. `frontend/src/api/NotificationApi.js` - Notifications API
4. `frontend/src/components/AddEmployeeModal.jsx` - Add employee modal
5. `frontend/src/pages/CheckRegistrationStatus.jsx` - Check registration status
6. `frontend/src/pages/RegistrationStatus.jsx` - View registration status
7. `frontend/src/components/RegistrationRequests.jsx` - Admin registration requests

## Changes Made
- Replaced all `fetch('http://localhost:5000/api/...')` calls with `api.get/post/put/delete('/...')`
- Imported axios instance: `import api from '../api/axiosConfig'`
- Removed manual Authorization header handling (axios interceptor handles it)
- Simplified error handling using axios response structure

## Deployment Steps

### 1. Push Changes to GitHub
```bash
git push origin main
```

### 2. Vercel Auto-Deploy
Vercel will automatically detect the changes and redeploy. Wait 2-3 minutes for the build to complete.

### 3. Verify Environment Variables
Make sure these are set in Vercel dashboard:
- `VITE_API_URL` = `https://secureattend-2-0.onrender.com/api`

### 4. Test the Fix
1. Go to https://secureattend-2-0.vercel.app
2. Login as admin (username: `admin`, password: `123456`)
3. Navigate to Positions page
4. Should now see all 29 positions loaded correctly
5. Test adding/editing/deleting positions

## How It Works Now

### Before (Broken)
```javascript
const response = await fetch('http://localhost:5000/api/positions/all', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### After (Fixed)
```javascript
import api from '../api/axiosConfig';

const response = await api.get('/positions/all');
// axios interceptor automatically adds Authorization header
// axios uses correct backend URL from env variable or fallback
```

## Backend URL Resolution
The axios instance uses this logic:
1. Try `import.meta.env.VITE_API_URL` (from Vercel env variable)
2. Fallback to `https://secureattend-2-0.onrender.com/api` (hardcoded)

## Authentication Flow
1. User logs in → token stored in localStorage
2. Axios request interceptor reads token from localStorage
3. Adds `Authorization: Bearer <token>` header to every request
4. Backend validates token and returns data

## Testing Checklist
- [x] Admin can login on Vercel
- [ ] Admin positions page loads all positions
- [ ] Admin can add new position
- [ ] Admin can edit position
- [ ] Admin can delete position (if no employees)
- [ ] Registration page loads positions
- [ ] Registration page loads departments
- [ ] Registration submission works
- [ ] Registration status check works
- [ ] Admin can approve/reject registrations
- [ ] Notifications work correctly

## Notes
- The backend is already working correctly on Render
- The issue was purely frontend URL configuration
- All API endpoints require authentication except:
  - `/api/positions` (public - for registration)
  - `/api/departments` (public - for registration)
  - `/api/registration/register` (public)
  - `/api/registration/status/:id` (public)
