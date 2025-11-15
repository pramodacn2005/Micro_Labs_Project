// Appointment routes
import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';

const router = express.Router();

// ========== PATIENT ROUTES ==========
router.get('/doctors', appointmentController.getDoctors);
router.get('/doctors/:id', appointmentController.getDoctorById);
router.get('/doctors/:id/slots', appointmentController.getDoctorSlots);
router.post('/appointments', appointmentController.createAppointment);
router.get('/appointments/patient/:id', appointmentController.getPatientAppointments);
router.patch('/appointments/:id/cancel', appointmentController.cancelAppointment);

// ========== DOCTOR ROUTES ==========
router.get('/appointments/doctor/:id', appointmentController.getDoctorAppointments);
router.patch('/appointments/:id/accept', appointmentController.acceptAppointment);
router.patch('/appointments/:id/reject', appointmentController.rejectAppointment);
router.patch('/appointments/:id/complete', appointmentController.completeAppointment);
router.post('/doctor/availability', appointmentController.setDoctorAvailability);

// ========== ADMIN ROUTES ==========
router.post('/admin/add-doctor', appointmentController.addDoctor);
router.put('/admin/edit-doctor/:id', appointmentController.editDoctor);
router.delete('/admin/delete-doctor/:id', appointmentController.deleteDoctor);
router.get('/admin/appointments', appointmentController.getAllAppointments);
router.get('/admin/doctors', appointmentController.getAllDoctors);
router.get('/admin/analytics', appointmentController.getAnalytics);

export default router;







