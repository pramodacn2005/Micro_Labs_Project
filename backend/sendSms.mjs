// backend/sendSms.mjs
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  DOCTOR_PHONE_NUMBER
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function sendSMS(message) {
  if (!message) throw new Error("message is required");
  try {
    const msg = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: DOCTOR_PHONE_NUMBER
    });
    console.log("✅ SMS sent:", msg.sid);
    return msg;
  } catch (error) {
    console.error("❌ SMS failed:", error.message || error);
    if (error.code) console.error("Twilio error code:", error.code);
    if (error.moreInfo) console.error("More info:", error.moreInfo);
    throw error;
  }
}

// quick local test: node sendSms.mjs --test
if (process.argv.includes("--test")) {
  (async () => {
    try {
      await sendSMS("Test message from project");
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  })();
}
