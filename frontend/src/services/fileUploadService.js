import { getFirebaseStorage, getFirestore } from './firebaseService';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';

const storage = getFirebaseStorage();
const firestore = getFirestore();

// Get backend API URL
function getBackendApiUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  return 'http://localhost:4000/api';
}

// Check if backend is accessible
async function checkBackendHealth() {
  try {
    const backendUrl = getBackendApiUrl();
    const baseUrl = backendUrl.replace('/api', '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper function to get download URL with retry logic
async function getDownloadURLWithRetry(storageRef, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Upload file to Firebase Storage and save metadata to Firestore
export async function uploadFile(file, userId, metadata = {}) {
  try {
    // Create a unique file name
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    let storagePath = `patient-files/${userId}/${fileName}`;
    
    // Convert file to base64 for storage in Firestore as fallback
    const base64File = await fileToBase64(file);
    
    // Try backend API first (bypasses CORS issues)
    let downloadURL = null;
    let storageSuccess = false;
    
    // Try backend API first since CORS is blocking direct Firebase Storage uploads
    try {
      const backendUrl = getBackendApiUrl();
      console.log('📤 Uploading via backend API (bypasses CORS):', backendUrl);
      
      // Quick health check (non-blocking)
      const isBackendHealthy = await checkBackendHealth();
      if (!isBackendHealthy) {
        console.warn('⚠️ Backend health check failed. Backend might not be running.');
        console.warn('💡 Make sure backend is running: cd backend && npm start');
        throw new Error('Backend is not accessible. Please ensure backend server is running on port 4000.');
      }
      
      const formData = new FormData();
      formData.append('files', file);
      formData.append('patientName', metadata.patientName || userId || 'Unknown');
      formData.append('uploadedBy', metadata.uploadedBy || 'Patient');
      formData.append('description', metadata.description || '');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${backendUrl}/files/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend upload response error:', response.status, errorText);
        throw new Error(`Backend upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Backend upload result:', result);
      
      if (result.success && result.files && result.files.length > 0) {
        const uploadedFile = result.files[0];
        downloadURL = uploadedFile.downloadUrl || uploadedFile.downloadURL || uploadedFile.viewUrl;
        storageSuccess = true;
        storagePath = uploadedFile.storagePath;
        console.log('✅ File uploaded via backend API successfully');
        
        // Return the file metadata from backend (it's already saved to Firestore)
        // Backend uses 'id' as the Firestore document ID
        return {
          success: true,
          file: {
            id: uploadedFile.id, // Firestore document ID
            documentName: uploadedFile.fileName || file.name,
            fileName: uploadedFile.fileName || file.name,
            downloadURL: downloadURL,
            viewUrl: downloadURL,
            downloadUrl: downloadURL, // Keep for compatibility
            storagePath: storagePath,
            fileType: uploadedFile.fileType || file.type,
            fileSize: uploadedFile.fileSize,
            uploadedDate: uploadedFile.uploadedDate ? new Date(uploadedFile.uploadedDate) : new Date(),
            date: uploadedFile.uploadedDate ? new Date(uploadedFile.uploadedDate) : new Date(),
            uploadedBy: uploadedFile.uploadedBy || metadata.uploadedBy || 'Patient',
            doctorName: metadata.doctorName || '',
            patientName: uploadedFile.patientName || metadata.patientName || 'Unknown',
            description: uploadedFile.description || metadata.description || '',
            userId,
            documentType: metadata.documentType || 'other',
            isBase64: false,
            ...metadata
          },
          message: 'File uploaded successfully!'
        };
      } else {
        throw new Error('Backend upload returned unsuccessful response');
      }
    } catch (backendError) {
      console.warn('⚠️ Backend API upload failed:', backendError);
      console.warn('Error details:', backendError.message);
      
      // If backend fails, try direct Firebase Storage as fallback
      console.warn('🔄 Trying direct Firebase Storage upload as fallback...');
      
      try {
        const storageRef = ref(storage, storagePath);
        
        // Add timeout wrapper for Firebase upload
        const uploadPromise = uploadBytes(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            'Content-Type': file.type,
            'Cache-Control': 'public, max-age=31536000',
            'Original-File-Type': file.type
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 10000)
        );
        
        const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
        
        // Get download URL with retry logic
        downloadURL = await getDownloadURLWithRetry(uploadResult.ref);
        storageSuccess = true;
        console.log('✅ File uploaded to Firebase Storage successfully');
      } catch (storageError) {
        console.warn('⚠️ Firebase Storage upload also failed:', storageError);
        console.warn('🔄 Falling back to base64 storage');
        console.warn('💡 To fix CORS permanently, run: gsutil cors set cors.json gs://ai-healthcare-robot.firebasestorage.app');
        console.warn('💡 Make sure backend is running on port 4000');
        
        // Use base64 data URL as final fallback
        downloadURL = base64File;
      }
    }
    
    // Prepare file metadata
    const fileMetadata = {
      id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      documentName: file.name, // Original file name
      fileName: file.name, // Keep for backward compatibility
      documentType: metadata.documentType || 'other',
      fileType: file.type,
      fileSize: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      uploadedDate: new Date(),
      date: new Date(), // Timestamp for easy querying
      uploadedBy: metadata.uploadedBy || 'Patient',
      doctorName: metadata.doctorName || '',
      patientName: metadata.patientName || 'Unknown',
      description: metadata.description || '',
      downloadURL,
      viewUrl: downloadURL,
      storagePath: storageSuccess ? storagePath : null,
      userId,
      isBase64: !storageSuccess,
      base64Data: !storageSuccess ? base64File : null,
      ...metadata
    };
    
    // Save metadata to Firestore
    const docRef = await addDoc(collection(firestore, 'patient-files'), fileMetadata);
    
    return {
      success: true,
      file: { ...fileMetadata, id: docRef.id },
      message: 'File uploaded successfully!'
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Get all files for a specific user
export async function getUserFiles(userId, filters = {}) {
  try {
    // Simple query without orderBy to avoid composite index requirement
    let q = query(
      collection(firestore, 'patient-files'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    let files = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedDate: doc.data().uploadedDate?.toDate ? doc.data().uploadedDate.toDate() : new Date(doc.data().uploadedDate)
    }));
    
    // Sort by upload date on client side
    files.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));
    
    // Apply type filter on client side
    if (filters.type && filters.type !== 'all') {
      const typeFilter = filters.type.toLowerCase();
      files = files.filter(file => {
        if (typeFilter === 'pdf') {
          return file.fileType === 'application/pdf' || file.fileType === 'PDF';
        } else if (typeFilter === 'image') {
          return file.fileType?.startsWith('image/');
        }
        return true;
      });
    }
    
    // Apply document type filter on client side
    if (filters.documentType && filters.documentType !== 'all') {
      files = files.filter(file => file.documentType === filters.documentType);
    }
    
    // Apply doctor filter on client side
    if (filters.doctor && filters.doctor !== 'all') {
      files = files.filter(file => 
        file.doctorName && file.doctorName.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    
    // Apply date filter on client side
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
        files = files.filter(file => new Date(file.uploadedDate) >= filterDate);
      }
    }
    
    return {
      success: true,
      files
    };
    
  } catch (error) {
    console.error('Get files error:', error);
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
}

// Delete file from both Storage and Firestore
export async function deleteFile(fileId, storagePath) {
  try {
    // Delete from Firebase Storage (only if it was stored there)
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        console.log('✅ File deleted from Firebase Storage');
      } catch (storageError) {
        console.warn('⚠️ Could not delete from Firebase Storage (file might be base64):', storageError.message);
        // Continue with Firestore deletion even if Storage deletion fails
      }
    }
    
    // Delete from Firestore
    await deleteDoc(doc(firestore, 'patient-files', fileId));
    console.log('✅ File metadata deleted from Firestore');
    
    return {
      success: true,
      message: 'File deleted successfully!'
    };
    
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get file download URL (refresh if needed)
export async function getFileDownloadURL(storagePath) {
  try {
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);
    return {
      success: true,
      downloadURL
    };
  } catch (error) {
    console.error('Get download URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative download method that opens in new tab
export function downloadFileDirect(file) {
  try {
    const link = document.createElement('a');
    
    // Handle base64 files differently
    if (file.isBase64 && file.base64Data) {
      link.href = file.base64Data;
    } else {
      // For Firebase Storage URLs, try to handle CORS issues
      const url = file.downloadURL || file.viewUrl;
      if (url && url.includes('firebasestorage.googleapis.com')) {
        // Add CORS-friendly parameters
        const urlObj = new URL(url);
        urlObj.searchParams.set('alt', 'media');
        link.href = urlObj.toString();
      } else {
        link.href = url;
      }
    }
    
    link.download = file.documentName || file.fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  } catch (error) {
    console.error('Direct download error:', error);
    return { success: false, error: error.message };
  }
}

// Download file as blob (for base64 files)
export function downloadFileAsBlob(file) {
  try {
    if (file.isBase64 && file.base64Data) {
      // Convert base64 to blob
      const byteCharacters = atob(file.base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.fileType });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } else {
      // Use direct download for Firebase Storage URLs
      return downloadFileDirect(file);
    }
  } catch (error) {
    console.error('Blob download error:', error);
    return { success: false, error: error.message };
  }
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file icon based on type
export function getFileIcon(fileType) {
  if (fileType === 'application/pdf') return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel')) return '📊';
  if (fileType.includes('powerpoint')) return '📊';
  return '📁';
}

// Test Firebase connection
export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore connection
    const testDoc = await addDoc(collection(firestore, 'test'), {
      timestamp: new Date(),
      test: true
    });
    
    console.log('✅ Firestore connection successful');
    
    // Clean up test document
    await deleteDoc(testDoc);
    
    return { success: true, message: 'Firebase connection successful' };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, error: error.message };
  }
}
