# Firebase Storage CORS Setup Guide

## ⚠️ Important Note

**Firebase Storage is actually Google Cloud Storage under the hood**, so the only way to set CORS for Firebase Storage is through **gsutil** (Google Cloud SDK).

- ❌ Firebase does NOT provide a CORS UI
- ❌ Firebase CLI cannot set CORS
- ✅ You MUST use Google Cloud SDK (`gsutil`)

## 📋 Prerequisites

1. **Google Cloud SDK installed** - Download from: https://cloud.google.com/sdk/docs/install
2. **Same Google account** used for your Firebase project
3. **Firebase Storage enabled** in your Firebase project

## 🚀 Step-by-Step Setup

### Step 1: Install Google Cloud SDK

1. **Download and install:**
   - Windows: https://cloud.google.com/sdk/docs/install-windows
   - macOS: https://cloud.google.com/sdk/docs/install-macos
   - Linux: https://cloud.google.com/sdk/docs/install-linux

2. **Initialize gcloud:**
   ```bash
   gcloud init
   ```

3. **Login with your Google account:**
   - Use the same account that owns your Firebase project
   - Select project: `ai-healthcare-robot`

### Step 2: Choose CORS Configuration

We provide two CORS configuration files:

#### Option A: Development (Permissive) - `cors-dev.json`
Allows all origins - **Use only for development!**

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

#### Option B: Production (Restricted) - `cors.json`
Only allows specific origins - **Use for production!**

```json
[
  {
    "origin": ["http://localhost:5173", "http://localhost:3000", "http://localhost:4000"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    "responseHeader": ["Content-Type", "x-goog-meta-*", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

**For production, update `origin` with your actual domain:**
```json
"origin": ["https://yourdomain.com", "https://www.yourdomain.com"]
```

### Step 3: Apply CORS Configuration

**For Development (Permissive):**
```bash
gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com
```

**For Production (Restricted):**
```bash
gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com
```

### Step 4: Verify CORS Configuration

Check if CORS was applied correctly:

```bash
gsutil cors get gs://ai-healthcare-robot.appspot.com
```

**Expected output:**
```json
[
  {
    "origin": ["http://localhost:5173", ...],
    "method": ["GET", "POST", ...],
    "responseHeader": ["Content-Type", ...],
    "maxAgeSeconds": 3600
  }
]
```

If you see your JSON configuration → ✅ CORS is set correctly!

## 🔧 Troubleshooting

### Issue: "Command not found: gsutil"

**Solution:**
1. Make sure Google Cloud SDK is installed
2. Restart your terminal
3. Verify installation: `gcloud --version`
4. If still not found, add to PATH or use full path

### Issue: "Access Denied" or "Permission Denied"

**Solution:**
1. Make sure you're logged in: `gcloud auth list`
2. Login again: `gcloud auth login`
3. Set the project: `gcloud config set project ai-healthcare-robot`
4. Verify you have Storage Admin permissions in Google Cloud Console

### Issue: "Bucket not found"

**Solution:**
1. Verify bucket name: `gsutil ls`
2. Should see: `gs://ai-healthcare-robot.appspot.com`
3. If not, enable Firebase Storage in Firebase Console
4. Bucket name format should be: `{project-id}.appspot.com`

### Issue: CORS still not working after setup

**Solution:**
1. **Clear browser cache** - CORS settings are cached
2. **Wait a few minutes** - Changes can take 1-2 minutes to propagate
3. **Check browser console** - Look for specific CORS error messages
4. **Verify origin matches** - The origin in your CORS config must exactly match the request origin
5. **Test with curl:**
   ```bash
   curl -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://firebasestorage.googleapis.com/v0/b/ai-healthcare-robot.appspot.com/o
   ```

## 📝 Quick Reference

### Common Commands

```bash
# Set CORS (development)
gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com

# Set CORS (production)
gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com

# Get current CORS settings
gsutil cors get gs://ai-healthcare-robot.appspot.com

# Remove CORS (not recommended)
gsutil cors set [] gs://ai-healthcare-robot.appspot.com

# List all buckets
gsutil ls

# Check bucket exists
gsutil ls gs://ai-healthcare-robot.appspot.com
```

### Update CORS for Production

When deploying to production:

1. **Edit `cors.json`:**
   ```json
   {
     "origin": ["https://yourdomain.com", "https://www.yourdomain.com"],
     ...
   }
   ```

2. **Apply:**
   ```bash
   gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com
   ```

3. **Verify:**
   ```bash
   gsutil cors get gs://ai-healthcare-robot.appspot.com
   ```

## ✅ Verification Checklist

After setting up CORS:

- [ ] Google Cloud SDK installed and initialized
- [ ] Logged in with correct Google account
- [ ] CORS configuration file created
- [ ] CORS applied to bucket: `gs://ai-healthcare-robot.appspot.com`
- [ ] CORS verified with `gsutil cors get`
- [ ] Browser cache cleared
- [ ] Tested file upload - no CORS errors in console
- [ ] Production CORS updated with actual domain (if applicable)

## 🎯 Alternative: Use Backend API

If CORS setup is too complex, you can use the backend API for file uploads (already implemented):

- ✅ Backend handles uploads (no CORS issues)
- ✅ Backend uploads to Firebase Storage
- ✅ Frontend receives download URL

The backend API is already configured and working. CORS setup is only needed if you want direct frontend-to-Firebase Storage uploads.

## 📚 Additional Resources

- [Google Cloud Storage CORS Documentation](https://cloud.google.com/storage/docs/configuring-cors)
- [gsutil CORS Documentation](https://cloud.google.com/storage/docs/gsutil/commands/cors)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)

