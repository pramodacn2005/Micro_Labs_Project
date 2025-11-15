import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

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

// In-memory storage for demo purposes
let fileStorage = [
  {
    id: "demo_1",
    fileName: "Prescription_Jan_2024.pdf",
    fileType: "PDF",
    uploadedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    uploadedBy: "Dr. Sarah Wilson",
    fileSize: "2.3 MB",
    patientName: "Vish",
    description: "Prescription for diabetes medication and blood pressure control",
    downloadUrl: "http://localhost:4000/api/files/download/demo_1",
    viewUrl: "http://localhost:4000/api/files/view/demo_1",
    storagePath: "uploads/demo_1_Prescription_Jan_2024.pdf",
    buffer: Buffer.from("Mock PDF content for demonstration")
  },
  {
    id: "demo_2",
    fileName: "Lab_Report_Blood_Test.png",
    fileType: "Image",
    uploadedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    uploadedBy: "Patient",
    fileSize: "1.8 MB",
    patientName: "Vish",
    description: "Complete blood count and lipid profile results",
    downloadUrl: "http://localhost:4000/api/files/download/demo_2",
    viewUrl: "http://localhost:4000/api/files/view/demo_2",
    storagePath: "uploads/demo_2_Lab_Report_Blood_Test.png",
    buffer: Buffer.from("Mock image content for demonstration")
  }
];

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
      
      // Create file metadata
      const fileMetadata = {
        id: fileId,
        fileName,
        fileType,
        fileSize,
        uploadedDate: new Date(),
        uploadedBy: uploadedBy || 'Patient',
        patientName,
        description: description || '',
        downloadUrl: `http://localhost:4000/api/files/download/${fileId}`,
        viewUrl: `http://localhost:4000/api/files/view/${fileId}`,
        storagePath: `uploads/${fileId}_${fileName}`,
        buffer: file.buffer // Store file buffer in memory for demo
      };

      // Store in memory
      fileStorage.push(fileMetadata);
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

    let files = fileStorage.filter(file => file.patientName === patientName);

    // Apply type filter
    if (type && type !== 'all') {
      files = files.filter(file => file.fileType.toLowerCase() === type.toLowerCase());
    }

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
        files = files.filter(file => new Date(file.uploadedDate) >= filterDate);
      }
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));

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

    const fileIndex = fileStorage.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Remove from memory storage
    fileStorage.splice(fileIndex, 1);

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

// Download file endpoint
router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = fileStorage.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', file.fileType === 'PDF' ? 'application/pdf' : 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to download file',
      details: error.message 
    });
  }
});

// View file endpoint
router.get('/view/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = fileStorage.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const contentType = file.fileType === 'PDF' ? 'application/pdf' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    res.send(file.buffer);

  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ 
      error: 'Failed to view file',
      details: error.message 
    });
  }
});

export default router;
