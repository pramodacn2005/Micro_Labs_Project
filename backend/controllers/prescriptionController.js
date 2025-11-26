// Prescription controller for handling prescription-related API requests
import * as prescriptionService from '../services/prescriptionService.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prescriptionsDir = path.resolve(__dirname, "..", "storage", "prescriptions");

// Middleware to verify Firebase token and get user with role
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token || token.trim() === '') {
    throw new Error('No authorization token provided');
  }

  try {
    const { admin, db } = await import('../services/firebaseAdminService.js');
    
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    // Fetch user role from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let role = 'patient';
    if (userDoc.exists) {
      const userData = userDoc.data();
      role = userData.role || 'patient';
    }
    
    return {
      ...decodedToken,
      role
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}

/**
 * POST /prescriptions - Create a new prescription
 */
export async function createPrescription(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    
    // Verify doctor role
    if (decodedToken.role !== 'doctor') {
      return res.status(403).json({ 
        success: false, 
        error: 'Doctor access required' 
      });
    }

    const {
      doctor,
      patient,
      prescription_input,
      send_options,
      require_consent_to_send
    } = req.body;

    // Get client IP
    const client_ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || null;

    // Create prescription
    const result = await prescriptionService.createPrescription({
      doctor,
      patient,
      prescription_input,
      send_options: send_options || { send_method: "none" },
      require_consent_to_send: require_consent_to_send !== undefined ? require_consent_to_send : true,
      client_ip
    });

    // Return appropriate status code based on result
    if (result.status === "error") {
      return res.status(400).json(result);
    } else if (result.status === "pending") {
      return res.status(202).json(result); // Accepted but pending confirmation
    } else {
      return res.status(201).json(result);
    }
  } catch (error) {
    console.error('Error in createPrescription:', error);
    return res.status(500).json({ 
      status: "error",
      prescription_id: null,
      pdf_url: null,
      prescription_json: null,
      sent_status: "not_sent",
      sent_via: null,
      sent_timestamp: null,
      audit: {
        created_by: req.body?.doctor?.id || null,
        created_at: new Date().toISOString(),
        client_ip: req.ip || null
      },
      errors: [error.message]
    });
  }
}

/**
 * GET /prescriptions/:id - Get prescription by ID
 */
export async function getPrescription(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const prescription = await prescriptionService.getPrescriptionById(id);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prescription not found' 
      });
    }

    // Check if user has access (doctor who created it, patient it's for, or admin)
    const hasAccess = 
      prescription.created_by === decodedToken.uid ||
      prescription.patient_id === decodedToken.uid ||
      decodedToken.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      prescription 
    });
  } catch (error) {
    console.error('Error in getPrescription:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * GET /prescriptions/:id/download - Download prescription PDF
 */
export async function downloadPrescription(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { id } = req.params;

    const prescription = await prescriptionService.getPrescriptionById(id);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prescription not found' 
      });
    }

    // Check if user has access
    const hasAccess = 
      prescription.created_by === decodedToken.uid ||
      prescription.patient_id === decodedToken.uid ||
      decodedToken.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Read PDF file
    const pdfPath = prescription.pdf_path;
    if (!pdfPath) {
      return res.status(404).json({ 
        success: false, 
        error: 'PDF file not found' 
      });
    }

    try {
      const pdfBuffer = await readFile(pdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="prescription_${id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (fileError) {
      console.error('Error reading PDF file:', fileError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to read PDF file' 
      });
    }
  } catch (error) {
    console.error('Error in downloadPrescription:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * GET /prescriptions/patient/:patientId - Get all prescriptions for a patient
 */
export async function getPatientPrescriptions(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { patientId } = req.params;

    // Check if user has access (patient themselves, their doctor, or admin)
    if (decodedToken.uid !== patientId && decodedToken.role !== 'doctor' && decodedToken.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const { db } = await import('../services/firebaseAdminService.js');
    
    let query = db.collection('prescriptions').where('patient_id', '==', patientId);
    
    // If doctor, only show prescriptions they created
    if (decodedToken.role === 'doctor' && decodedToken.role !== 'admin') {
      query = query.where('created_by', '==', decodedToken.uid);
    }

    // Get all prescriptions without orderBy to avoid index requirement
    const snapshot = await query.get();
    let prescriptions = snapshot.docs.map(doc => ({
      prescription_id: doc.id,
      ...doc.data()
    }));

    // Sort in memory by created_at (newest first)
    prescriptions.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dateB - dateA; // Descending order (newest first)
    });

    return res.status(200).json({ 
      success: true, 
      prescriptions 
    });
  } catch (error) {
    console.error('Error in getPatientPrescriptions:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * GET /prescriptions/doctor/:doctorId - Get all prescriptions created by a doctor
 */
export async function getDoctorPrescriptions(req, res) {
  try {
    const decodedToken = await verifyAuth(req);
    const { doctorId } = req.params;

    // Check if user has access (doctor themselves or admin)
    if (decodedToken.uid !== doctorId && decodedToken.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const { db } = await import('../services/firebaseAdminService.js');
    
    // Get all prescriptions without orderBy to avoid index requirement
    const snapshot = await db.collection('prescriptions')
      .where('created_by', '==', doctorId)
      .get();
    
    let prescriptions = snapshot.docs.map(doc => ({
      prescription_id: doc.id,
      ...doc.data()
    }));

    // Sort in memory by created_at (newest first)
    prescriptions.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dateB - dateA; // Descending order (newest first)
    });

    return res.status(200).json({ 
      success: true, 
      prescriptions 
    });
  } catch (error) {
    console.error('Error in getDoctorPrescriptions:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

