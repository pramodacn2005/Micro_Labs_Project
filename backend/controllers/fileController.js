import express from "express";
import multer from "multer";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

const router = express.Router();

// Initialize Firebase Admin
let app;
let storage;
let db;

try {
  // Check if Firebase app already exists
  const existingApps = getApps();
  if (existingApps.length === 0) {
    // Load service account key
    const serviceAccount = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "config", "serviceAccountKey.json"), "utf8")
    );

    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com"
    });
  } else {
    app = existingApps[0];
  }

  storage = getStorage(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
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

    const { patientName, uploadedBy } = req.body;
    
    if (!patientName) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const fileName = file.originalname;
      const fileType = file.mimetype === 'application/pdf' ? 'PDF' : 'Image';
      const fileSize = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      
      // Create Firebase Storage reference
      const bucket = storage.bucket();
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
    res.status(500).json({ 
      error: 'Failed to upload files',
      details: error.message 
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
    const bucket = storage.bucket();
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
    const bucket = storage.bucket();
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
