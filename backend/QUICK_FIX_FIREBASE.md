# 🔧 Quick Fix: Firebase Admin Authentication

## The Problem
Error: `Firebase Admin authentication failed. The service account credentials are invalid or expired.`

This means the service account key file (`backend/config/serviceAccountKey.json`) is invalid or expired.

## ✅ Solution: Regenerate Service Account Key

### Step 1: Open Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Make sure you're in project: **ai-healthcare-robot**

### Step 2: Navigate to Service Accounts
1. Click **IAM & Admin** in the left menu
2. Click **Service Accounts**
3. Find: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`

### Step 3: Create New Key
1. Click on the service account name
2. Go to **Keys** tab (at the top)
3. Click **Add Key** button
4. Select **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. The JSON file will download automatically

### Step 4: Replace the Old Key
1. **IMPORTANT**: Delete or backup the old file first:
   ```bash
   # Backup old file (optional)
   mv backend/config/serviceAccountKey.json backend/config/serviceAccountKey.json.old
   ```

2. Move the downloaded JSON file to:
   ```
   backend/config/serviceAccountKey.json
   ```

3. Make sure the filename is exactly: `serviceAccountKey.json`

### Step 5: Verify the Fix
Run the test script:
```bash
cd backend
node scripts/test-firebase-admin.js
```

You should see:
```
✅ Firestore connection successful!
```

### Step 6: Restart Backend Server
```bash
# Stop the server (Ctrl+C if running)
# Then restart
cd backend
npm start
```

## 🎯 Verify It's Working
After restarting, try accessing the doctors endpoint:
- The error should be gone
- `/api/doctors` should return a list of doctors (or empty array if no doctors exist)

## ⚠️ Important Notes

1. **Keep the key file secure**: Never commit it to Git (it should be in `.gitignore`)
2. **File location**: The file must be at `backend/config/serviceAccountKey.json`
3. **File format**: Must be valid JSON with these fields:
   - `type`: "service_account"
   - `project_id`: "ai-healthcare-robot"
   - `private_key`: "-----BEGIN PRIVATE KEY-----..."
   - `client_email`: "firebase-adminsdk-...@ai-healthcare-robot.iam.gserviceaccount.com"

## 🔍 If Still Not Working

1. **Check file exists**:
   ```bash
   ls -la backend/config/serviceAccountKey.json
   ```

2. **Check file is valid JSON**:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('backend/config/serviceAccountKey.json', 'utf8')).project_id)"
   ```
   Should output: `ai-healthcare-robot`

3. **Check service account permissions**:
   - In Google Cloud Console → Service Accounts
   - Click on your service account
   - Go to **Permissions** tab
   - Ensure it has: **Firebase Admin SDK Administrator Service Agent** role

4. **Check Firestore API is enabled**:
   - Go to **APIs & Services** → **Library**
   - Search for "Cloud Firestore API"
   - Make sure it's **Enabled**

## 📞 Need More Help?

Check the detailed guide: `backend/FIX_FIREBASE_AUTH.md`

