# Vitals Data Debug Guide

## 🚨 Issue: Vitals Not Showing After Authentication

After adding Firebase Authentication, vital readings are not displaying on the dashboard. This guide will help you debug and fix the issue.

## 🔍 Debug Steps

### 1. Check Browser Console

Open your browser's developer console and look for these debug messages:

```
🔍 Dashboard Debug Info:
- User authenticated: true
- User UID: gbceRt9rZ2dMeDzd4BMq0Uia6Lr2
- User email: cnpramoda@gmail.com
- Data path will be: users/gbceRt9rZ2dMeDzd4BMq0Uia6Lr2/vitals
- Timeframe: 1m
```

### 2. Check Firebase Data Path

The app now looks for vitals data at: `users/{uid}/vitals` instead of `sensor_data`

**Before (working)**: `sensor_data`
**After (current)**: `users/{user_uid}/vitals`

### 3. Verify Data Structure

Your Firebase Realtime Database should have this structure:

```json
{
  "users": {
    "gbceRt9rZ2dMeDzd4BMq0Uia6Lr2": {
      "vitals": {
        "reading1": {
          "timestamp": 1640995200000,
          "heartRate": 75,
          "spo2": 98,
          "bodyTemp": 36.5
        },
        "reading2": {
          "timestamp": 1640995260000,
          "heartRate": 76,
          "spo2": 97,
          "bodyTemp": 36.6
        }
      }
    }
  }
}
```

## 🔧 Solutions

### Option 1: Migrate Existing Data (Recommended)

If you have existing data in `sensor_data`, migrate it to the user-specific path:

1. **Go to Firebase Console** → Realtime Database
2. **Copy data from `sensor_data`** to `users/{your_uid}/vitals`
3. **Test the dashboard** - it should now show data

### Option 2: Update Data Collection

If you're collecting new data, ensure your data collection code writes to:
```
users/{user_uid}/vitals/{reading_id}
```

### Option 3: Temporary Fallback (Quick Fix)

If you want to keep using the old path temporarily, update the `subscribeToSensorData` function:

```javascript
// In firebaseService.js, line 84
const dataPath = options.userId ? `users/${options.userId}/vitals` : "sensor_data";
// Change to:
const dataPath = "sensor_data"; // Use old path temporarily
```

## 🛡️ Security Rules

### Realtime Database Rules

Deploy these rules to Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        "vitals": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    "sensor_data": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Firestore Rules (if using Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔄 Backend Updates

If you're using a backend API, update it to:

1. **Accept userId parameter**:
   ```
   GET /api/vitals/history?userId={uid}&limit=100&timeframe=1m
   ```

2. **Filter data by user**:
   ```javascript
   // In your backend
   const userId = req.query.userId;
   const dataPath = userId ? `users/${userId}/vitals` : 'sensor_data';
   ```

## 🧪 Testing Steps

1. **Login to your app**
2. **Check console logs** for debug info
3. **Verify data path** matches your Firebase structure
4. **Check Firebase Console** for data at the expected path
5. **Test with sample data** if needed

## 📊 Sample Data for Testing

Add this to your Firebase Realtime Database for testing:

```json
{
  "users": {
    "YOUR_USER_UID_HERE": {
      "vitals": {
        "test1": {
          "timestamp": 1640995200000,
          "heartRate": 75,
          "spo2": 98,
          "bodyTemp": 36.5,
          "ambientTemp": 25.0,
          "accMagnitude": 1.0,
          "fallDetected": false
        },
        "test2": {
          "timestamp": 1640995260000,
          "heartRate": 76,
          "spo2": 97,
          "bodyTemp": 36.6,
          "ambientTemp": 24.8,
          "accMagnitude": 1.1,
          "fallDetected": false
        }
      }
    }
  }
}
```

## 🚨 Common Issues

### Issue 1: "Permission denied"
**Solution**: Check Realtime Database rules are deployed correctly

### Issue 2: "No data received"
**Solution**: Verify data exists at the correct path in Firebase

### Issue 3: "User not authenticated"
**Solution**: Check AuthContext is working and user is logged in

### Issue 4: "Firebase subscription error"
**Solution**: Check Firebase configuration and network connectivity

## 📝 Quick Checklist

- [ ] User is authenticated (check console logs)
- [ ] Data exists at `users/{uid}/vitals` path
- [ ] Realtime Database rules are deployed
- [ ] Backend API accepts userId parameter (if using backend)
- [ ] Console shows debug info with correct paths
- [ ] No permission errors in console

## 🔄 Rollback Option

If you need to quickly revert to the old behavior:

1. Change `dataPath` in `firebaseService.js` back to `"sensor_data"`
2. Remove user authentication checks in Dashboard
3. Deploy and test

This will restore the old functionality while you work on the proper user-specific data structure.

