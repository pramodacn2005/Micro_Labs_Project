# Frontend Environment Setup - Fix 404 Errors

## Problem
Getting 404 errors like:
```
GET http://localhost:3000/admin/analytics 404 (Not Found)
GET http://localhost:3000/admin/doctors 404 (Not Found)
POST http://localhost:3000/admin/add-doctor 404 (Not Found)
```

## Solution

### Step 1: Create `.env` file in `frontend/` directory

Create a file named `.env` in the `frontend/` folder with this content:

```env
# Backend API URL (IMPORTANT: Must point to port 4000)
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api

# Your Firebase Configuration (copy from env.example if needed)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 2: Restart Vite Dev Server

**IMPORTANT:** After creating/updating `.env` file, you MUST restart the Vite dev server:

1. Stop the current dev server (Ctrl+C)
2. Start it again:
   ```bash
   cd frontend
   npm run dev
   ```

Vite only reads environment variables on startup, so changes won't take effect until you restart.

### Step 3: Verify Backend is Running

Make sure your backend is running on port 4000:

```bash
cd backend
npm start
```

You should see: `Backend listening on http://localhost:4000`

### Step 4: Check Browser Console

After restarting, check the browser console. You should see:
```
Appointment Service API Base URL: http://localhost:4000/api
```

If you see `http://localhost:3000`, the environment variable isn't being read correctly.

## Quick Fix Commands

```bash
# Navigate to frontend directory
cd frontend

# Create .env file (Windows PowerShell)
@"
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api
"@ | Out-File -FilePath .env -Encoding utf8

# Or on Linux/Mac
echo "VITE_BACKEND_URL=http://localhost:4000/api" > .env
echo "VITE_API_BASE_URL=http://localhost:4000/api" >> .env

# Then restart dev server
npm run dev
```

## Verify It's Working

1. Open browser console (F12)
2. Look for: `Appointment Service API Base URL: http://localhost:4000/api`
3. Try accessing Admin Dashboard
4. Check Network tab - API calls should go to `localhost:4000`, not `localhost:3000`

## Troubleshooting

### Still seeing localhost:3000?
- Make sure `.env` file is in `frontend/` directory (not root)
- Make sure variable names start with `VITE_`
- Restart Vite dev server after creating `.env`
- Check for typos in variable names

### Backend not responding?
- Verify backend is running: `http://localhost:4000/api/health`
- Check backend logs for errors
- Verify CORS is configured correctly

### Environment variables not loading?
- Vite requires `VITE_` prefix for all env variables
- Restart dev server after any `.env` changes
- Check `vite.config.js` for any overrides







