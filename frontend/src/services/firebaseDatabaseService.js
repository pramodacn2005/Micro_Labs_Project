import { getFirebaseDb } from './firebaseService.js';
import { ref, push, set, get, remove, query, orderByChild, equalTo, limitToLast } from 'firebase/database';

const db = getFirebaseDb();

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Upload file to Firebase Database (as base64) and save metadata
export async function uploadFileToDatabase(file, userId, metadata = {}) {
  try {
    console.log('📤 Uploading file to Firebase Database...');
    
    // Convert file to base64
    const base64File = await fileToBase64(file);
    
    // Create unique ID
    const timestamp = Date.now();
    const fileId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare file metadata
    const fileMetadata = {
      id: fileId,
      documentName: file.name,
      fileName: file.name,
      documentType: metadata.documentType || 'other',
      fileType: file.type,
      fileSize: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      uploadedDate: new Date().toISOString(),
      date: new Date().toISOString(),
      uploadedBy: metadata.uploadedBy || 'Patient',
      doctorName: metadata.doctorName || '',
      patientName: metadata.patientName || 'Unknown',
      description: metadata.description || '',
      base64Data: base64File,
      isBase64: true,
      userId: userId,
      ...metadata
    };
    
    // Save to Firebase Database
    const prescriptionsRef = ref(db, `prescriptions/${userId}`);
    const newPrescriptionRef = push(prescriptionsRef);
    await set(newPrescriptionRef, fileMetadata);
    
    console.log('✅ File uploaded to Firebase Database successfully');
    
    return {
      success: true,
      file: { ...fileMetadata, id: newPrescriptionRef.key },
      message: 'File uploaded successfully!'
    };
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get all prescriptions for a specific user
export async function getUserPrescriptions(userId, filters = {}) {
  try {
    console.log('📖 Fetching prescriptions from Firebase Database...');
    
    const prescriptionsRef = ref(db, `prescriptions/${userId}`);
    const snapshot = await get(prescriptionsRef);
    
    if (!snapshot.exists()) {
      console.log('📭 No prescriptions found for user');
      return {
        success: true,
        files: []
      };
    }
    
    let prescriptions = [];
    const data = snapshot.val();
    
    // Convert to array and sort by date
    Object.entries(data).forEach(([key, value]) => {
      prescriptions.push({
        id: key,
        ...value,
        uploadedDate: new Date(value.uploadedDate || value.date)
      });
    });
    
    // Sort by upload date (newest first)
    prescriptions.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      const typeFilter = filters.type.toLowerCase();
      prescriptions = prescriptions.filter(prescription => {
        if (typeFilter === 'pdf') {
          return prescription.fileType === 'application/pdf' || prescription.fileType === 'PDF';
        } else if (typeFilter === 'image') {
          return prescription.fileType?.startsWith('image/');
        }
        return true;
      });
    }
    
    if (filters.documentType && filters.documentType !== 'all') {
      prescriptions = prescriptions.filter(prescription => 
        prescription.documentType === filters.documentType
      );
    }
    
    if (filters.doctor && filters.doctor !== 'all') {
      prescriptions = prescriptions.filter(prescription => 
        prescription.doctorName && 
        prescription.doctorName.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    
    if (filters.date && filters.date !== 'all') {
      const now = new Date();
      let filterDate;
      
      switch (filters.date) {
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
        prescriptions = prescriptions.filter(prescription => 
          new Date(prescription.uploadedDate) >= filterDate
        );
      }
    }
    
    console.log(`✅ Found ${prescriptions.length} prescriptions`);
    
    return {
      success: true,
      files: prescriptions
    };
    
  } catch (error) {
    console.error('❌ Get prescriptions error:', error);
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
}

// Delete a prescription
export async function deletePrescription(prescriptionId, userId) {
  try {
    console.log('🗑️ Deleting prescription from Firebase Database...');
    
    const prescriptionRef = ref(db, `prescriptions/${userId}/${prescriptionId}`);
    await remove(prescriptionRef);
    
    console.log('✅ Prescription deleted successfully');
    
    return {
      success: true,
      message: 'Prescription deleted successfully!'
    };
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get file icon based on type
export function getFileIcon(fileType) {
  if (fileType === 'application/pdf') return '📄';
  if (fileType?.startsWith('image/')) return '🖼️';
  if (fileType?.includes('word')) return '📝';
  if (fileType?.includes('excel')) return '📊';
  if (fileType?.includes('powerpoint')) return '📊';
  return '📁';
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Test Firebase Database connection
export async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing Firebase Database connection...');
    
    const testRef = ref(db, 'test_connection');
    const testData = {
      timestamp: Date.now(),
      message: 'Database connection test successful',
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    await set(testRef, testData);
    console.log('✅ Firebase Database connection successful');
    
    // Clean up test data
    await remove(testRef);
    
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message };
  }
}
