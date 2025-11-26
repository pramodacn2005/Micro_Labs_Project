// Prescription routes
import express from 'express';
import * as prescriptionController from '../controllers/prescriptionController.js';

const router = express.Router();

// ========== DOCTOR ROUTES ==========
router.post('/prescriptions', prescriptionController.createPrescription);
router.get('/prescriptions/doctor/:doctorId', prescriptionController.getDoctorPrescriptions);

// ========== PATIENT ROUTES ==========
router.get('/prescriptions/patient/:patientId', prescriptionController.getPatientPrescriptions);

// ========== SHARED ROUTES ==========
router.get('/prescriptions/:id', prescriptionController.getPrescription);
router.get('/prescriptions/:id/download', prescriptionController.downloadPrescription);

export default router;

