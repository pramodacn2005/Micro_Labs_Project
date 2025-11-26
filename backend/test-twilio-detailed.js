// Detailed Twilio test with error handling
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.DOCTOR_PHONE_NUMBER;

console.log("🔍 Detailed Twilio Test");
console.log("Account SID:", accountSid);
console.log("Auth Token:", authToken ? "✅ Present" : "❌ Missing");
console.log("From Number:", fromNumber);
console.log("To Number:", toNumber);

async function testTwilioDirectly() {
  try {
    const client = twilio(accountSid, authToken);
    
    // First, let's try to get account info to verify credentials
    console.log("\n🔍 Testing Twilio credentials...");
    const account = await client.api.accounts(accountSid).fetch();
    console.log("✅ Twilio credentials valid");
    console.log("Account Status:", account.status);
    console.log("Account Type:", account.type);
    
    // Check if we can send SMS
    console.log("\n📱 Testing SMS sending...");
    const message = await client.messages.create({
      body: "🚨 Test SMS from Healthcare Dashboard",
      from: fromNumber,
      to: toNumber
    });
    
    console.log("✅ SMS sent successfully!");
    console.log("Message SID:", message.sid);
    console.log("Status:", message.status);
    
  } catch (error) {
    console.error("❌ Twilio Error Details:");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("More Info:", error.moreInfo);
    
    if (error.code === 21211) {
      console.log("\n💡 Solution: The 'To' phone number is not verified in your Twilio account.");
      console.log("   For trial accounts, you can only send SMS to verified phone numbers.");
      console.log("   Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified");
    } else if (error.code === 21614) {
      console.log("\n💡 Solution: The 'From' phone number is not a valid Twilio phone number.");
      console.log("   Make sure you're using a phone number purchased from Twilio.");
    } else if (error.code === 20003) {
      console.log("\n💡 Solution: Authentication failed. Check your Account SID and Auth Token.");
    }
  }
}

testTwilioDirectly();


























