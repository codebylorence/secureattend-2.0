# Testing Production Build Locally

## The Issue
You're running the development server (`npm run dev`) which uses `localhost:5000`. 
To test with the Render backend, you need to build and preview the production version.

## Solution: Test Production Build

### Step 1: Build for Production
```bash
cd frontend
npm run build
```

### Step 2: Preview Production Build
```bash
npm run preview
```

This will:
- Use `.env.production` file
- Connect to Render backend: `https://secureattend-2-0-1.onrender.com`
- Test WebSocket connection to production

### Step 3: Test in Browser
Open the URL shown (usually `http://localhost:4173`)

---

## OR: Deploy to Vercel (Recommended)

Instead of testing locally, deploy to Vercel:

### Step 1: Commit Changes
```bash
git add .
git commit -m "Fix database configuration for production"
git push
```

### Step 2: Vercel Auto-Deploy
- Vercel will automatically detect the push
- It will rebuild and redeploy
- Check your Vercel dashboard for deployment status

### Step 3: Set Environment Variable in Vercel
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add: `VITE_API_URL` = `https://secureattend-2-0-1.onrender.com/api`
5. Redeploy

---

## Current Problem

Your screenshot shows you're running **development mode** (`npm run dev`), which:
- Uses `localhost:5000` by default
- Doesn't use `.env.production`
- Won't connect to Render backend

You need to either:
1. Build and preview production locally (see above)
2. Deploy to Vercel (recommended)

---

## Quick Fix: Use Render Backend in Development

If you want to test with Render backend while developing:

### Option 1: Update `.env` file
Change `frontend/.env` to:
```env
VITE_API_URL=https://secureattend-2-0-1.onrender.com/api
```

Then restart dev server:
```bash
npm run dev
```

### Option 2: Create `.env.local` file
Create `frontend/.env.local`:
```env
VITE_API_URL=https://secureattend-2-0-1.onrender.com/api
```

This overrides `.env` and won't be committed to git.

---

## Verify It's Working

After deploying or running production build:

1. **Check Console**: Should see `🔌 Connected to WebSocket server`
2. **Check Network Tab**: API calls should go to `secureattend-2-0-1.onrender.com`
3. **Try Login**: Should connect to Render backend
4. **No Errors**: No `localhost:5000` connection errors
