// backend/controllers/vitalsControllerSimple.js
import express from "express";
import { sendSMS } from "../services/alertService.js";

const router = express.Router();

// Mock vitals data for demonstration
const mockVitalsData = [
  {
    id: "1",
    timestamp: Date.now() - 60000, // 1 minute ago
    heartRate: 75,
    spo2: 98,
    bodyTemp: 36.5,
    ambientTemp: 25.0,
    accMagnitude: 1.0,
    fallDetected: false
  },
  {
    id: "2", 
    timestamp: Date.now() - 30000, // 30 seconds ago
    heartRate: 76,
    spo2: 97,
    bodyTemp: 36.6,
    ambientTemp: 24.8,
    accMagnitude: 1.1,
    fallDetected: false
  },
  {
    id: "3",
    timestamp: Date.now() - 10000, // 10 seconds ago
    heartRate: 74,
    spo2: 99,
    bodyTemp: 36.4,
    ambientTemp: 25.2,
    accMagnitude: 0.9,
    fallDetected: false
  }
];

// GET /api/vitals/history - Get vitals history
router.get("/history", async (req, res) => {
  try {
    const { limit = 100, timeframe = "1h" } = req.query;
    
    console.log(`📊 Vitals API: Fetching ${limit} readings for timeframe ${timeframe}`);
    
    // Filter data based on timeframe
    const now = Date.now();
    let filteredData = [...mockVitalsData];
    
    // Add more mock data if needed
    for (let i = 4; i <= parseInt(limit); i++) {
      filteredData.push({
        id: i.toString(),
        timestamp: now - (i * 10000), // 10 seconds apart
        heartRate: 70 + Math.floor(Math.random() * 20),
        spo2: 95 + Math.floor(Math.random() * 5),
        bodyTemp: 36.0 + Math.random() * 1.0,
        ambientTemp: 24.0 + Math.random() * 2.0,
        accMagnitude: 0.8 + Math.random() * 0.4,
        fallDetected: Math.random() < 0.1
      });
    }
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit results
    const limitedData = filteredData.slice(0, parseInt(limit));
    
    console.log(`✅ Vitals API: Returning ${limitedData.length} readings`);
    
    res.json({
      success: true,
      items: limitedData,
      count: limitedData.length,
      timeframe,
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error("❌ Vitals API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vitals data",
      message: error.message
    });
  }
});

// GET /api/vitals/latest - Get latest vitals
router.get("/latest", async (req, res) => {
  try {
    const latest = mockVitalsData[0];
    console.log("📊 Vitals API: Returning latest reading");
    
    res.json({
      success: true,
      data: latest
    });
    
  } catch (error) {
    console.error("❌ Vitals API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch latest vitals",
      message: error.message
    });
  }
});

// POST /api/vitals/reading - Save new reading
router.post("/reading", async (req, res) => {
  try {
    const reading = req.body;
    const newReading = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...reading
    };
    
    // Add to mock data (in real app, this would save to database)
    mockVitalsData.unshift(newReading);
    
    console.log("📊 Vitals API: New reading saved", newReading);
    
    res.json({
      success: true,
      data: newReading
    });
    
  } catch (error) {
    console.error("❌ Vitals API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save reading",
      message: error.message
    });
  }
});

// GET /api/vitals/health - Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Vitals API is healthy",
    timestamp: new Date().toISOString()
  });
});

// POST /api/vitals/send-emergency-sms - Send emergency SMS
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

// POST /api/vitals/send-test-sms - Test SMS endpoint
router.post("/send-test-sms", async (req, res) => {
  try {
    await sendSMS("🚨 Test alert from IoT Health Monitoring Dashboard!");
    res.json({ success: true, message: "Test SMS sent to caregiver." });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;

