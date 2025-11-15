// Test Twilio SMS functionality
import { sendSMS } from "./services/alertService.js";
import dotenv from "dotenv";

dotenv.config();

console.log("🔍 Testing Twilio SMS functionality...");
console.log("📋 Environment variables:");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "✅ Set" : "❌ Missing");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "✅ Set" : "❌ Missing");
console.log("TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER || "❌ Missing");
console.log("DOCTOR_PHONE_NUMBER:", process.env.DOCTOR_PHONE_NUMBER || "❌ Missing");

async function testSMS() {
  try {
    console.log("\n📱 Attempting to send test SMS...");
    const result = await sendSMS("🚨 Test SMS from Healthcare Dashboard - " + new Date().toLocaleString());
    console.log("📱 SMS Result:", result);
    
    if (result.status === "simulated") {
      console.log("⚠️ SMS was simulated - Twilio not properly configured");
    } else if (result.status === "fallback") {
      console.log("⚠️ SMS failed - using fallback mode");
      console.log("Error:", result.error);
    } else {
      console.log("✅ SMS sent successfully via Twilio");
    }
  } catch (error) {
    console.error("❌ SMS test failed:", error);
  }
}

testSMS();























