import { Router } from "express";
import { latest, history, alerts } from "../controllers/vitalsController.js";
import { sendSMS } from "../services/alertService.js"; // <-- NEW import

const router = Router();

router.get("/latest", latest);
router.get("/history", history);
router.get("/alerts", alerts);

// ✅ New route to test SMS manually
router.post("/send-test-sms", async (req, res) => {
  try {
    await sendSMS("🚨 Test alert from IoT Health Monitoring Dashboard!");
    res.json({ success: true, message: "Test SMS sent to doctor." });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ✅ Emergency SMS endpoint
router.post("/send-emergency-sms", async (req, res) => {
  try {
    const { to, message, alert, patientName } = req.body;
    
    console.log("🚨 [EMERGENCY SMS] Request received:", {
      to,
      patientName,
      alert: alert?.parameter,
      messageLength: message?.length
    });
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing 'to' or 'message' in request body" 
      });
    }
    
    // Send SMS using Twilio with specific recipient
    await sendSMS(message, to);
    
    console.log("✅ [EMERGENCY SMS] Sent successfully to:", to);
    
    res.json({ 
      success: true, 
      message: `Emergency SMS sent to ${to}`,
      timestamp: new Date().toISOString(),
      alert: alert
    });
  } catch (e) {
    console.error("❌ [EMERGENCY SMS] Failed:", e.message);
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
