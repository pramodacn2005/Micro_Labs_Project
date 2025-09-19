import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSMS(message) {
  try {
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,   // Twilio trial number
      to: process.env.DOCTOR_PHONE_NUMBER      // Verified doctor number
    });
    console.log("✅ SMS sent:", msg.sid);
  } catch (error) {
    console.error("❌ SMS failed:", error.message);
  }
}
