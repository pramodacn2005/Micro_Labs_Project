import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// Check if Twilio credentials are available
const hasTwilioCredentials = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

let client = null;
if (hasTwilioCredentials) {
  try {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio client initialized successfully");
  } catch (error) {
    console.warn("⚠️ Failed to initialize Twilio client:", error.message);
  }
} else {
  console.warn("⚠️ Twilio credentials not found. SMS functionality will be simulated.");
}

export async function sendSMS(message, to = null) {
  const recipient = to || process.env.DOCTOR_PHONE_NUMBER || "+917019220796";
  
  try {
    // If Twilio is not configured, simulate SMS sending
    if (!client || !hasTwilioCredentials) {
      console.log("📱 [SIMULATED SMS] Would send to:", recipient);
      console.log("📱 [SIMULATED SMS] Message:", message);
      console.log("⚠️ [SIMULATED SMS] Twilio not configured - SMS not actually sent");
      
      // Return a simulated response
      return {
        sid: "simulated_" + Date.now(),
        to: recipient,
        body: message,
        status: "simulated"
      };
    }
    
    // Send actual SMS via Twilio
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,   // Twilio trial number
      to: recipient      // Dynamic recipient or default caregiver
    });
    console.log("✅ SMS sent:", msg.sid, "to:", recipient);
    return msg;
  } catch (error) {
    console.error("❌ SMS failed:", error.message);
    console.error("❌ Error code:", error.code);
    
    // If Twilio fails, still log the message for debugging
    console.log("📱 [FALLBACK] Emergency message would be sent to:", recipient);
    console.log("📱 [FALLBACK] Message:", message);
    
    // Log specific error solutions
    if (error.code === 20003) {
      console.log("💡 [SOLUTION] Twilio authentication failed. Check your Account SID and Auth Token in .env file");
    } else if (error.code === 21211) {
      console.log("💡 [SOLUTION] Phone number not verified. Verify +917019220796 in Twilio Console");
    } else if (error.code === 21614) {
      console.log("💡 [SOLUTION] Invalid 'From' number. Use a valid Twilio phone number");
    }
    
    // Return a fallback response instead of throwing
    return {
      sid: "fallback_" + Date.now(),
      to: recipient,
      body: message,
      status: "fallback",
      error: error.message,
      errorCode: error.code
    };
  }
}
