# Troubleshooting Guide

## Issue 1: Port 3000 vs 4000

**Symptoms:**
- Errors showing `http://localhost:3000/api/...` instead of `http://localhost:4000/api/...`
- 500 Internal Server Error when making API calls

**Solution:**

1. **Check your frontend `.env` file:**
   ```bash
   cd frontend
   # Check if .env exists
   cat .env
   ```

2. **Create or update `.env` file:**
   ```env
   VITE_BACKEND_URL=http://localhost:4000/api
   VITE_API_BASE_URL=http://localhost:4000/api
   ```

3. **Restart the frontend dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Clear Vite cache
   rm -rf node_modules/.vite
   # Restart
   npm run dev
   ```

4. **Verify backend is running on port 4000:**
   ```bash
   cd backend
   # Check .env file
   cat .env
   # Should have: PORT=4000
   ```

## Issue 2: Firebase Storage Bucket Error

**Symptoms:**
- Error: "The specified bucket does not exist"
- Bucket name shows as `ai-healthcare-robot.firebasestorage.app` (wrong format)
- CORS errors when uploading files

**Solution:**

1. **Check Firebase Storage Bucket Name:**
   - Correct format: `ai-healthcare-robot.appspot.com`
   - Wrong format: `ai-healthcare-robot.firebasestorage.app`

2. **Update frontend `.env` file:**
   ```env
   VITE_FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
   ```

3. **Verify Firebase Storage is enabled:**
   - Go to: https://console.firebase.google.com/project/ai-healthcare-robot/storage
   - If not enabled, click "Get started" and enable it

4. **Check backend `.env` file:**
   ```env
   FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
   ```

5. **Restart both servers after changes**

## Issue 3: Service Account Permissions

**Symptoms:**
- Error: "Caller does not have required permission to use project"
- Error: "PERMISSION_DENIED"
- 403 Forbidden errors

**Solution:**

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/iam-admin/iam?project=ai-healthcare-robot

2. **Find the service account:**
   `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`

3. **Click Edit (pencil icon) and add these roles:**
   - **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) - **REQUIRED**
   - **Firebase Admin SDK Administrator Service Agent** (`roles/firebase.adminsdk.adminServiceAgent`)
   - **Cloud Datastore User** (`roles/datastore.user`)
   - **Storage Admin** (`roles/storage.admin`)

4. **Wait 2-5 minutes** for permissions to propagate

5. **Restart backend server**

## Issue 4: CORS Errors

**Symptoms:**
- "Access to XMLHttpRequest blocked by CORS policy"
- Preflight request failures
- CORS errors when uploading files directly to Firebase Storage

**Solution:**

1. **Backend CORS is already configured** - make sure backend is running on port 4000

2. **For Firebase Storage CORS (Required for direct uploads):**
   
   ⚠️ **Important:** Firebase Storage is Google Cloud Storage under the hood. You MUST use `gsutil` to set CORS - there's no Firebase UI for this.
   
   **Quick Setup:**
   ```bash
   # 1. Install Google Cloud SDK (if not installed)
   # Download from: https://cloud.google.com/sdk/docs/install
   
   # 2. Initialize and login
   gcloud init
   gcloud auth login
   
   # 3. Set CORS (development - permissive)
   gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com
   
   # OR for production (restricted)
   gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com
   
   # 4. Verify
   gsutil cors get gs://ai-healthcare-robot.appspot.com
   ```
   
   📖 **See detailed guide:** `FIREBASE_STORAGE_CORS_SETUP.md`

3. **Alternative:** Use backend API for file uploads (already implemented)
   - Backend handles uploads (no CORS issues)
   - This is the recommended approach
   - Already configured and working

## Quick Fix Checklist

- [ ] Frontend `.env` has `VITE_BACKEND_URL=http://localhost:4000/api`
- [ ] Frontend `.env` has `VITE_FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com`
- [ ] Backend `.env` has `PORT=4000`
- [ ] Backend `.env` has `FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com`
- [ ] Service account has "Service Usage Consumer" role
- [ ] Firebase Storage is enabled in Firebase Console
- [ ] Both servers restarted after .env changes
- [ ] Cleared Vite cache: `rm -rf frontend/node_modules/.vite`

## Verify Configuration

### Check Frontend Config:
```bash
cd frontend
cat .env
# Should show:
# VITE_BACKEND_URL=http://localhost:4000/api
# VITE_FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
```

### Check Backend Config:
```bash
cd backend
cat .env
# Should show:
# PORT=4000
# FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
```

### Test Backend:
```bash
cd backend
curl http://localhost:4000/api/health
# Should return: {"ok":true,"uptime":...}
```

### Test Frontend:
Open browser console and check:
- No errors about port 3000
- Firebase config shows correct bucket name
- API calls go to `localhost:4000`


