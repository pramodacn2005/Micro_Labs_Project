# Quick CORS Setup for Firebase Storage

## 🚀 Fast Setup (5 minutes)

### Step 1: Install Google Cloud SDK
Download: https://cloud.google.com/sdk/docs/install

### Step 2: Initialize
```bash
gcloud init
gcloud auth login
```

### Step 3: Apply CORS
```bash
# Development (allows all origins)
gsutil cors set cors-dev.json gs://ai-healthcare-robot.appspot.com

# OR Production (restricted origins)
gsutil cors set cors.json gs://ai-healthcare-robot.appspot.com
```

### Step 4: Verify
```bash
gsutil cors get gs://ai-healthcare-robot.appspot.com
```

✅ Done! CORS is now configured.

---

📖 **For detailed instructions, see:** `FIREBASE_STORAGE_CORS_SETUP.md`

