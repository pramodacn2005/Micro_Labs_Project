// Appointment service for frontend API calls
// Get API base URL from environment or use default
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  // Default to port 4000 (backend default)
  return 'http://localhost:4000/api';
}

const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API base URL (remove in production)
console.log('Appointment Service API Base URL:', API_BASE_URL);

// Helper to get auth token
async function getAuthToken() {
  try {
    const { getFirebaseAuth } = await import('./firebaseService.js');
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('[Auth] No current user found');
      throw new Error('User not authenticated. Please login again.');
    }
    
    console.log('[Auth] Getting token for user:', user.uid);
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
  let token;
  try {
    token = await getAuthToken();
  } catch (error) {
    console.error('[Appointment API] Failed to get auth token:', error);
    throw new Error('Authentication failed. Please login again.');
  }
  
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging
  console.log(`[Appointment API] ${options.method || 'GET'} ${fullUrl}`);
  console.log(`[Appointment API] Token present: ${token ? 'Yes' : 'No'}`);
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`[Appointment API Error] ${response.status} ${fullUrl}:`, errorData);
      
      // Provide more helpful error messages
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please logout and login again.');
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${errorData.message || 'Request failed'}`);
    }

    return response.json();
  } catch (error) {
    console.error(`[Appointment API] Request failed to ${fullUrl}:`, error);
    
    // Re-throw with more context
    if (error.message.includes('token')) {
      throw new Error('Authentication error. Please logout and login again.');
    }
    
    throw error;
  }
}

// ========== PATIENT API ==========

/**
 * Get list of doctors with optional filters
 */
export async function getDoctors(filters = {}) {
  const params = new URLSearchParams();
  if (filters.specialization) params.append('specialization', filters.specialization);
  if (filters.location) params.append('location', filters.location);
  if (filters.name) params.append('name', filters.name);
  if (filters.date) params.append('date', filters.date);

  const queryString = params.toString();
  return apiCall(`/doctors${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get doctor details by ID
 */
export async function getDoctorById(doctorId) {
  return apiCall(`/doctors/${doctorId}`);
}

/**
 * Get available time slots for a doctor on a specific date
 */
export async function getDoctorSlots(doctorId, date) {
  return apiCall(`/doctors/${doctorId}/slots?date=${date}`);
}

/**
 * Create a new appointment
 */
export async function createAppointment(appointmentData) {
  return apiCall('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
}

/**
 * Get patient's appointments
 */
export async function getPatientAppointments(patientId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);

  const queryString = params.toString();
  return apiCall(`/appointments/patient/${patientId}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(appointmentId) {
  return apiCall(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH'
  });
}

// ========== DOCTOR API ==========

/**
 * Get doctor's appointments
 * Note: doctorId can be Firebase UID - backend will find doctor by user_id or email
 */
export async function getDoctorAppointments(doctorId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);

  const queryString = params.toString();
  return apiCall(`/appointments/doctor/${doctorId}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Accept an appointment
 */
export async function acceptAppointment(appointmentId) {
  return apiCall(`/appointments/${appointmentId}/accept`, {
    method: 'PATCH'
  });
}

/**
 * Reject an appointment
 */
export async function rejectAppointment(appointmentId) {
  return apiCall(`/appointments/${appointmentId}/reject`, {
    method: 'PATCH'
  });
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(appointmentId) {
  return apiCall(`/appointments/${appointmentId}/complete`, {
    method: 'PATCH'
  });
}

/**
 * Set doctor availability
 */
export async function setDoctorAvailability(doctorId, availability) {
  return apiCall('/doctor/availability', {
    method: 'POST',
    body: JSON.stringify({ doctor_id: doctorId, availability })
  });
}

// ========== ADMIN API ==========

/**
 * Add a new doctor
 */
export async function addDoctor(doctorData) {
  return apiCall('/admin/add-doctor', {
    method: 'POST',
    body: JSON.stringify(doctorData)
  });
}

/**
 * Update doctor information
 */
export async function updateDoctor(doctorId, doctorData) {
  return apiCall(`/admin/edit-doctor/${doctorId}`, {
    method: 'PUT',
    body: JSON.stringify(doctorData)
  });
}

/**
 * Delete/deactivate a doctor
 */
export async function deleteDoctor(doctorId) {
  return apiCall(`/admin/delete-doctor/${doctorId}`, {
    method: 'DELETE'
  });
}

/**
 * Get all appointments (admin)
 */
export async function getAllAppointments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);

  const queryString = params.toString();
  return apiCall(`/admin/appointments${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get all doctors (admin)
 */
export async function getAllDoctors() {
  return apiCall('/admin/doctors');
}

/**
 * Get appointment analytics
 */
export async function getAnalytics() {
  return apiCall('/admin/analytics');
}

