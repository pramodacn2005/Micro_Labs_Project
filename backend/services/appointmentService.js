// Appointment service for managing appointments, doctors, and availability
import { db } from './firebaseAdminService.js';
import admin from 'firebase-admin';

// Import db from firebaseAdminService
// Note: db is already exported from firebaseAdminService.js

const appointmentsCollection = 'appointments';
const doctorsCollection = 'doctors';
const usersCollection = 'users';
const availabilityCollection = 'doctor_availability';

// ========== DOCTOR OPERATIONS ==========

/**
 * Get all doctors with optional filters
 */
export async function getDoctors(filters = {}) {
  try {
    let query = db.collection(doctorsCollection).where('isActive', '==', true);

    if (filters.specialization) {
      query = query.where('specialization', '==', filters.specialization);
    }

    // Location is now a string, so we filter in memory
    const snapshot = await query.get();
    let doctors = snapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure location is string (handle legacy object format)
      let location = data.location;
      if (typeof location === 'object' && location !== null) {
        location = location.city || location.address || '';
      }
      
      return {
        doctor_id: doc.id,
        ...data,
        location: location || '',
        consultation_fee: data.consultation_fee || 0,
        availability_status: data.availability_status || 'Available',
        profile_photo_url: data.profile_photo_url || ''
      };
    });

    // Filter by location on client side if provided
    if (filters.location) {
      doctors = doctors.filter(doctor => {
        const doctorLocation = typeof doctor.location === 'string' 
          ? doctor.location 
          : (doctor.location?.city || doctor.location?.address || '');
        return doctorLocation.toLowerCase().includes(filters.location.toLowerCase());
      });
    }

    // Apply name search filter if provided
    if (filters.name) {
      const nameLower = filters.name.toLowerCase();
      doctors = doctors.filter(doctor => 
        doctor.name.toLowerCase().includes(nameLower)
      );
    }

    return doctors;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
}

/**
 * Get a single doctor by ID
 */
export async function getDoctorById(doctorId) {
  try {
    const doc = await db.collection(doctorsCollection).doc(doctorId).get();
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    // Ensure location is string (handle legacy object format)
    let location = data.location;
    if (typeof location === 'object' && location !== null) {
      location = location.city || location.address || '';
    }

    return {
      doctor_id: doc.id,
      ...data,
      location: location || '',
      consultation_fee: data.consultation_fee || 0,
      availability_status: data.availability_status || 'Available',
      profile_photo_url: data.profile_photo_url || ''
    };
  } catch (error) {
    console.error('Error fetching doctor:', error);
    throw error;
  }
}

/**
 * Get available time slots for a doctor on a specific date
 */
export async function getAvailableSlots(doctorId, date) {
  try {
    const doctor = await getDoctorById(doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Get existing appointments for this date
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    const appointmentsSnapshot = await db.collection(appointmentsCollection)
      .where('doctor_id', '==', doctorId)
      .where('date', '==', dateStr)
      .where('status', 'in', ['pending', 'accepted'])
      .get();

    const bookedSlots = appointmentsSnapshot.docs.map(doc => doc.data().time_slot);

    // Get doctor's availability for this day of week
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
    const availabilityDoc = await db.collection(availabilityCollection)
      .where('doctor_id', '==', doctorId)
      .where('day', '==', dayOfWeek)
      .limit(1)
      .get();

    let availableSlots = [];
    if (!availabilityDoc.empty) {
      const availability = availabilityDoc.docs[0].data();
      availableSlots = availability.slots || [];
    } else if (doctor.working_hours && doctor.working_hours[dayOfWeek]) {
      // Fallback to doctor's default working hours
      const workingHours = doctor.working_hours[dayOfWeek];
      availableSlots = generateTimeSlots(workingHours.start, workingHours.end, doctor.max_patients_per_slot || 1);
    }

    // Filter out booked slots
    const freeSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

    return freeSlots;
  } catch (error) {
    console.error('Error fetching available slots:', error);
    throw error;
  }
}

/**
 * Generate time slots from start to end time
 */
function generateTimeSlots(startTime, endTime, maxPatients = 1) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    slots.push(timeStr);

    // Increment by 30 minutes
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return slots;
}

/**
 * Create a new doctor
 */
export async function createDoctor(doctorData) {
  try {
    // Try to find Firebase user by email to link doctor to user account
    let userId = null;
    if (doctorData.email) {
      try {
        // Note: We can't directly query Firebase Auth users, so we'll store email
        // and link it when doctor logs in, or admin can provide user_id
        userId = doctorData.user_id || null;
      } catch (error) {
        console.warn('Could not link doctor to Firebase user:', error);
      }
    }
    
    const doctorDoc = {
      name: doctorData.name,
      email: doctorData.email,
      phone: doctorData.phone,
      specialization: doctorData.specialization,
      experience_years: doctorData.experience_years || 0,
      qualifications: doctorData.qualifications || [],
      about: doctorData.about || '',
      location: doctorData.location || '', // Changed to string
      profile_photo_url: doctorData.profile_photo_url || '',
      rating: doctorData.rating || 0,
      consultation_fee: doctorData.consultation_fee || 0,
      availability_status: doctorData.availability_status || 'Available', // 'Available', 'Unavailable', 'In Consultation'
      working_hours: doctorData.working_hours || {},
      available_slots: doctorData.available_slots || [],
      max_patients_per_slot: doctorData.max_patients_per_slot || 1,
      user_id: userId, // Link to Firebase user account (optional, can be set later)
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection(doctorsCollection).add(doctorDoc);
    
    // Create default availability if provided
    if (doctorData.working_hours) {
      await setDoctorAvailability(docRef.id, doctorData.working_hours);
    }

    return {
      doctor_id: docRef.id,
      ...doctorDoc
    };
  } catch (error) {
    console.error('Error creating doctor:', error);
    throw error;
  }
}

/**
 * Update doctor information
 */
export async function updateDoctor(doctorId, updateData) {
  try {
    // Ensure location is string, not object
    if (updateData.location && typeof updateData.location === 'object') {
      updateData.location = updateData.location.city || updateData.location.address || '';
    }
    
    const updateDoc = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(doctorsCollection).doc(doctorId).update(updateDoc);
    return await getDoctorById(doctorId);
  } catch (error) {
    console.error('Error updating doctor:', error);
    throw error;
  }
}

/**
 * Set doctor availability
 */
export async function setDoctorAvailability(doctorId, availabilityData) {
  try {
    // availabilityData should be an object with day names as keys
    // e.g., { 'Monday': { start: '09:00', end: '17:00' }, ... }
    
    for (const [day, schedule] of Object.entries(availabilityData)) {
      const slots = generateTimeSlots(schedule.start, schedule.end, 1);
      
      // Check if availability doc exists for this day
      const existing = await db.collection(availabilityCollection)
        .where('doctor_id', '==', doctorId)
        .where('day', '==', day)
        .limit(1)
        .get();

      const availabilityDoc = {
        doctor_id: doctorId,
        day,
        start_time: schedule.start,
        end_time: schedule.end,
        slots,
        max_patients_per_slot: schedule.max_patients_per_slot || 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (!existing.empty) {
        await existing.docs[0].ref.update(availabilityDoc);
      } else {
        availabilityDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(availabilityCollection).add(availabilityDoc);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting doctor availability:', error);
    throw error;
  }
}

// ========== APPOINTMENT OPERATIONS ==========

/**
 * Create a new appointment
 */
export async function createAppointment(appointmentData) {
  try {
    const appointmentDoc = {
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      date: appointmentData.date,
      time_slot: appointmentData.time_slot,
      reason: appointmentData.reason || '',
      status: 'pending',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection(appointmentsCollection).add(appointmentDoc);
    
    return {
      appointment_id: docRef.id,
      ...appointmentDoc
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

/**
 * Get appointments for a patient
 */
export async function getPatientAppointments(patientId, filters = {}) {
  try {
    let query = db.collection(appointmentsCollection)
      .where('patient_id', '==', patientId);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    // Fetch without orderBy to avoid index requirement - we'll sort in memory
    const snapshot = await query.get();
    
    const appointments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const doctor = await getDoctorById(data.doctor_id);
        return {
          appointment_id: doc.id,
          ...data,
          doctor
        };
      })
    );

    // Sort by date (desc) then time_slot (desc) in memory
    appointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time_slot.localeCompare(a.time_slot);
    });

    return appointments;
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    throw error;
  }
}

/**
 * Get doctor ID by Firebase user UID or email
 */
export async function getDoctorIdByUser(userId, userEmail) {
  try {
    // First try to find by user_id field (if doctor document has it)
    let doctorQuery = db.collection(doctorsCollection)
      .where('user_id', '==', userId)
      .limit(1);
    
    let snapshot = await doctorQuery.get();
    
    // If not found by user_id, try to find by email
    if (snapshot.empty && userEmail) {
      doctorQuery = db.collection(doctorsCollection)
        .where('email', '==', userEmail)
        .where('isActive', '==', true)
        .limit(1);
      snapshot = await doctorQuery.get();
    }
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id; // Return doctor_id (document ID)
    }
    
    return null;
  } catch (error) {
    console.error('Error finding doctor by user:', error);
    return null;
  }
}

/**
 * Get appointments for a doctor
 */
export async function getDoctorAppointments(doctorIdOrUserId, filters = {}, userEmail = null) {
  try {
    // If doctorIdOrUserId looks like a doctor_id (from doctors collection), use it directly
    // Otherwise, try to find doctor by user ID or email
    let doctorId = doctorIdOrUserId;
    
    // Check if it's a Firebase UID (usually longer) vs doctor_id
    // Try to find doctor document first
    const doctorDoc = await db.collection(doctorsCollection).doc(doctorIdOrUserId).get();
    
    if (!doctorDoc.exists) {
      // Not a direct doctor_id, try to find by user_id or email
      doctorId = await getDoctorIdByUser(doctorIdOrUserId, userEmail);
      
      if (!doctorId) {
        console.warn(`[Appointment Service] Doctor not found for user: ${doctorIdOrUserId}`);
        return []; // Return empty array if doctor not found
      }
    }
    
    let query = db.collection(appointmentsCollection)
      .where('doctor_id', '==', doctorId);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.date) {
      query = query.where('date', '==', filters.date);
    }

    // Fetch without orderBy to avoid index requirement - we'll sort in memory
    const snapshot = await query.get();
    
    const appointments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get patient info
        let patient = null;
        try {
          const patientDoc = await db.collection(usersCollection).doc(data.patient_id).get();
          if (patientDoc.exists) {
            patient = { id: patientDoc.id, ...patientDoc.data() };
          }
        } catch (error) {
          console.error(`Error fetching patient ${data.patient_id}:`, error);
        }
        
        return {
          appointment_id: doc.id,
          ...data,
          patient
        };
      })
    );

    // Sort by date (desc) then time_slot (desc) in memory
    appointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time_slot.localeCompare(a.time_slot);
    });

    return appointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw error;
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(appointmentId, status, updatedBy = null) {
  try {
    const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const updateData = {
      status,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (updatedBy) {
      updateData.updated_by = updatedBy;
    }

    await db.collection(appointmentsCollection).doc(appointmentId).update(updateData);
    return await getAppointmentById(appointmentId);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(appointmentId) {
  try {
    const doc = await db.collection(appointmentsCollection).doc(appointmentId).get();
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    const doctor = await getDoctorById(data.doctor_id);
    const patientDoc = await db.collection(usersCollection).doc(data.patient_id).get();
    const patient = patientDoc.exists ? { id: patientDoc.id, ...patientDoc.data() } : null;

    return {
      appointment_id: doc.id,
      ...data,
      doctor,
      patient
    };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
}

/**
 * Get all appointments (for admin)
 */
export async function getAllAppointments(filters = {}) {
  try {
    let query = db.collection(appointmentsCollection);

    if (filters.doctor_id) {
      query = query.where('doctor_id', '==', filters.doctor_id);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.date) {
      query = query.where('date', '==', filters.date);
    }

    // Fetch without orderBy to avoid index requirement - we'll sort in memory
    const snapshot = await query.get();
    
    const appointments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const doctor = await getDoctorById(data.doctor_id);
        
        // Get patient info
        let patient = null;
        try {
          const patientDoc = await db.collection(usersCollection).doc(data.patient_id).get();
          if (patientDoc.exists) {
            patient = { id: patientDoc.id, ...patientDoc.data() };
          }
        } catch (error) {
          console.error(`Error fetching patient ${data.patient_id}:`, error);
        }

        return {
          appointment_id: doc.id,
          ...data,
          doctor,
          patient
        };
      })
    );

    // Sort by date (desc) then time_slot (desc) in memory
    appointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time_slot.localeCompare(a.time_slot);
    });

    return appointments;
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    throw error;
  }
}

/**
 * Get appointment analytics
 */
export async function getAppointmentAnalytics() {
  try {
    const allAppointments = await getAllAppointments();
    
    const total = allAppointments.length;
    const byStatus = {};
    const bySpecialization = {};
    const highFeverTriggered = allAppointments.filter(apt => 
      apt.reason && apt.reason.toLowerCase().includes('high fever')
    ).length;

    allAppointments.forEach(apt => {
      // Count by status
      byStatus[apt.status] = (byStatus[apt.status] || 0) + 1;

      // Count by specialization
      if (apt.doctor && apt.doctor.specialization) {
        bySpecialization[apt.doctor.specialization] = 
          (bySpecialization[apt.doctor.specialization] || 0) + 1;
      }
    });

    return {
      total,
      byStatus,
      bySpecialization,
      highFeverTriggered
    };
  } catch (error) {
    console.error('Error fetching appointment analytics:', error);
    throw error;
  }
}

