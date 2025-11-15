# 📖 How to Use the Doctor Appointment Booking System

## 🚀 Quick Start Guide

### Prerequisites
1. **Backend running**: Make sure your Express backend is running on port 4000
2. **Frontend running**: Make sure your React frontend is running
3. **Firebase configured**: Ensure Firebase credentials are set in `.env` files
4. **User authenticated**: Log in to the application

---

## 👤 For Patients - Booking an Appointment

### Method 1: From Fever Checker (Automatic Trigger)

1. **Run a Fever Check**
   - Navigate to **"Fever Checker"** from the sidebar
   - Fill in your symptoms and submit
   - If fever severity is **High** or **Very High**, you'll see:
     - 🔴 **Emergency Banner** (Very High): "Book a Doctor Immediately" button
     - 🟠 **High Fever Warning** (High): "Book a Doctor Now" button

2. **Click the Booking Button**
   - This automatically takes you to the doctor list page

3. **Select a Doctor**
   - Browse available doctors
   - Use filters:
     - **Search by Name**: Type doctor's name
     - **Specialization**: Select from dropdown (General Physician, Pediatrician, etc.)
     - **Location**: Enter city name
   - Click **"Book Appointment"** on any doctor card

4. **Book Your Appointment**
   - **Select Date**: Choose a date (up to 30 days ahead)
   - **Select Time Slot**: Pick from available time slots
   - **Choose Reason**: Select from:
     - Fever symptoms
     - High fever emergency
     - Persistent fever
     - Fever with other symptoms
     - Follow-up consultation
     - Other (with custom text)
   - Click **"Book Appointment"**

5. **Confirmation**
   - You'll see a success message
   - Click **"View My Appointments"** to see your booking

### Method 2: Direct Booking

1. **Navigate to Find Doctors**
   - Click **"🩺 Find Doctors"** in the sidebar
   - Or navigate directly from the menu

2. **Search and Filter**
   - Use the search bar to find doctors by name
   - Filter by specialization (e.g., "Pediatrician")
   - Filter by location (e.g., "New York")

3. **View Doctor Profiles**
   - Each card shows:
     - Doctor's photo (or placeholder)
     - Name and specialization
     - Star rating
     - Years of experience
     - Location
     - Qualifications

4. **Book Appointment**
   - Click **"Book Appointment"** button
   - Follow steps 4-5 from Method 1

### Managing Your Appointments

1. **View Appointments**
   - Click **"📅 My Appointments"** in the sidebar
   - See all your appointments with status:
     - 🟡 **Pending**: Waiting for doctor's approval
     - 🟢 **Accepted**: Doctor confirmed your appointment
     - 🔴 **Rejected**: Doctor declined
     - 🔵 **Completed**: Appointment finished
     - ⚫ **Cancelled**: You cancelled it

2. **Filter Appointments**
   - Use filter tabs: All, Pending, Accepted, Completed, Cancelled
   - Click on any tab to filter

3. **Cancel Appointment**
   - Only **Pending** appointments can be cancelled
   - Click **"Cancel"** button on a pending appointment
   - Confirm cancellation

---

## 👨‍⚕️ For Doctors - Managing Appointments

### Accessing Doctor Dashboard

1. **Login as Doctor**
   - Make sure your Firebase user has `role: 'doctor'` in user data
   - Or access via: `doctor-dashboard` page (if you have doctor role)

2. **View Dashboard**
   - See statistics:
     - **Pending Requests**: Number of appointments waiting approval
     - **Today's Appointments**: Appointments scheduled for today
     - **Total Appointments**: All appointments

### Managing Appointment Requests

1. **View Pending Requests**
   - Dashboard shows all pending appointments by default
   - Each card shows:
     - Patient name and email
     - Appointment date and time
     - Reason for visit

2. **Accept an Appointment**
   - Click **"✅ Accept"** button
   - Appointment status changes to "Accepted"
   - Patient is notified (if notifications are set up)

3. **Reject an Appointment**
   - Click **"❌ Reject"** button
   - Confirm rejection
   - Appointment status changes to "Rejected"

4. **View Today's Appointments**
   - Click **"Today"** filter tab
   - Select date if needed
   - See all appointments for that day

5. **Mark as Completed**
   - After consultation, click **"Mark Complete"** on accepted appointments
   - Status changes to "Completed"

### Setting Availability (Future Feature)

Currently, availability is set when admin adds a doctor. In the future:
- Doctors can set their working hours
- Configure available time slots
- Set max patients per slot

---

## 👨‍💼 For Admins - Managing the System

### Accessing Admin Dashboard

1. **Login as Admin**
   - Make sure your Firebase user has `role: 'admin'` in user data
   - Access via: `admin-dashboard` page

2. **View Dashboard Tabs**
   - **Doctors**: Manage doctor profiles
   - **Appointments**: View all appointments
   - **Analytics**: See system statistics

### Adding a New Doctor

1. **Go to Doctors Tab**
   - Click **"Doctors"** tab in admin dashboard

2. **Click "Add Doctor"**
   - Green button with **"➕ Add Doctor"** icon

3. **Fill Doctor Information**
   - **Name**: Doctor's full name
   - **Email**: Contact email
   - **Phone**: Phone number
   - **Specialization**: Select from dropdown:
     - General Physician
     - Pediatrician
     - Infectious Disease Specialist
     - Pulmonologist
     - Internal Medicine Doctor
     - Emergency Care Specialist
   - **Experience**: Years of experience (number)
   - **Qualifications**: Comma-separated (e.g., "MBBS, MD, PhD")

4. **Save Doctor**
   - Click **"Save"** button
   - Doctor is added to the system
   - Default working hours: Monday-Friday, 9 AM - 5 PM

### Managing Doctors

1. **View All Doctors**
   - See all doctors in grid layout
   - Each card shows name and specialization

2. **Edit Doctor**
   - Click **"✏️ Edit"** button on doctor card
   - Modify information
   - Save changes

3. **Deactivate Doctor**
   - Click **"🗑️ Delete"** (trash icon)
   - Confirm deactivation
   - Doctor is soft-deleted (isActive = false)
   - Doctor won't appear in patient searches

### Viewing Appointments

1. **Go to Appointments Tab**
   - Click **"Appointments"** tab
   - See all appointments across the system

2. **View Details**
   - Each appointment shows:
     - Patient name
     - Doctor name
     - Date and time
     - Status

### Viewing Analytics

1. **Go to Analytics Tab**
   - Click **"Analytics"** tab
   - See statistics:
     - Total appointments
     - High-fever-triggered bookings
     - Appointments by status
     - Appointments by specialization

---

## 🔧 Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
# Make sure .env has:
# - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
# - FIREBASE_DATABASE_URL
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
# Make sure .env has Firebase config:
# - VITE_FIREBASE_API_KEY
# - VITE_FIREBASE_AUTH_DOMAIN
# - VITE_FIREBASE_PROJECT_ID
# - etc.
npm run dev
```

### 3. Firebase Configuration

#### Set User Roles

To assign roles to users, update Firestore `users` collection:

```javascript
// For Patient (default)
{
  uid: "user-id",
  fullName: "John Doe",
  email: "john@example.com",
  role: "patient" // or omit (defaults to patient)
}

// For Doctor
{
  uid: "doctor-id",
  fullName: "Dr. Jane Smith",
  email: "doctor@example.com",
  role: "doctor"
}

// For Admin
{
  uid: "admin-id",
  fullName: "Admin User",
  email: "admin@example.com",
  role: "admin"
}
```

#### Deploy Firestore Rules

```bash
cd frontend
firebase deploy --only firestore:rules
```

Or manually update rules in Firebase Console:
- Go to Firestore Database → Rules
- Copy rules from `frontend/firestore.rules`

---

## 📱 Common Workflows

### Workflow 1: Patient Books Appointment After Fever Check

```
1. Patient runs fever check → High fever detected
2. Sees "Book a Doctor Now" button
3. Clicks button → Goes to doctor list
4. Selects doctor → Clicks "Book Appointment"
5. Chooses date/time → Selects reason
6. Submits booking → Gets confirmation
7. Views appointment in "My Appointments"
8. Waits for doctor to accept
```

### Workflow 2: Doctor Manages Appointments

```
1. Doctor logs in → Sees dashboard
2. Views pending requests
3. Reviews patient details and reason
4. Accepts or rejects appointment
5. Views today's appointments
6. After consultation → Marks as completed
```

### Workflow 3: Admin Adds New Doctor

```
1. Admin logs in → Goes to admin dashboard
2. Clicks "Doctors" tab
3. Clicks "Add Doctor"
4. Fills doctor information
5. Saves → Doctor appears in system
6. Patients can now book with this doctor
```

---

## 🐛 Troubleshooting

### Issue: "No doctors found"
**Solution:**
- Admin needs to add doctors first
- Check if doctors have `isActive: true`
- Verify Firestore `doctors` collection exists

### Issue: "No available slots"
**Solution:**
- Doctor's working hours may not be set
- All slots for that date may be booked
- Try selecting a different date

### Issue: "Unauthorized" error
**Solution:**
- Check Firebase authentication token
- Verify user role in Firestore `users` collection
- Make sure backend has correct Firebase Admin credentials

### Issue: Can't see appointment pages
**Solution:**
- Check if components are imported in `Home.jsx`
- Verify routes are added in `Home.jsx`
- Check browser console for errors

### Issue: Doctor dashboard not accessible
**Solution:**
- Verify user has `role: 'doctor'` in Firestore
- Check Firebase Auth token includes user ID
- Verify backend authentication middleware

---

## 📝 API Endpoints Reference

### Patient Endpoints
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/:id` - Get doctor details
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD` - Get available slots
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/patient/:id` - Get patient appointments
- `PATCH /api/appointments/:id/cancel` - Cancel appointment

### Doctor Endpoints
- `GET /api/appointments/doctor/:id` - Get doctor appointments
- `PATCH /api/appointments/:id/accept` - Accept appointment
- `PATCH /api/appointments/:id/reject` - Reject appointment
- `PATCH /api/appointments/:id/complete` - Complete appointment
- `POST /api/doctor/availability` - Set availability

### Admin Endpoints
- `POST /api/admin/add-doctor` - Add doctor
- `PUT /api/admin/edit-doctor/:id` - Edit doctor
- `DELETE /api/admin/delete-doctor/:id` - Deactivate doctor
- `GET /api/admin/appointments` - Get all appointments
- `GET /api/admin/doctors` - Get all doctors
- `GET /api/admin/analytics` - Get analytics

---

## 💡 Tips & Best Practices

1. **For Patients:**
   - Book appointments well in advance for better slot availability
   - Provide clear reason for visit to help doctors prepare
   - Check appointment status regularly

2. **For Doctors:**
   - Review pending requests daily
   - Accept/reject promptly to improve patient experience
   - Mark appointments as completed after consultation

3. **For Admins:**
   - Add doctors with complete information
   - Set appropriate working hours
   - Monitor analytics for system health

---

## 🎯 Next Steps

1. **Test the System:**
   - Create test users (patient, doctor, admin)
   - Add sample doctors
   - Book test appointments
   - Verify all workflows

2. **Customize:**
   - Adjust time slot intervals (currently 30 minutes)
   - Add more specializations
   - Customize working hours
   - Add profile photos for doctors

3. **Enhance:**
   - Add email/SMS notifications
   - Implement payment integration
   - Add video consultation
   - Create mobile app version

---

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify Firebase configuration
4. Check Firestore rules are deployed
5. Ensure all environment variables are set

---

**Happy Booking! 🎉**







