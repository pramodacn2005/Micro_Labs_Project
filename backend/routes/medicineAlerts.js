import express from 'express';
import { sendMissedDoseAlert, sendMedicineReminder, sendDailySummary } from '../services/medicineAlertService.js';
import { sendMissedDoseEmail, sendDailySummaryEmail } from '../services/emailAlertService.js';

const router = express.Router();

// Send missed dose alert via email
router.post('/missed-dose', async (req, res) => {
  try {
    const { medicineData, scheduledTime, delayMinutes } = req.body;
    
    if (!medicineData || !scheduledTime || delayMinutes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: medicineData, scheduledTime, delayMinutes'
      });
    }
    
    // Send email alert
    const result = await sendMissedDoseEmail(medicineData, scheduledTime, delayMinutes);
    
    res.json(result);
  } catch (error) {
    console.error('Error in missed dose alert endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send medicine reminder
router.post('/reminder', async (req, res) => {
  try {
    const { medicineData } = req.body;
    
    if (!medicineData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: medicineData'
      });
    }
    
    const result = await sendMedicineReminder(medicineData);
    
    res.json(result);
  } catch (error) {
    console.error('Error in medicine reminder endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send daily summary via email
router.post('/daily-summary', async (req, res) => {
  try {
    const { userId, todaysMedicines, medicineLogs } = req.body;
    
    if (!userId || !todaysMedicines || !medicineLogs) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, todaysMedicines, medicineLogs'
      });
    }
    
    // Send email summary
    const result = await sendDailySummaryEmail(userId, todaysMedicines, medicineLogs);
    
    res.json(result);
  } catch (error) {
    console.error('Error in daily summary endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
