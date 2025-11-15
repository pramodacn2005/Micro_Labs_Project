# AI Healthcare Robot - Patient Health Monitoring System

A comprehensive healthcare monitoring platform with real-time vital signs tracking, fever symptom analysis using ML, appointment management, and AI-powered clinical assistance.

## 🚀 Features

### Core Features
- **Real-time Vital Monitoring**: Live tracking of heart rate, SpO₂, body temperature, and more
- **Fever Symptoms Checker**: ML-powered fever classification with clinical guidance
- **AI Clinical Assistant**: Intelligent fever type classification (Viral, Bacterial, Dengue, Typhoid, Malaria, COVID/Flu, Heat Stroke)
- **Appointment Management**: Complete appointment booking system for patients and doctors
- **Live Monitoring Dashboard**: Real-time charts and data visualization
- **Medicine Reminder**: Medication tracking and reminders
- **PDF Reports**: Encrypted PDF reports with fever analysis
- **Hospital Finder**: Nearby hospital lookup with directions
- **Multi-role Support**: Patient, Doctor, and Admin dashboards

### Technical Features
- **ML Model**: RandomForest classifier for fever prediction with SHAP explainability
- **Encryption**: AES-256-GCM encryption for PHI and reports
- **Real-time Updates**: Firebase Realtime Database integration
- **Responsive Design**: Mobile, tablet, and desktop support
- **Accessibility**: WCAG 2.1 AA compliant

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **Python** (3.8 or higher)
- **npm** (comes with Node.js)
- **Firebase Account** (for authentication and database)
- **Git** (for cloning the repository)

### Optional but Recommended
- **Google Places API Key** (for enhanced hospital lookup)
- **OpenAI API Key** (for AI assistant features)
- **Twilio Account** (for SMS alerts)
- **Email Service** (for email notifications)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd project-root
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Install Python ML Dependencies

```bash
cd ../ml
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

## ⚙️ Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./config/serviceAccountKey.json
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com

# Encryption (Required for production)
PHI_ENCRYPTION_KEY=your-32-character-encryption-key-here-minimum

# Public URL (for PDF links)
PUBLIC_BASE_URL=http://localhost:4000

# Google Places API (Optional - for hospital lookup)
GOGLE_PLACES_API_KEY=your_google_places_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# AI Services (Optional)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Model Training (Optional)
MODEL_ADMIN_TOKEN=your_secure_token_here

# Python Path (Optional - defaults to 'python')
PYTHON_PATH=python

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS Configuration (Optional - Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory (or copy from `env.example`):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend URL
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api
```

### Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Enable Realtime Database
   - Enable Firestore Database
   - Enable Storage

2. **Get Firebase Config**:
   - Go to Project Settings → General
   - Copy your Firebase config values
   - Add them to `frontend/.env`

3. **Download Service Account Key**:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `backend/config/serviceAccountKey.json`
   - Also copy to `frontend/src/config/serviceAccountKey.json` (if needed)

4. **Set up Realtime Database Rules**:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```

5. **Set up Firestore Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## 🚀 Running the Project

### Development Mode

#### 1. Start the Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

The backend will run on `http://localhost:4000`

#### 2. Start the Frontend Development Server

Open a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

#### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000/api
- **Health Check**: http://localhost:4000/api/health

### Production Build

#### Build Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

#### Run Backend in Production

```bash
cd backend
NODE_ENV=production npm start
```

## 📁 Project Structure

```
project-root/
├── backend/                 # Express.js backend server
│   ├── controllers/        # Route controllers
│   ├── services/           # Business logic services
│   ├── routes/             # API routes
│   ├── config/             # Configuration files
│   ├── models/             # ML model artifacts
│   ├── storage/             # File storage
│   ├── scripts/             # Utility scripts
│   └── app.js              # Main server file
│
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   └── config/         # Frontend config
│   └── public/             # Static assets
│
├── ml/                      # Machine Learning scripts
│   ├── scripts/            # Python ML scripts
│   ├── data/               # Training datasets
│   └── requirements.txt    # Python dependencies
│
└── README.md              # This file
```

## 🔌 API Endpoints

### Fever Checker

- `POST /api/fever-check` - Submit fever symptoms and get ML prediction
- `GET /api/reports/:reportId?sessionId=` - Download encrypted PDF report
- `POST /api/ai-assistant/:sessionId/message` - Chat with AI assistant
- `POST /api/model/train` - Retrain ML model (protected)

### Clinical Assessment

- `POST /api/clinical-assessment` - Comprehensive clinical fever assessment

### Appointments

- `GET /api/appointments/doctors` - Get all doctors
- `GET /api/appointments/doctors/:id` - Get doctor details
- `POST /api/appointments/appointments` - Book appointment
- `GET /api/appointments/appointments/patient/:id` - Get patient appointments
- `GET /api/appointments/appointments/doctor/:id` - Get doctor appointments

### Vitals

- `GET /api/vitals/latest` - Get latest vitals
- `GET /api/vitals/history` - Get vitals history
- `GET /api/vitals/alerts` - Get vital alerts

### Files

- `POST /api/files/upload` - Upload medical files
- `GET /api/files/:fileId` - Download file

### Health Check

- `GET /api/health` - Server health status

## 🧪 Testing

### Test Backend

```bash
cd backend
npm test
```

### Test Fever Model

```bash
cd backend
npm run test:fever
```

### Test ML Model Accuracy

```bash
cd backend
npm run check:accuracy
```

### Run Demo Test Data

```bash
cd backend
node scripts/test-demo-data.js
```

## 🎯 Key Features Guide

### Fever Symptoms Checker

1. Navigate to "Fever Checker" in the sidebar
2. Fill in patient demographics, vital signs, and symptoms
3. Click "Load Demo Data" button for quick testing
4. Submit the form to get ML prediction
5. View prediction results with confidence scores
6. Download encrypted PDF report
7. Chat with AI assistant for guidance

### Live Monitoring

1. Navigate to "Live Monitoring" in the sidebar
2. View real-time vital signs charts
3. Adjust timeframe (5 min, 15 min, 30 min, etc.)
4. Monitor alerts and status indicators

### Appointment Booking

1. Navigate to "Find Doctors"
2. Select a doctor
3. Choose date and time slot
4. Upload medical reports (optional)
5. Book appointment

### Doctor Dashboard

1. Login as doctor
2. View pending appointments
3. Accept/reject appointments
4. Monitor patient vitals
5. Access live monitoring

## 🐛 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in backend/.env or kill the process
# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:4000 | xargs kill
```

**Python not found:**
- Ensure Python is installed and in PATH
- Set `PYTHON_PATH` in `.env` to full path

**Firebase connection errors:**
- Verify `serviceAccountKey.json` is in `backend/config/`
- Check Firebase project ID matches in `.env`
- Ensure Firebase services are enabled

### Frontend Issues

**CORS errors:**
- Ensure backend `CORS_ORIGIN` includes frontend URL
- Check backend is running

**Firebase auth errors:**
- Verify Firebase config in `frontend/.env`
- Check Firebase Authentication is enabled
- Verify email/password provider is enabled

**Build errors:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be ≥18)

### ML Model Issues

**Model not found:**
- The model will auto-train on first use
- Or manually train: `cd ml && python scripts/train_fever_model.py`

**Python dependencies:**
- Ensure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

## 📚 Additional Documentation

- [Backend README](backend/README.md) - Detailed backend documentation
- [Frontend README](frontend/README.md) - Frontend component documentation
- [ML README](ml/README.md) - Machine learning documentation
- [Demo Test Data](backend/DEMO_TEST_DATA_QUICK_REFERENCE.md) - Test data reference

## 🔒 Security Notes

- **Never commit** `.env` files or `serviceAccountKey.json` to version control
- Use strong `PHI_ENCRYPTION_KEY` in production (32+ characters)
- Enable HTTPS in production
- Regularly update dependencies
- Review Firebase security rules
- Keep API keys secure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review the documentation in subdirectories
- Open an issue on GitHub

## 🎉 Quick Start Summary

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../ml && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# 2. Set up environment variables
# Copy .env.example files and fill in your values

# 3. Set up Firebase
# Create project, download serviceAccountKey.json, configure .env files

# 4. Run the application
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev

# 5. Open http://localhost:5173 in your browser
```

---

**Happy Coding! 🚀**

