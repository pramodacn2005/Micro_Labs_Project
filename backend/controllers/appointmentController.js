// Appointment controller for handling appointment-related API requests
import * as appointmentService from '../services/appointmentService.js';
import { db, admin } from '../services/firebaseAdminService.js';

// Middleware to verify Firebase token and get user with role
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Auth] No authorization header found');
    throw new Error('No authorization token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token || token.trim() === '') {
    console.error('[Auth] Empty token provided');
    throw new Error('No authorization token provided');
  }

  try {
    console.log('[Auth] Verifying token...');
    console.log('[Auth] Token length:', token.length);
    console.log('[Auth] Token preview:', token.substring(0, 20) + '...');
    
    // Check if admin is initialized
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token, true); // Check revoked tokens
    console.log('[Auth] Token verified for user:', decodedToken.uid);
    console.log('[Auth] Token project ID:', decodedToken.project_id);
    
    // Fetch user role from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let role = 'patient'; // Default role
    if (userDoc.exists) {
      const userData = userDoc.data();
      role = userData.role || 'patient';
      console.log('[Auth] User role:', role);
    } else {
      console.log('[Auth] User document not found in Firestore, using default role: patient');
    }
    
    return {
      ...decodedToken,
      role // Add role to decoded token
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    console.error('[Auth] Error code:', error.code);
    console.error('[Auth] Error details:', error);
    throw new Error(`Invalid or expired token: ${error.message}`);
  }
}

// ========== PATIENT ENDPOINTS ==========

/**
 * GET /doctors - Get list of available doctors with filters
 */
export async function getDoctors(req, res) {
  try {
    const filters = {
      specialization: req.query.specialization,
      location: req.query.location,
      name: req.query.name,
      date: req.query.date
    };

    const doctors = await appointmentService.getDoctors(filters);
    res.json({ success: true, doctors });
  } catch (error) {
    console.error('Error in getDoctors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /doctors/:id - Get doctor details
 */
export async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const doctor = await appointmentService.getDoctorById(id);
    
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    console.error('Error in getDoctorById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /doctors/:id/slots - Get available time slots for a doctor on a date
 */
export async function getDoctorSlots(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date parameter is required' });
    }

    const slots = await appointmentService.getAvailableSlots(id, date);
    res.json({ success: true, slots });
  } catch (error) {
    console.error('Error in getDoctorSlots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /appointments - Create a new appointment
 */
export async function createAppointment(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const patientId = decodedToken.uid;

    const { doctor_id, date, time_slot, reason } = req.body;

    if (!doctor_id || !date || !time_slot) {
      return res.status(400).json({ 
        success: false, 
        error: 'doctor_id, date, and time_slot are required' 
      });
    }

    const appointment = await appointmentService.createAppointment({
      patient_id: patientId,
      doctor_id,
      date,
      time_slot,
      reason: reason || ''
    });

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error('Error in createAppointment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /appointments/patient/:id - Get patient's appointments
 */
export async function getPatientAppointments(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    // Verify patient can only access their own appointments
    if (decodedToken.uid !== id && decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const filters = {
      status: req.query.status
    };

    const appointments = await appointmentService.getPatientAppointments(id, filters);
    res.json({ success: true, appointments });
  } catch (error) {
    console.error('Error in getPatientAppointments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /appointments/:id/cancel - Cancel an appointment
 */
export async function cancelAppointment(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Verify patient can only cancel their own appointments
    if (appointment.patient_id !== decodedToken.uid && decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Only allow cancellation if status is pending
    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending appointments can be cancelled' 
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id, 
      'cancelled', 
      decodedToken.uid
    );

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error in cancelAppointment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ========== DOCTOR ENDPOINTS ==========

/**
 * GET /appointments/doctor/:id - Get doctor's appointments
 */
export async function getDoctorAppointments(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    // Verify doctor can only access their own appointments
    if (decodedToken.uid !== id && decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const filters = {
      status: req.query.status,
      date: req.query.date
    };

    // Pass user email to help find doctor document
    const appointments = await appointmentService.getDoctorAppointments(
      id, 
      filters, 
      decodedToken.email
    );
    res.json({ success: true, appointments });
  } catch (error) {
    console.error('Error in getDoctorAppointments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /appointments/:id/accept - Accept an appointment
 */
export async function acceptAppointment(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Verify doctor can only accept their own appointments
    // Find doctor by user_id or email to match appointment.doctor_id
    if (decodedToken.role === 'doctor') {
      const doctorId = await appointmentService.getDoctorIdByUser(decodedToken.uid, decodedToken.email);
      if (!doctorId || appointment.doctor_id !== doctorId) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You can only accept your own appointments' });
      }
    } else if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending appointments can be accepted' 
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id, 
      'accepted', 
      decodedToken.uid
    );

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error in acceptAppointment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /appointments/:id/reject - Reject an appointment
 */
export async function rejectAppointment(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Verify doctor can only reject their own appointments
    // Find doctor by user_id or email to match appointment.doctor_id
    if (decodedToken.role === 'doctor') {
      const doctorId = await appointmentService.getDoctorIdByUser(decodedToken.uid, decodedToken.email);
      if (!doctorId || appointment.doctor_id !== doctorId) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You can only reject your own appointments' });
      }
    } else if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only pending appointments can be rejected' 
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id, 
      'rejected', 
      decodedToken.uid
    );

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error in rejectAppointment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /appointments/:id/complete - Mark appointment as completed
 */
export async function completeAppointment(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Verify doctor can only complete their own appointments
    // Find doctor by user_id or email to match appointment.doctor_id
    if (decodedToken.role === 'doctor') {
      const doctorId = await appointmentService.getDoctorIdByUser(decodedToken.uid, decodedToken.email);
      if (!doctorId || appointment.doctor_id !== doctorId) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You can only complete your own appointments' });
      }
    } else if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (appointment.status !== 'accepted') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only accepted appointments can be completed' 
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id, 
      'completed', 
      decodedToken.uid
    );

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error in completeAppointment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /doctor/availability - Set doctor availability
 */
export async function setDoctorAvailability(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { doctor_id, availability } = req.body;

    if (!doctor_id || !availability) {
      return res.status(400).json({ 
        success: false, 
        error: 'doctor_id and availability are required' 
      });
    }

    // Verify doctor can only set their own availability
    if (decodedToken.uid !== doctor_id && decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const result = await appointmentService.setDoctorAvailability(doctor_id, availability);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in setDoctorAvailability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ========== ADMIN ENDPOINTS ==========

/**
 * POST /admin/add-doctor - Add a new doctor
 */
export async function addDoctor(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Validate required fields
    const { name, email, specialization, location, consultation_fee, availability_status } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Doctor name is required' });
    }
    
    if (!email || !email.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Doctor email is required. This email is used to link appointments to the doctor when they log in.' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }
    
    if (!specialization || !specialization.trim()) {
      return res.status(400).json({ success: false, error: 'Doctor specialization is required' });
    }
    
    // Normalize email (lowercase, trim)
    req.body.email = email.trim().toLowerCase();
    
    // Normalize location (ensure it's a string)
    if (req.body.location && typeof req.body.location === 'object') {
      req.body.location = req.body.location.city || req.body.location.address || '';
    }
    req.body.location = req.body.location || '';
    
    // Validate consultation_fee (must be number >= 0)
    if (consultation_fee !== undefined && consultation_fee !== null) {
      const fee = parseFloat(consultation_fee);
      if (isNaN(fee) || fee < 0) {
        return res.status(400).json({ success: false, error: 'Consultation fee must be a valid number >= 0' });
      }
      req.body.consultation_fee = fee;
    } else {
      req.body.consultation_fee = 0;
    }
    
    // Validate availability_status
    const validStatuses = ['Available', 'Unavailable', 'In Consultation'];
    if (availability_status && !validStatuses.includes(availability_status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Availability status must be one of: ${validStatuses.join(', ')}` 
      });
    }
    req.body.availability_status = availability_status || 'Available';

    const doctor = await appointmentService.createDoctor(req.body);
    res.status(201).json({ success: true, doctor });
  } catch (error) {
    console.error('Error in addDoctor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /admin/edit-doctor/:id - Update doctor information
 */
export async function editDoctor(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const doctor = await appointmentService.updateDoctor(id, req.body);
    res.json({ success: true, doctor });
  } catch (error) {
    console.error('Error in editDoctor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /admin/delete-doctor/:id - Deactivate a doctor
 */
export async function deleteDoctor(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Soft delete - set isActive to false
    await appointmentService.updateDoctor(id, { isActive: false });
    res.json({ success: true, message: 'Doctor deactivated successfully' });
  } catch (error) {
    console.error('Error in deleteDoctor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /admin/appointments - Get all appointments with filters
 */
export async function getAllAppointments(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const filters = {
      doctor_id: req.query.doctor_id,
      status: req.query.status,
      date: req.query.date
    };

    const appointments = await appointmentService.getAllAppointments(filters);
    res.json({ success: true, appointments });
  } catch (error) {
    console.error('Error in getAllAppointments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /admin/doctors - Get all doctors (admin view)
 */
export async function getAllDoctors(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const doctors = await appointmentService.getDoctors({});
    res.json({ success: true, doctors });
  } catch (error) {
    console.error('Error in getAllDoctors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /admin/analytics - Get appointment analytics
 */
export async function getAnalytics(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    
    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const analytics = await appointmentService.getAppointmentAnalytics();
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error in getAnalytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

