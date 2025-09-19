# Firebase Authentication Troubleshooting Guide

## 🚨 Common Errors and Solutions

### Error 1: `400 Bad Request` on signUp
**Symptoms**: 
- POST to `identitytoolkit.googleapis.com/v1/accounts:signUp` returns 400
- User registration fails

**Possible Causes & Solutions**:

#### 1. Firebase Project Not Configured
**Check**: Go to Firebase Console → Project Settings → General
**Solution**: 
- Ensure you have a Firebase project created
- Copy the correct config values to your `.env.local` file

#### 2. Authentication Not Enabled
**Check**: Firebase Console → Authentication → Sign-in method
**Solution**:
- Enable "Email/Password" provider
- Make sure it's not disabled

#### 3. Environment Variables Missing/Incorrect
**Check**: Your `.env.local` file
**Solution**:
```bash
# Create .env.local file
cp env.example .env.local

# Update with your actual Firebase config
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... etc
```

#### 4. API Key Restrictions
**Check**: Google Cloud Console → APIs & Services → Credentials
**Solution**:
- Ensure API key has no restrictions, OR
- Add your domain to the allowed referrers

### Error 2: `400 Bad Request` on Firestore
**Symptoms**:
- POST to `firestore.googleapis.com` returns 400
- Database operations fail

**Possible Causes & Solutions**:

#### 1. Firestore Not Enabled
**Check**: Firebase Console → Firestore Database
**Solution**:
- Create a Firestore database
- Choose "Start in production mode" (we'll add rules later)

#### 2. Incorrect Project ID
**Check**: Your `.env.local` file
**Solution**:
- Ensure `VITE_FIREBASE_PROJECT_ID` matches your Firebase project ID exactly

#### 3. Security Rules Too Restrictive
**Check**: Firebase Console → Firestore Database → Rules
**Solution**:
- Temporarily set rules to allow all reads/writes for testing:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🔧 Step-by-Step Setup Verification

### 1. Verify Firebase Project Setup
```bash
# Check if you have a .env.local file
ls -la .env.local

# If not, create it
cp env.example .env.local
```

### 2. Get Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) → General
4. Scroll down to "Your apps" section
5. If no web app exists, click "Add app" → Web
6. Copy the config object values to your `.env.local`

### 3. Enable Required Services
1. **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
   - Save

2. **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in production mode"
   - Select a location
   - Done

3. **Storage** (for file uploads):
   - Go to Storage
   - Click "Get started"
   - Choose "Start in production mode"
   - Done

### 4. Test Configuration
Create a simple test file to verify your setup:

```javascript
// test-firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('Firebase Config:', firebaseConfig);

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
  console.log('Auth:', auth);
  console.log('Firestore:', db);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}
```

## 🐛 Debug Mode

Add this to your `firebaseService.js` to see what's happening:

```javascript
// Add this at the top of firebaseService.js
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Set' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Set' : 'Missing',
  // ... etc
});
```

## 📞 Quick Fixes

### If you're getting 400 errors:

1. **Double-check your project ID**:
   ```bash
   # In your .env.local
   VITE_FIREBASE_PROJECT_ID=your-exact-project-id
   ```

2. **Verify API key**:
   - Go to Google Cloud Console
   - APIs & Services → Credentials
   - Make sure the API key is not restricted

3. **Check Firebase Console**:
   - Authentication → Sign-in method → Email/Password is enabled
   - Firestore Database exists and is created

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## 🆘 Still Having Issues?

1. **Check browser console** for more detailed error messages
2. **Verify network tab** in DevTools to see the exact request/response
3. **Try in incognito mode** to rule out browser cache issues
4. **Check Firebase Console** for any error logs

## 📋 Environment Variables Checklist

Make sure your `.env.local` has all these set correctly:

- [ ] `VITE_FIREBASE_API_KEY` - Your Firebase API key
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - `your-project-id.firebaseapp.com`
- [ ] `VITE_FIREBASE_PROJECT_ID` - Your exact project ID
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - `your-project-id.appspot.com`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your sender ID
- [ ] `VITE_FIREBASE_APP_ID` - Your app ID

**Note**: All values should be strings without quotes in the .env.local file.


