# Backend API for History Section

This backend provides API endpoints for the History section of the patient portal.

## Features

- File upload (PDF and images)
- File retrieval with filtering
- File download and viewing
- File deletion
- Patient-specific file management

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### File Management
- `POST /api/files/upload` - Upload files
  - Body: FormData with files, patientName, uploadedBy
  - Returns: List of uploaded files with metadata

- `GET /api/files/patient/:patientName` - Get files for a patient
  - Query params: type (pdf/image/all), date (today/week/month/all)
  - Returns: List of files with metadata

- `DELETE /api/files/:fileId` - Delete a file
  - Returns: Success message

- `GET /api/files/download/:fileId` - Download a file
  - Returns: File content with appropriate headers

- `GET /api/files/view/:fileId` - View a file in browser
  - Returns: File content with inline display headers

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run dev
```

The server will run on http://localhost:3000

## File Storage

Currently using in-memory storage for demonstration purposes. In production, this would be replaced with:
- Firebase Storage for file storage
- Firestore for metadata storage

## File Types Supported

- PDF files (application/pdf)
- Image files (image/jpeg, image/jpg, image/png, image/gif)
- Maximum file size: 10MB per file

## Testing

Run the test script to verify endpoints:
```bash
node test-api.js
```

## CORS

The API is configured to accept requests from any origin for development. In production, configure the CORS_ORIGIN environment variable.
