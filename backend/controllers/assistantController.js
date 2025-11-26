// -----------------------------------------------------------
//  assistantController.js
// -----------------------------------------------------------

import { GoogleGenerativeAI } from "@google/generative-ai";
import { lookupHospitals } from "../services/hospitalLookupService.js";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

// --------------------------------------------
// 1️⃣ GLOBAL VARIABLES
// --------------------------------------------

// ✔ Load API key securely
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in .env file");
}

let geminiClient = null;

// --------------------------------------------
// 2️⃣ INITIALIZE GEMINI CLIENT
// --------------------------------------------
function initializeGeminiClient() {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log("✅ Gemini client initialized");
    return true;
  } catch (err) {
    console.error("❌ Gemini initialization failed:", err.message);
    geminiClient = null;
    return false;
  }
}

// Initialize on file load
initializeGeminiClient();

// --------------------------------------------
// 3️⃣ SYSTEM PROMPT + DISCLAIMER
// --------------------------------------------
const SYSTEM_PROMPT = `
You are Medibot, a simple and helpful medical chatbot.

Rules:
- Give clear, friendly, medically correct information
- Explain symptoms, conditions, vitals in simple language
- Do NOT give medication dosages
- Always recommend seeing a doctor if symptoms are serious
- Be empathetic and supportive
`;

const DISCLAIMER = `
⚠️ This is general information, not a medical diagnosis. Always consult a licensed doctor for proper evaluation.
`;

// --------------------------------------------
// 4️⃣ MAIN CONTROLLER FUNCTION
// --------------------------------------------
const buildFeverContext = (feverAnalysis) => {
  if (!feverAnalysis || typeof feverAnalysis !== "object") return "";
  const { userId, ...analysisData } = feverAnalysis;
  try {
    return JSON.stringify(analysisData, null, 2);
  } catch (err) {
    console.warn("Failed to stringify fever analysis:", err);
    return "";
  }
};

const fetchFeverAnalysisForUser = async (userId) => {
  if (!userId) return null;
  try {
    const firestore = getFirestore();
    const userDocRef = firestore.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) return null;
    const data = userDoc.data() || {};
    return data.feverAnalysis || null;
  } catch (err) {
    console.warn("Failed to fetch fever analysis from Firestore:", err);
    return null;
  }
};

export async function chatWithAssistant(req, res) {
  try {
    const { messages, location, feverAnalysis } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request — messages[] is required.",
      });
    }

    // --------------------------------------------
    // A: HANDLE HOSPITAL LOOKUP REQUEST
    // --------------------------------------------
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage.content.toLowerCase();

    const isHospitalQuery =
      text.includes("hospital") ||
      text.includes("near me") ||
      text.includes("nearest hospital") ||
      text.includes("emergency room");

    if (isHospitalQuery && location) {
      try {
        const hospitals = await lookupHospitals({
          lat: location.lat,
          lon: location.lng || location.lon,
          city: location.city,
        });

        if (!hospitals || hospitals.length === 0) {
          return res.json({
            reply: `I couldn't find hospitals near you. Please provide your city name or PIN code.\n${DISCLAIMER}`,
          });
        }

        let reply = "Here are the nearest hospitals:\n\n";

        hospitals.forEach((h, i) => {
          reply += `${i + 1}. **${h.name}**\n`;
          if (h.address) reply += `   Address: ${h.address}\n`;
          if (h.distance_km) reply += `   Distance: ${h.distance_km} km\n`;
          if (h.phone) reply += `   Phone: ${h.phone}\n`;
          if (h.map_url) reply += `   [Google Map](${h.map_url})\n`;
          reply += "\n";
        });

        reply += DISCLAIMER;

        return res.json({ reply });
      } catch (err) {
        return res.json({
          reply: `I couldn’t fetch nearby hospitals. Please provide your city.\n${DISCLAIMER}`,
        });
      }
    }

    if (isHospitalQuery && !location) {
      return res.json({
        reply: `Please share your city name or postal code so I can find hospitals near you.\n${DISCLAIMER}`,
      });
    }

    // --------------------------------------------
    // B: ENSURE GEMINI CLIENT IS READY
    // --------------------------------------------
    if (!geminiClient) {
      console.log("⚠ Gemini missing — reinitializing…");
      const ok = initializeGeminiClient();
      if (!ok) {
        return res.status(500).json({
          error: "Gemini unavailable",
          reply: "AI service temporarily unavailable.",
        });
      }
    }

    // --------------------------------------------
    // C: PREPARE CHAT HISTORY FOR GEMINI
    // --------------------------------------------
    const recent = messages.slice(-10);

    let history = [];

    for (let i = 0; i < recent.length - 1; i++) {
      const msg = recent[i];

      history.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    // Inject fever analysis context before processing history order
    let mergedFeverAnalysis = feverAnalysis || {};
    if ((!mergedFeverAnalysis || Object.keys(mergedFeverAnalysis).length <= 1) && mergedFeverAnalysis.userId) {
      const storedAnalysis = await fetchFeverAnalysisForUser(mergedFeverAnalysis.userId);
      if (storedAnalysis) {
        mergedFeverAnalysis = { ...storedAnalysis, userId: mergedFeverAnalysis.userId };
      }
    }
    const feverContextString = buildFeverContext(mergedFeverAnalysis);
    if (feverContextString) {
      history.unshift({
        role: "user",
        parts: [
          {
            text: `Patient Fever Analysis (JSON):\n${feverContextString}\n\nUse this data when answering.`,
          },
        ],
      });
    }

    // 🚨 FIX: Remove model messages at beginning
    while (history.length > 0 && history[0].role !== "user") {
      console.log("⚠ Removing invalid first model message");
      history.shift();
    }

    // --------------------------------------------
    // D: MODEL SETUP
    // --------------------------------------------
    const model = geminiClient.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
    });

    // --------------------------------------------
    // E: MESSAGE TO SEND TO GEMINI
    // --------------------------------------------
    const feverPromptSegment = feverContextString
      ? `\nPatient fever analysis data (JSON):\n${feverContextString}\n\nUse the above data to personalize your advice.\n`
      : "";

    let prompt = `${feverPromptSegment}${lastMessage.content}`;

    // If no previous messages → include system prompt
    if (history.length === 0) {
      prompt = `${SYSTEM_PROMPT}${feverPromptSegment}\nUser: ${lastMessage.content}`;
    }

    // --------------------------------------------
    // F: CALL GEMINI API
    // --------------------------------------------
    let result;
    try {
      result = await chat.sendMessage(prompt);
    } catch (err) {
      console.error("Gemini API error:", err);

      return res.status(500).json({
        error: "Gemini error",
        reply: `Sorry, I encountered an error: ${err.message}`,
      });
    }

    if (!result?.response?.text) {
      return res.json({
        reply: "Sorry, I could not generate a response.",
      });
    }

    const reply = result.response.text();

    return res.json({
      reply,
      source: "gemini-api",
    });

  } catch (err) {
    console.error("❌ Top-level error:", err);

    return res.status(500).json({
      error: "Server error",
      reply: "Sorry, an error occurred.",
    });
  }
}
