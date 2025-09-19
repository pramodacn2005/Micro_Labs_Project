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

export default router;
