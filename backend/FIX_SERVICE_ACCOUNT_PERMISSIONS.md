# Fix Service Account Permissions Error

## Problem
You're getting this error:
```
PERMISSION_DENIED: Caller does not have required permission to use project ai-healthcare-robot. 
Grant the caller the roles/serviceusage.serviceUsageConsumer role
```

This happens when the Firebase Admin service account doesn't have the required permissions to use Firebase Authentication API.

## Solution: Add Required IAM Roles

### Step 1: Go to Google Cloud Console
1. Open https://console.cloud.google.com/
2. Select project: **ai-healthcare-robot**

### Step 2: Navigate to IAM & Admin
1. Go to **IAM & Admin** → **IAM**
2. Find the service account: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`

### Step 3: Add Required Roles
Click the **Edit** (pencil icon) next to the service account and add these roles:

**Required Roles:**
1. **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)
   - Allows the service account to use Google Cloud APIs
   - **This is the missing role causing your error**

2. **Firebase Admin SDK Administrator Service Agent** (`roles/firebase.adminsdk.adminServiceAgent`)
   - Full access to Firebase services
   - Recommended for Firebase Admin SDK

3. **Cloud Datastore User** (`roles/datastore.user`)
   - Read/write access to Firestore

4. **Storage Admin** (`roles/storage.admin`)
   - Full access to Firebase Storage

### Step 4: Alternative - Use Firebase Console
1. Go to https://console.firebase.google.com/
2. Select project: **ai-healthcare-robot**
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. This will automatically grant the correct permissions

### Step 5: Wait for Propagation
After adding roles, wait 2-5 minutes for permissions to propagate.

### Step 6: Restart Backend Server
```bash
cd backend
# Stop the server (Ctrl+C)
npm start
```

## Verify the Fix

Run the test script:
```bash
cd backend
node scripts/test-firebase-admin.js
```

You should see:
```
✅ Firestore connection successful!
```

## Quick Fix Summary

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=ai-healthcare-robot
2. Find: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`
3. Click **Edit** (pencil icon)
4. Add role: **Service Usage Consumer**
5. Click **Save**
6. Wait 2-5 minutes
7. Restart backend server

## Still Having Issues?

If you still get permission errors after adding the roles:

1. **Regenerate Service Account Key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Replace `backend/config/serviceAccountKey.json` with the new file

2. **Check API Enablement:**
   - Go to: https://console.cloud.google.com/apis/library?project=ai-healthcare-robot
   - Ensure these APIs are enabled:
     - Identity Toolkit API (for Firebase Auth)
     - Cloud Firestore API
     - Cloud Storage API

3. **Verify Service Account Status:**
   - Make sure the service account is not disabled
   - Check that it's not deleted



