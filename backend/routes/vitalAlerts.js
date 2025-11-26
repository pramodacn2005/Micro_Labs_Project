// backend/routes/vitalAlerts.js
import express from 'express';
import { 
  processVitalReading, 
  getVitalStatus, 
  resetVitalCounter, 
  getVitalThresholds,
  updateVitalThresholds 
} from '../controllers/vitalAlertController.js';

const router = express.Router();

/**
 * POST /vital-alerts/process
 * Process vital readings and check for consecutive abnormal readings
 * Body: { deviceId, vitals: { heartRate, spo2, bodyTemp, etc. }, patientData: { name, id, email } }
 */
router.post('/process', async (req, res) => {
  try {
    const { deviceId, vitals, patientData } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ 
        error: 'Device ID is required' 
      });
    }
    
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ 
        error: 'Vitals data is required' 
      });
    }
    
    console.log(`📊 [VITAL ALERT API] Processing vitals for device ${deviceId}`);
    
    const result = await processVitalReading(deviceId, vitals, patientData);
    
    res.json({
      success: true,
      result: result,
      message: 'Vital readings processed successfully'
    });
    
  } catch (error) {
    console.error('❌ [VITAL ALERT API] Error processing vital readings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /vital-alerts/status/:deviceId
 * Get current status of vital monitoring for a device
 */
router.get('/status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ 
        error: 'Device ID is required' 
      });
    }
    
    const status = getVitalStatus(deviceId);
    
    res.json({
      success: true,
      status: status
    });
    
  } catch (error) {
    console.error('❌ [VITAL ALERT API] Error getting vital status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /vital-alerts/reset/:deviceId
 * Reset vital counters for a device
 * Body: { vital? } - optional specific vital to reset, or reset all if not provided
 */
router.post('/reset/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { vital } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ 
        error: 'Device ID is required' 
      });
    }
    
    resetVitalCounter(deviceId, vital);
    
    res.json({
      success: true,
      message: vital ? `Reset counter for ${vital}` : 'Reset all counters',
      deviceId: deviceId,
      vital: vital || 'all'
    });
    
  } catch (error) {
    console.error('❌ [VITAL ALERT API] Error resetting counters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /vital-alerts/thresholds
 * Get current vital thresholds
 */
router.get('/thresholds', async (req, res) => {
  try {
    const thresholds = getVitalThresholds();
    
    res.json({
      success: true,
      thresholds: thresholds
    });
    
  } catch (error) {
    console.error('❌ [VITAL ALERT API] Error getting thresholds:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /vital-alerts/thresholds
 * Update vital thresholds
 * Body: { thresholds: { heartRate: { min, max, criticalMin, criticalMax }, ... } }
 */
router.put('/thresholds', async (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ 
        error: 'Thresholds object is required' 
      });
    }
    
    updateVitalThresholds(thresholds);
    
    res.json({
      success: true,
      message: 'Thresholds updated successfully',
      thresholds: getVitalThresholds()
    });
    
  } catch (error) {
    console.error('❌ [VITAL ALERT API] Error updating thresholds:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /vital-alerts/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Vital alerts service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;

















