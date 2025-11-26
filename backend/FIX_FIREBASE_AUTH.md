# Fix Firebase Admin Authentication Error

## Problem
The `/api/doctors` endpoint is failing with error:
```
16 UNAUTHENTICATED: Request had invalid authentication credentials
```

This means the Firebase Admin SDK service account credentials are invalid or expired.

## Solution: Regenerate Service Account Key

### Step 1: Go to Google Cloud Console
1. Open https://console.cloud.google.com/
2. Select project: **ai-healthcare-robot**

### Step 2: Navigate to Service Accounts
1. Go to **IAM & Admin** → **Service Accounts**
2. Find: `firebase-adminsdk-fbsvc@ai-healthcare-robot.iam.gserviceaccount.com`

### Step 3: Verify Permissions
1. Click on the service account
2. Go to **Permissions** tab
3. Ensure it has one of these roles:
   - **Firebase Admin SDK Administrator Service Agent** (recommended)
   - OR **Cloud Datastore User** + **Firestore User**

### Step 4: Regenerate the Key
1. Click on the service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Download the JSON file

### Step 5: Replace the Old Key
1. Replace `backend/config/serviceAccountKey.json` with the newly downloaded file
2. Make sure the filename is exactly: `serviceAccountKey.json`

### Step 6: Verify the Fix
Run the test script:
```bash
cd backend
node scripts/test-firebase-admin.js
```

You should see:
```
✅ Firestore connection successful!
```

### Step 7: Restart Backend Server
```bash
# Stop the server (Ctrl+C)
# Then restart
npm start
```

## Alternative: Check Environment Variable

If you're using a custom path for the service account, check your `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=./config/serviceAccountKey.json
```

Make sure the path is correct relative to the `backend` directory.

## Verify Backend Port

The backend should run on port **4000** by default. Check your `.env`:

```env
PORT=4000
```

And ensure your frontend `.env` file has:

```env
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api
```

## Still Having Issues?

1. **Check if service account is disabled:**
   - In Google Cloud Console → Service Accounts
   - Ensure the account is **Enabled** (not disabled)

2. **Check if Firestore API is enabled:**
   - Go to **APIs & Services** → **Library**
   - Search for "Cloud Firestore API"
   - Ensure it's **Enabled**

3. **Check service account key format:**
   - The JSON file should have these fields:
     - `type`: "service_account"
     - `project_id`: "ai-healthcare-robot"
     - `private_key`: "-----BEGIN PRIVATE KEY-----..."
     - `client_email`: "firebase-adminsdk-...@ai-healthcare-robot.iam.gserviceaccount.com"

4. **Verify file permissions:**
   - The service account file should be readable by the Node.js process
   - Check file permissions: `chmod 600 config/serviceAccountKey.json` (Linux/Mac)

