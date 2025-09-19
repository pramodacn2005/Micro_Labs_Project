# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for your HealthMonitor application.

## 🚀 Features Implemented

### ✅ Frontend Components
- **Login Page** (`/login`) - Email/password authentication with validation
- **Signup Page** (`/signup`) - User registration with password strength indicator
- **Protected Routes** - Dashboard, Profile, History, etc. require authentication
- **AuthContext** - Global authentication state management
- **Updated Sidebar** - Shows user info when logged in, Sign In button when logged out

### ✅ Backend Integration
- **Firebase Authentication** - Email/password authentication
- **Firestore Integration** - User metadata storage
- **Security Rules** - Users can only access their own data
- **Password Reset** - Email-based password recovery
- **Email Verification** - Automatic verification emails

## 🔧 Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
5. Enable Storage:
   - Go to Storage
   - Create storage bucket

### 2. Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Get your Firebase config from Project Settings > General > Your apps
3. Update `.env.local` with your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 3. Deploy Security Rules

#### Firestore Rules
1. Go to Firestore Database > Rules
2. Replace the default rules with content from `firestore.rules`
3. Click "Publish"

#### Storage Rules
1. Go to Storage > Rules
2. Replace the default rules with content from `storage.rules`
3. Click "Publish"

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Application

```bash
npm run dev
```

## 📱 User Flow

### For New Users:
1. Visit the app → Redirected to `/login`
2. Click "Sign up" → Go to `/signup`
3. Fill registration form → Account created
4. Check email for verification → Verify account
5. Login → Access to Dashboard

### For Existing Users:
1. Visit the app → Redirected to `/login`
2. Enter credentials → Access to Dashboard
3. User info shown in sidebar
4. Logout button available

## 🔒 Security Features

### Authentication
- Email/password authentication
- Password strength validation
- Email verification
- Password reset functionality
- Remember me option

### Authorization
- Protected routes require authentication
- Users can only access their own data
- Firestore rules prevent unauthorized access
- Storage rules restrict file access

### Data Protection
- User metadata stored in Firestore
- Secure password handling
- Session persistence
- Automatic logout on token expiry

## 🎨 UI/UX Features

### Login Page
- Clean, card-based design
- Email and password validation
- "Remember me" checkbox
- "Forgot password" link
- Loading states and error messages
- Mobile responsive

### Signup Page
- Full name, email, password, phone fields
- Password strength indicator
- Terms acceptance checkbox
- Real-time validation
- Success/error feedback

### Sidebar Integration
- Shows user name and email when logged in
- Displays user initials in avatar
- Logout button
- Sign In button when not authenticated
- Smooth transitions

## 🔧 Customization

### Styling
- Uses Tailwind CSS classes
- Matches existing design system
- Blue accent colors (`primary-500`, `primary-600`)
- Consistent with Dashboard styling

### Validation
- Email format validation
- Password strength requirements
- Required field validation
- Real-time error feedback

### Error Handling
- User-friendly error messages
- Network error handling
- Firebase error translation
- Loading states

## 🚨 Troubleshooting

### Common Issues

1. **"Firebase app already exists"**
   - Check if Firebase is initialized multiple times
   - Ensure proper singleton pattern

2. **"Invalid API key"**
   - Verify environment variables
   - Check Firebase project configuration

3. **"Permission denied"**
   - Verify Firestore rules are deployed
   - Check user authentication state

4. **"Email not verified"**
   - Check spam folder
   - Resend verification email

### Debug Steps

1. Check browser console for errors
2. Verify Firebase project settings
3. Test with different browsers
4. Check network requests in DevTools

## 📚 API Reference

### AuthContext
```jsx
const { user, userData, loading, isAuthenticated } = useAuth();
```

### Auth Functions
```javascript
import { signup, login, logout, sendPasswordReset } from '../services/firebaseService';

// Sign up
const result = await signup(email, password, fullName, phone);

// Login
const result = await login(email, password);

// Logout
const result = await logout();

// Password reset
const result = await sendPasswordReset(email);
```

## 🎯 Next Steps

1. **Email Templates**: Customize Firebase Auth email templates
2. **Social Login**: Add Google/Facebook authentication
3. **Two-Factor Auth**: Implement 2FA for enhanced security
4. **User Management**: Admin panel for user management
5. **Analytics**: Track authentication events

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors
4. Verify environment variables

---

**Note**: This implementation provides a complete authentication system that integrates seamlessly with your existing HealthMonitor application. All components are mobile-responsive and follow your design system.


