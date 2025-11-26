# Enable Firebase Storage - Quick Guide

## ⚠️ Error: "The specified bucket does not exist"

This error means **Firebase Storage is not enabled** in your Firebase project. The bucket is created automatically when you enable Firebase Storage.

## 🚀 Quick Fix (2 minutes)

### Step 1: Enable Firebase Storage

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/ai-healthcare-robot/storage

2. **Click "Get started"** (if Storage is not enabled)

3. **Choose Storage Rules:**
   - For development, you can start with test mode (allows read/write for authenticated users)
   - Or use production mode with proper security rules

4. **Select Location:**
   - Choose a location closest to your users (e.g., `us-central1`, `asia-south1`)
   - Click "Done"

5. **Wait for initialization** (usually 1-2 minutes)

### Step 2: Verify Storage is Enabled

1. **Check Storage Dashboard:**
   - Go to: https://console.firebase.google.com/project/ai-healthcare-robot/storage
   - You should see "Storage" with a green checkmark ✅

2. **Verify Bucket Name:**
   - The bucket should be: `ai-healthcare-robot.appspot.com`
   - You can see this in Storage settings

### Step 3: Restart Backend Server

```bash
cd backend
# Stop server (Ctrl+C)
npm start
```

### Step 4: Test Upload

Try uploading a file again. It should work now!

## 🔍 Verify Bucket Exists

After enabling Storage, verify the bucket:

```bash
# If you have gsutil installed:
gsutil ls gs://ai-healthcare-robot.appspot.com

# Should show the bucket (even if empty)
```

## 📝 Storage Rules (Recommended)

After enabling Storage, update your security rules:

1. Go to: https://console.firebase.google.com/project/ai-healthcare-robot/storage/rules

2. **For Development (Test Mode):**
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **For Production:**
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /patient-files/{userId}/{fileName} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /patient-files/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. Click **Publish**

## ✅ Verification Checklist

After enabling Storage:

- [ ] Firebase Storage is enabled in Firebase Console
- [ ] Storage dashboard shows green checkmark ✅
- [ ] Bucket name is `ai-healthcare-robot.appspot.com`
- [ ] Storage rules are configured
- [ ] Backend server restarted
- [ ] Test file upload works

## 🆘 Still Getting "Bucket does not exist"?

If you still get the error after enabling Storage:

1. **Wait 2-3 minutes** - Bucket creation can take a moment
2. **Check Firebase Console** - Verify Storage is actually enabled
3. **Check Service Account Permissions:**
   - Go to: https://console.cloud.google.com/iam-admin/iam?project=ai-healthcare-robot
   - Find: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`
   - Ensure it has **Storage Admin** role
4. **Verify bucket name in backend logs:**
   - Check backend console for: `[File Controller] Using storage bucket: ai-healthcare-robot.appspot.com`
5. **Check backend .env:**
   ```env
   FIREBASE_STORAGE_BUCKET=ai-healthcare-robot.appspot.com
   ```

## 📚 Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)

