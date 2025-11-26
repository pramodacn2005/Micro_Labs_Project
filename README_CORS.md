# Firebase Storage CORS - Quick Reference

## ⚡ Quick Setup (Copy & Paste)

```bash
# 1. Install Google Cloud SDK
# Windows: https://cloud.google.com/sdk/docs/install-windows
# macOS: https://cloud.google.com/sdk/docs/install-macos
# Linux: https://cloud.google.com/sdk/docs/install-linux

# 2. Initialize
gcloud init
gcloud auth login

# 3. Set CORS (Development - Permissive)
gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com

# OR Production (Restricted)
gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com

# 4. Verify
gsutil cors get gs://ai-healthcare-robot.appspot.com
```

## 📚 Full Documentation

- **Quick Guide:** `SETUP_CORS.md`
- **Detailed Guide:** `FIREBASE_STORAGE_CORS_SETUP.md`
- **Troubleshooting:** `TROUBLESHOOTING.md` (Issue 4)

## ⚠️ Important Notes

1. **Firebase Storage = Google Cloud Storage** - Must use `gsutil`, not Firebase UI
2. **No Firebase CORS UI** - Firebase doesn't provide a CORS configuration interface
3. **Backend API Alternative** - Already implemented, no CORS setup needed
4. **Bucket Name:** Must be `ai-healthcare-robot.appspot.com` (not `firebasestorage.app`)

## ✅ Files Included

- `cors.json` - Production CORS config (restricted origins)
- `cors-dev.json` - Development CORS config (allows all origins)
- `FIREBASE_STORAGE_CORS_SETUP.md` - Complete setup guide
- `SETUP_CORS.md` - Quick reference

