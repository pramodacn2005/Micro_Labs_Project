# Quick Fix Guide

## Current Issues:
1. ❌ Frontend using port 3000 instead of 4000
2. ❌ Firebase Storage bucket name incorrect
3. ❌ Service account missing permissions

## Step-by-Step Fix:

### Step 1: Create Frontend `.env` File

```bash
cd frontend
```

Create a file named `.env` with this content:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=ai-healthcare-robot.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://ai-healthcare-robot-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=ai-healthcare-robot
VITE_FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend URL - MUST BE PORT 4000
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api
```

**Important:** Replace `your_api_key_here`, `your_sender_id`, and `your_app_id` with your actual Firebase values from Firebase Console.

### Step 2: Get Firebase Config Values

1. Go to: https://console.firebase.google.com/project/ai-healthcare-robot/settings/general
2. Scroll to "Your apps" section
3. Click the gear icon ⚙️ next to your web app
4. Click "Config"
5. Copy the values to your `.env` file

### Step 3: Fix Service Account Permissions

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=ai-healthcare-robot
2. Find: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`
3. Click **Edit** (pencil icon)
4. Click **ADD ANOTHER ROLE**
5. Add: **Service Usage Consumer**
6. Click **SAVE**
7. Wait 2-5 minutes

### Step 4: Restart Everything

```bash
# Stop frontend (Ctrl+C)
cd frontend
# Clear Vite cache
rm -rf node_modules/.vite
# Restart
npm run dev

# In another terminal, stop backend (Ctrl+C)
cd backend
# Restart
npm start
```

### Step 5: Fix Firebase Storage CORS (If Direct Uploads Fail)

If you see CORS errors when uploading files:

```bash
# 1. Install Google Cloud SDK (if not installed)
# Download: https://cloud.google.com/sdk/docs/install

# 2. Initialize and login
gcloud init
gcloud auth login

# 3. Apply CORS (development - allows all origins)
gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com

# 4. Verify
gsutil cors get gs://ai-healthcare-robot.appspot.com
```

📖 **For detailed CORS setup, see:** `FIREBASE_STORAGE_CORS_SETUP.md` or `SETUP_CORS.md`

**Note:** The backend API already handles uploads without CORS issues. CORS setup is only needed for direct frontend-to-Firebase Storage uploads.

### Step 6: Verify

1. Open browser console
2. Check for errors - should NOT see `localhost:3000`
3. Check Firebase config - bucket should be `ai-healthcare-robot.appspot.com`
4. Try uploading a file - should work now

## Still Not Working?

1. **Check backend is running:**
   ```bash
   curl http://localhost:4000/api/health
   ```

2. **Check frontend .env file exists:**
   ```bash
   cd frontend
   cat .env
   ```

3. **Enable Firebase Storage (if not enabled):**
   - Go to: https://console.firebase.google.com/project/ai-healthcare-robot/storage
   - If you see "Get started", click it to enable Storage
   - Choose a location and storage rules
   - Wait 1-2 minutes for bucket creation
   - 📖 **See detailed guide:** `ENABLE_FIREBASE_STORAGE.md`

4. **Check service account permissions:**
   - Go to: https://console.cloud.google.com/iam-admin/iam?project=ai-healthcare-robot
   - Verify "Service Usage Consumer" role is added


