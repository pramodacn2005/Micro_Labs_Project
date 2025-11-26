// Prescription service for frontend API calls
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  return 'http://localhost:4000/api';
}

const API_BASE_URL = getApiBaseUrl();

// Helper to get auth token
async function getAuthToken() {
  try {
    const { getFirebaseAuth } = await import('./firebaseService.js');
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated. Please login again.');
    }
    
    const token = await user.getIdToken();
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    
    return token;
  } catch (error) {
    console.error('[Auth] Error getting token:', error);
    throw error;
  }
}

// Helper for API calls
async function apiCall(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.errors?.join(', ') || 'Request failed');
  }
  
  return data;
}

/**
 * Create a prescription
 */
export async function createPrescription(prescriptionData) {
  return apiCall('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(prescriptionData)
  });
}

/**
 * Get prescription by ID
 */
export async function getPrescription(prescriptionId) {
  return apiCall(`/prescriptions/${prescriptionId}`);
}

/**
 * Download prescription PDF
 */
export async function downloadPrescription(prescriptionId) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/prescriptions/${prescriptionId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download prescription');
  }

  const blob = await response.blob();
  return blob;
}

/**
 * Get patient prescriptions
 */
export async function getPatientPrescriptions(patientId) {
  return apiCall(`/prescriptions/patient/${patientId}`);
}

/**
 * Get doctor prescriptions
 */
export async function getDoctorPrescriptions(doctorId) {
  return apiCall(`/prescriptions/doctor/${doctorId}`);
}

