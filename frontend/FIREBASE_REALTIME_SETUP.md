# 🔥 Firebase Realtime Database Setup Guide

## 🎯 **Goal**: Fetch Real-Time Vitals Data from Firebase

You want to fetch actual vitals data from your Firebase Realtime Database based on timeframes, not mock data.

## 🔍 **Step 1: Check Firebase Configuration**

### **1.1 Verify Environment Variables**
Check your `.env.local` file has these values:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### **1.2 Check Console Logs**
Open browser console and look for:
```
Firebase Config Check: {
  apiKey: '✅ Set',
  authDomain: '✅ Set',
  projectId: '✅ Set',
  databaseURL: '✅ Set',
  storageBucket: '✅ Set',
  messagingSenderId: '✅ Set',
  appId: '✅ Set'
}
```

## 📊 **Step 2: Verify Firebase Data Structure**

### **2.1 Check Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Realtime Database**
4. Verify data exists at `/sensor_data`

### **2.2 Expected Data Structure**
```json
{
  "sensor_data": {
    "-OZNvxvRWEAgfSJB0kGT": {
      "accMagnitude": 1.00044,
      "ambientTemp": 28.74999,
      "bodyTemp": 29.79,
      "fallDetected": false,
      "heartRate": -1,
      "spo2": -1,
      "timestamp": 11959
    },
    "-OZNvxvRWEAgfSJB0kGT2": {
      "accMagnitude": 1.10044,
      "ambientTemp": 28.84999,
      "bodyTemp": 29.89,
      "fallDetected": false,
      "heartRate": 75,
      "spo2": 98,
      "timestamp": 11960
    }
  }
}
```

## 🛡️ **Step 3: Deploy Security Rules**

### **3.1 Go to Firebase Console**
1. **Realtime Database** → **Rules**
2. Paste these rules:

```json
{
  "rules": {
    "sensor_data": {
      ".read": true,
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

3. Click **Publish**

## 🔧 **Step 4: Test Firebase Connection**

### **4.1 Add Test Data (if needed)**
If you don't have data, add some test data to Firebase:

```json
{
  "sensor_data": {
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
```

### **4.2 Check Console Logs**
Look for these logs in your browser console:
```
🌡️ Subscribing to global vitals data from: sensor_data
📊 Fetching last 100 readings
✅ Firebase vitals data received: 2 readings from sensor_data
📈 Sample reading: {timestamp: 1640995200000, heartRate: 75, ...}
```

## 🚨 **Step 5: Troubleshooting**

### **5.1 No Data Received**
**Symptoms**: Console shows "0 readings from sensor_data"
**Solutions**:
- Check if data exists in Firebase Console
- Verify security rules are deployed
- Check network connectivity

### **5.2 Permission Denied**
**Symptoms**: Console shows "Permission denied" error
**Solutions**:
- Deploy the security rules (Step 3)
- Check if Realtime Database is enabled
- Verify database URL is correct

### **5.3 Configuration Error**
**Symptoms**: Console shows "Missing Firebase configuration"
**Solutions**:
- Check `.env.local` file exists
- Verify all environment variables are set
- Restart your development server

### **5.4 Wrong Data Path**
**Symptoms**: Data exists but not showing
**Solutions**:
- Verify data is at `/sensor_data` path
- Check data structure matches expected format
- Look for typos in path names

## 📱 **Step 6: Test Timeframe Filtering**

### **6.1 Check Timeframe Logic**
The app should filter data based on selected timeframe:
- **1m**: Last 1 minute of data
- **15m**: Last 15 minutes of data  
- **1h**: Last 1 hour of data

### **6.2 Verify Timestamps**
Make sure your Firebase data has proper timestamps:
- Use `Date.now()` for current time
- Use milliseconds since epoch
- Ensure timestamps are recent

## 🎯 **Step 7: Expected Behavior**

### **7.1 Console Logs**
```
🔍 Dashboard Vitals Debug Info:
- User authenticated: true/false
- Vitals data path: sensor_data (global, no auth required)
- Timeframe: 1m

🌡️ Subscribing to global vitals data from: sensor_data
📊 Fetching last 100 readings
✅ Firebase vitals data received: 5 readings from sensor_data
📈 Sample reading: {timestamp: 1640995200000, heartRate: 75, ...}
```

### **7.2 Dashboard Display**
- Vitals cards show real data
- Data updates in real-time
- Timeframe selector works
- No authentication required

## 🔄 **Step 8: Fallback to Backend**

If Firebase doesn't work, the app will automatically fall back to the backend API:
```
⚠️ Firebase not available, using backend polling...
🌡️ Fetching global vitals data, timeframe: 1m, limit: 100
✅ Received 5 vitals items from backend (global data)
```

## 📋 **Quick Checklist**

- [ ] Environment variables set in `.env.local`
- [ ] Firebase Console shows data at `/sensor_data`
- [ ] Security rules deployed
- [ ] Console shows Firebase connection logs
- [ ] Dashboard displays real data
- [ ] Timeframe filtering works
- [ ] Real-time updates working

## 🆘 **Still Not Working?**

If you're still having issues:

1. **Check browser console** for specific error messages
2. **Verify Firebase project** is active and billing is enabled
3. **Test with simple data** first (just 1-2 records)
4. **Check network tab** for failed requests
5. **Try incognito mode** to rule out cache issues

**The key is to see "✅ Firebase vitals data received: X readings from sensor_data" in your console!**

