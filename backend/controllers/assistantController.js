import { GoogleGenerativeAI } from "@google/generative-ai";
import { lookupHospitals } from "../services/hospitalLookupService.js";

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const SYSTEM_PROMPT = `You are a helpful, educational medical assistant specializing in fever-related health information. Your role is to provide educational guidance only, NOT medical diagnosis or prescriptions.

IMPORTANT RULES:
1. You are NOT a doctor. Always remind users to consult healthcare professionals for medical advice.
2. When asked about medications, provide general information only and always say: "Consult a clinician for exact dosage."
3. Never provide specific prescription dosages. Only give general guidance.
4. Focus on educational topics: fever meaning, symptom explanations, hydration tips, home monitoring, when to visit hospital, understanding vitals (HR, Temp, SpO2, BP), and general advice.
5. Always include a disclaimer when discussing medications or treatments.
6. Be empathetic, clear, and professional.
7. Keep responses concise and actionable (2-3 paragraphs max).
8. For high fever (>39°C), always recommend urgent medical care.
9. For children under 5 years, emphasize stricter safety and immediate consultation.

ALLOWED TOPICS:
- Fever meaning and causes
- Symptom explanations (e.g., headache + fever)
- Hydration tips
- Home monitoring steps
- When to visit hospital
- Understanding vital signs (Heart Rate, Temperature, SpO2, Blood Pressure)
- General health advice
- OTC medication awareness (Paracetamol, Ibuprofen with cautions)

RESTRICTED:
- Do NOT provide specific prescription dosages
- Do NOT diagnose conditions
- Do NOT replace professional medical advice
- Do NOT provide emergency medical instructions beyond "seek immediate care"

Always end responses with: "⚠️ This is general advice, not a medical diagnosis. Consult a licensed healthcare professional for proper evaluation."`;

const DISCLAIMER = "\n\n⚠️ This is general advice, not a medical diagnosis. Consult a licensed healthcare professional for proper evaluation.";

export async function chatWithAssistant(req, res) {
  try {
    const { messages, location } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Invalid request. 'messages' array is required.",
      });
    }

    // Validate message format
    const validMessages = messages.filter(
      (msg) => msg.role && msg.content && typeof msg.content === "string"
    );

    if (validMessages.length === 0) {
      return res.status(400).json({
        error: "No valid messages found.",
      });
    }

    const lastMessage = validMessages[validMessages.length - 1];
    const userMessage = lastMessage.content.toLowerCase();

    // Check if user is asking for hospitals
    const isHospitalQuery = 
      userMessage.includes("hospital") || 
      userMessage.includes("nearest") || 
      userMessage.includes("near me") ||
      userMessage.includes("caregiver") ||
      userMessage.includes("emergency room");

    // Handle hospital lookup
    if (isHospitalQuery && location) {
      try {
        const hospitals = await lookupHospitals({
          lat: location.lat,
          lon: location.lng || location.lon,
          city: location.city,
        });

        if (hospitals && hospitals.length > 0) {
          let hospitalResponse = "Here are the nearest hospitals:\n\n";
          hospitals.forEach((hospital, index) => {
            hospitalResponse += `${index + 1}. **${hospital.name}**\n`;
            if (hospital.address) {
              hospitalResponse += `   Address: ${hospital.address}\n`;
            }
            if (hospital.distance_km) {
              hospitalResponse += `   Distance: ${hospital.distance_km} km\n`;
            }
            if (hospital.phone) {
              hospitalResponse += `   Phone: ${hospital.phone}\n`;
            }
            if (hospital.map_url) {
              hospitalResponse += `   [View on Map](${hospital.map_url})\n`;
            }
            hospitalResponse += "\n";
          });
          hospitalResponse += DISCLAIMER;
          return res.json({ reply: hospitalResponse });
        } else {
          // If no hospitals found, ask for location
          return res.json({
            reply: `I couldn't find hospitals near your location. Please share your city name or postal code, or enable location services so I can help you find the nearest medical facilities.${DISCLAIMER}`,
          });
        }
      } catch (error) {
        console.error("[Assistant] Hospital lookup error:", error);
        return res.json({
          reply: `I'm having trouble finding hospitals. Please share your city name or postal code, and I'll help you locate nearby medical facilities.${DISCLAIMER}`,
        });
      }
    }

    // If asking for hospitals but no location provided
    if (isHospitalQuery && !location) {
      return res.json({
        reply: `To find hospitals near you, please share your location (city name or postal code) or enable location services. For example, you can say "Find hospitals in [your city]" or "Nearest hospitals to [postal code]".${DISCLAIMER}`,
      });
    }

    // Use Gemini API if available, otherwise fallback to rule-based
    if (!geminiClient) {
      console.warn("[Assistant] Gemini API key not configured. Using rule-based responses.");
      const reply = generateRuleBasedResponse(lastMessage.content, location);
      return res.json({ reply });
    }

    // Prepare conversation history for Gemini
    // Gemini uses 'user' and 'model' roles instead of 'assistant'
    // Keep last 10 messages for context (to avoid token limits)
    const recentMessages = validMessages.slice(-10);
    
    // Build history array (all messages except the last one)
    const history = [];
    for (let i = 0; i < recentMessages.length - 1; i++) {
      const msg = recentMessages[i];
      if (msg.role === "assistant") {
        history.push({
          role: "model",
          parts: [{ text: msg.content }],
        });
      } else {
        history.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Get the model
    const model = geminiClient.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.8,
        topK: 40,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    // Send the last user message
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    let aiReply = response.text();

    // Add disclaimer if not already present
    if (!aiReply.includes("general advice") && !aiReply.includes("medical diagnosis")) {
      aiReply += DISCLAIMER;
    }

    // Apply safety rules
    aiReply = applySafetyRules(aiReply, lastMessage.content);

    return res.json({ reply: aiReply });
  } catch (error) {
    console.error("[Assistant] Error:", error);

    // Handle Gemini API errors
    if (error.message?.includes("API key") || error.message?.includes("quota")) {
      return res.status(500).json({
        error: "AI service error",
        reply: "Sorry, I'm unable to process that right now. Please try again later.",
      });
    }

    // Fallback to rule-based response
    try {
      const lastMessage = req.body.messages?.[req.body.messages.length - 1];
      const reply = generateRuleBasedResponse(
        lastMessage?.content || "Help me with fever",
        req.body.location
      );
      return res.json({ reply });
    } catch (fallbackError) {
      return res.status(500).json({
        error: "Internal server error",
        reply: "Sorry, I'm unable to process that right now. Please try again later.",
      });
    }
  }
}

function applySafetyRules(reply, userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for high fever mentions
  const highFeverMatch = lowerMessage.match(/(\d+\.?\d*)\s*°?[cf]|temperature.*?(\d+\.?\d*)/i);
  if (highFeverMatch) {
    const temp = parseFloat(highFeverMatch[1] || highFeverMatch[2]);
    if (temp >= 39.0) {
      if (!reply.includes("urgent") && !reply.includes("immediate")) {
        reply = "⚠️ **URGENT**: Your temperature indicates a high fever. Please seek immediate medical attention or visit the nearest emergency room.\n\n" + reply;
      }
    }
  }

  // Check for children mentions
  const childKeywords = ["child", "kid", "baby", "infant", "toddler", "5 years", "under 5"];
  const isChildQuery = childKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (isChildQuery) {
    if (!reply.includes("pediatric") && !reply.includes("children")) {
      reply = "⚠️ **Important for Children**: For children under 5 years, fevers can be more serious. Please consult a pediatrician immediately, especially if the fever is above 38.5°C or persists for more than 24 hours.\n\n" + reply;
    }
  }

  return reply;
}

function generateRuleBasedResponse(userMessage, location) {
  const lowerMessage = userMessage.toLowerCase();

  // Fever meaning
  if (lowerMessage.includes("fever") && (lowerMessage.includes("what") || lowerMessage.includes("mean"))) {
    return `Fever is a temporary increase in body temperature, usually above 37.5°C (99.5°F). It's often a sign that your body is fighting an infection. Common causes include viral or bacterial infections, inflammation, or other medical conditions.${DISCLAIMER}`;
  }

  // Symptom explanations
  if (lowerMessage.includes("headache") && lowerMessage.includes("fever")) {
    return `Headache with fever can indicate various conditions:
- Viral infections (common cold, flu)
- Bacterial infections
- Dehydration
- Sinus infections

**Home care**: Rest, stay hydrated, use a cool compress on your forehead. If the headache is severe, persistent, or accompanied by neck stiffness, seek medical attention immediately.${DISCLAIMER}`;
  }

  // Temperature ranges
  if (lowerMessage.includes("temperature") || lowerMessage.includes("temp")) {
    return `Normal body temperature ranges from 36.1°C to 37.2°C (97°F to 99°F). 
- Low-grade fever: 37.3°C to 38°C (99.1°F to 100.4°F)
- Moderate fever: 38.1°C to 39°C (100.5°F to 102.2°F)
- High fever: Above 39°C (102.2°F) - **Seek urgent medical care**

If your temperature exceeds 39°C or persists for more than 48 hours, consult a healthcare professional immediately.${DISCLAIMER}`;
  }

  // Heart rate
  if (lowerMessage.includes("heart rate") || lowerMessage.includes("pulse")) {
    return `Normal resting heart rate for adults is typically 60-100 beats per minute (bpm). During fever, your heart rate may increase. If it's consistently above 100 bpm at rest or you experience palpitations, consult a healthcare professional.${DISCLAIMER}`;
  }

  // SpO2
  if (lowerMessage.includes("spo2") || lowerMessage.includes("oxygen")) {
    return `SpO2 (blood oxygen saturation) should normally be 95-100%. Values below 95% may indicate respiratory issues and require medical attention. If your SpO2 drops below 90%, seek immediate medical care.${DISCLAIMER}`;
  }

  // Blood pressure
  if (lowerMessage.includes("blood pressure") || lowerMessage.includes("bp")) {
    return `Normal blood pressure is typically around 120/80 mmHg. During illness, blood pressure may fluctuate. If you experience very high (above 180/120) or very low (below 90/60) readings, consult a healthcare professional.${DISCLAIMER}`;
  }

  // Medication questions
  if (lowerMessage.includes("medication") || lowerMessage.includes("medicine") || lowerMessage.includes("tablet") || lowerMessage.includes("paracetamol") || lowerMessage.includes("ibuprofen")) {
    return `Common over-the-counter medications for fever include:

**Paracetamol (Acetaminophen)**:
- Generally safe for most people
- Can be taken every 4-6 hours
- Maximum daily dose varies by age/weight

**Ibuprofen**:
- Can help reduce fever and inflammation
- Should not be taken with certain conditions (stomach ulcers, kidney issues)
- Can interact with other medications

⚠️ **IMPORTANT**: Consult a clinician for exact dosage based on your age, weight, and medical history. Do not exceed recommended doses. Never give aspirin to children.${DISCLAIMER}`;
  }

  // When to see doctor
  if (lowerMessage.includes("doctor") || lowerMessage.includes("hospital") || lowerMessage.includes("when")) {
    return `You should seek medical care if:
- Temperature exceeds 39°C (102.2°F) - **URGENT**
- Fever persists for more than 48-72 hours
- Severe headache, stiff neck, or confusion
- Difficulty breathing or chest pain
- Severe dehydration (dry mouth, no urination)
- Persistent vomiting or inability to keep fluids down
- Signs of rash or severe pain
- For children under 5: fever above 38.5°C or any fever lasting more than 24 hours

For emergencies, call your local emergency services immediately.${DISCLAIMER}`;
  }

  // Hydration
  if (lowerMessage.includes("hydration") || lowerMessage.includes("water") || lowerMessage.includes("drink")) {
    return `Staying hydrated is crucial during fever:
- Drink plenty of water (8-10 glasses per day)
- Consider oral rehydration solutions (ORS) if you're sweating or have diarrhea
- Avoid caffeine and alcohol as they can cause dehydration
- Monitor urine color - it should be light yellow
- For children: offer small, frequent sips of water or ORS

If you're unable to keep fluids down, seek medical attention.${DISCLAIMER}`;
  }

  // Home precautions
  if (lowerMessage.includes("precaution") || lowerMessage.includes("care") || lowerMessage.includes("home")) {
    return `Home care for fever:
- **Rest**: Get plenty of sleep and avoid strenuous activities
- **Hydration**: Drink water, ORS, or clear fluids regularly
- **Monitoring**: Check temperature every 4-6 hours
- **Comfort**: Use light clothing, keep room temperature comfortable
- **Medication**: Use OTC fever reducers as directed (consult clinician for dosage)
- **Isolation**: Stay home to avoid spreading infection

Monitor symptoms closely. If they worsen or persist beyond 48 hours, consult a healthcare professional.${DISCLAIMER}`;
  }

  // General response
  return `I can help you understand fever symptoms, vital signs, medications, and when to seek medical care. Please ask a specific question about:
- Fever and temperature ranges
- Symptom explanations (headache, chills, etc.)
- Vital signs (heart rate, SpO2, blood pressure)
- OTC medications (Paracetamol, Ibuprofen) with cautions
- When to see a doctor or visit emergency
- Home care and hydration tips
- Finding nearby hospitals

${DISCLAIMER}`;
}
