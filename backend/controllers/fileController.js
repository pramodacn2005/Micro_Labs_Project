import express from "express";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { admin, db } from "../services/firebaseAdminService.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Get Firebase Storage instance
// Use the centralized Firebase Admin instance
let storage;
let storageBucket;

try {
  // Get storage bucket name from env or use default based on project ID
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                             path.join(process.cwd(), "config", "serviceAccountKey.json");
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    // Use explicit bucket name: project-id.appspot.com
    storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
  } else {
    // Fallback if service account not found
    storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "ai-healthcare-robot.appspot.com";
  }

  storage = getStorage(admin.app());
  console.log(`[File Controller] Using storage bucket: ${storageBucket}`);
} catch (error) {
  console.error("[File Controller] Firebase Storage initialization error:", error);
  throw error;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'), false);
    }
  }
});

// Upload file endpoint
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { patientName, uploadedBy, description } = req.body;
    
    if (!patientName) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const fileName = file.originalname;
      const fileType = file.mimetype === 'application/pdf' ? 'PDF' : 'Image';
      const fileSize = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      
      // Create Firebase Storage reference with explicit bucket name
      const bucket = storage.bucket(storageBucket);
      const fileRef = bucket.file(`patient-files/${patientName.replace(/\s+/g, '_')}/${fileId}_${fileName}`);
      
      // Upload file to Firebase Storage
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            patientName,
            uploadedBy: uploadedBy || 'Patient',
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Get download URL
      const [downloadUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future date
      });

      // Store metadata in Firestore
      const fileMetadata = {
        id: fileId,
        fileName,
        fileType,
        fileSize,
        uploadedDate: new Date(),
        uploadedBy: uploadedBy || 'Patient',
        patientName,
        description: description || '',
        downloadUrl,
        viewUrl: downloadUrl,
        storagePath: `patient-files/${patientName.replace(/\s+/g, '_')}/${fileId}_${fileName}`
      };

      await db.collection('patient-files').doc(fileId).set(fileMetadata);
      
      uploadedFiles.push(fileMetadata);
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to upload files';
    let helpMessage = null;
    
    if (error.code === 404 || error.message.includes('does not exist') || error.message.includes('bucket')) {
      errorMessage = 'Firebase Storage bucket does not exist. Firebase Storage may not be enabled.';
      helpMessage = 'See ENABLE_FIREBASE_STORAGE.md for instructions to enable Firebase Storage.';
      console.error('❌ Storage bucket not found:', storageBucket);
      console.error('💡 Enable Firebase Storage: https://console.firebase.google.com/project/ai-healthcare-robot/storage');
    } else if (error.code === 403 || error.message.includes('permission')) {
      errorMessage = 'Permission denied. Service account may not have Storage Admin role.';
      helpMessage = 'Grant Storage Admin role to the service account in Google Cloud Console.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      help: helpMessage,
      bucket: storageBucket
    });
  }
});

// Get files for a patient
router.get('/patient/:patientName', async (req, res) => {
  try {
    const { patientName } = req.params;
    const { type, date } = req.query;

    let query = db.collection('patient-files').where('patientName', '==', patientName);

    // Apply filters
    if (type && type !== 'all') {
      query = query.where('fileType', '==', type.toUpperCase());
    }

    const snapshot = await query.orderBy('uploadedDate', 'desc').get();
    let files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedDate: doc.data().uploadedDate.toDate()
    }));

    // Apply date filter
    if (date && date !== 'all') {
      const now = new Date();
      let filterDate;
      
      switch (date) {
        case 'today':
          filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        files = files.filter(file => file.uploadedDate >= filterDate);
      }
    }

    res.json({
      success: true,
      files
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve files',
      details: error.message 
    });
  }
});

// Delete file endpoint
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const fileDoc = await db.collection('patient-files').doc(fileId).get();
    
    if (!fileDoc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Delete from Firebase Storage
    const bucket = storage.bucket(storageBucket);
    const fileRef = bucket.file(fileData.storagePath);
    
    try {
      await fileRef.delete();
    } catch (storageError) {
      console.warn('Storage deletion warning:', storageError.message);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from Firestore
    await db.collection('patient-files').doc(fileId).delete();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});

// Get file download URL
router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileDoc = await db.collection('patient-files').doc(fileId).get();
    
    if (!fileDoc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Generate new signed URL
    const bucket = storage.bucket(storageBucket);
    const fileRef = bucket.file(fileData.storagePath);
    
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    res.json({
      success: true,
      downloadUrl,
      fileName: fileData.fileName
    });

  } catch (error) {
    console.error('Download URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate download URL',
      details: error.message 
    });
  }
});

export default router;
