import OpenAI from "openai";
import { lookupHospitals } from "./hospitalLookupService.js";
import { getMedicationSuggestions } from "./medicationService.js";

const openAIClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const DISCLAIMER =
  "This is an AI-driven suggestion, not a diagnosis. Consult a healthcare professional.";

function buildSystemPrompt(session) {
  const summaryParts = [
    `Prediction label: ${session?.prediction?.label}`,
    `Probability: ${Math.round((session?.prediction?.probability || 0) * 100)}%`,
    `Severity bucket: ${session?.prediction?.severity}`,
  ];

  if (session?.inputs?.age) summaryParts.push(`Age: ${session.inputs.age}`);
  if (session?.inputs?.gender) summaryParts.push(`Gender: ${session.inputs.gender}`);
  if (session?.inputs?.medical_history_text) {
    summaryParts.push(`Medical history: ${session.inputs.medical_history_text}`);
  }

  if (session?.labReport?.labValues) {
    const labEntries = Object.entries(session.labReport.labValues)
      .filter(([, value]) => value != null)
      .slice(0, 8)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    summaryParts.push(`Extracted lab values: ${labEntries || "N/A"}`);
    summaryParts.push(`Lab severity score: ${session.labReport.severity?.score ?? "n/a"}`);
  }

  const topFeatures = (session?.explainability?.top_features || [])
    .slice(0, 5)
    .map((f) => `${f.feature} (${(f.importance * 100).toFixed(1)}%)`)
    .join(", ");
  if (topFeatures) {
    summaryParts.push(`Top contributing features: ${topFeatures}`);
  }

  if (session?.medications?.length) {
    const medNames = session.medications.map((med) => med.name).join(", ");
    summaryParts.push(`Medication plan: ${medNames}`);
  }

  const summary = summaryParts.join("\n");

  return `
You are a helpful, cautious medical assistant. 
Use the provided patient inputs and model prediction to generate safe, non-prescriptive advice.
Always include a short disclaimer: "${DISCLAIMER}"
When asked for medication suggestions, only present items from the clinician-verified medication list and show dosing ranges marked as "Example - verify with clinician".
When asked for nearby hospitals, use the provided hospital lookup results if available.
Keep responses concise, actionable, and remind the user to seek professional care for emergencies.

Context:
${summary}
`;
}

function buildRuleBasedResponse({ intent, session, hospitals, meds, dietPlan }) {
  const severity = session?.prediction?.severity || "low probability";
  const basePrecautions = [
    "Stay hydrated with water or electrolyte-rich fluids.",
    "Get adequate rest and avoid strenuous activity.",
    "Monitor temperature and visit a clinician if it stays high for over 48 hours.",
  ];

  const severeAdditions =
    severity.toLowerCase().includes("high") || severity.toLowerCase().includes("moderate")
      ? [
          "Seek urgent care if temperature exceeds 39°C or breathing becomes difficult.",
          "Arrange for someone to check on you frequently until symptoms improve.",
        ]
      : [];

  let content = "";
  if (intent === "hospital" && hospitals?.length) {
    content += "Here are nearby hospitals:\n";
    hospitals.forEach((hosp, idx) => {
      content += `${idx + 1}. ${hosp.name} (${hosp.distance_km ?? "?"} km) - ${hosp.phone || "phone unavailable"}\n`;
    });
  } else if (intent === "medication" && meds?.length) {
    content += "Example OTC guidance (verify with clinician):\n";
    meds.forEach((med) => {
      content += `• ${med.name} (${med.clinicianVerified ? "Clinician verified" : "Pending clinician verification"}): ${
        med.guidance
      }\n`;
    });
  } else if (intent === "diet") {
    content += "Suggested diet focus:\n";
    (dietPlan || []).forEach((item) => {
      content += `• ${item}\n`;
    });
  } else {
    content += `${basePrecautions.concat(severeAdditions).join(" ")}`;
  }

  return `${content}\n\n${DISCLAIMER}`;
}

export async function generateAssistantResponse({ session, message, hospitals }) {
  const sanitizedMessage = message?.trim();
  if (!sanitizedMessage) {
    return { reply: `Please provide a question. ${DISCLAIMER}` };
  }

  const intent = (() => {
    const lower = sanitizedMessage.toLowerCase();
    if (lower.includes("hospital") || lower.includes("emergency")) return "hospital";
    if (lower.includes("tablet") || lower.includes("medicine") || lower.includes("medication")) return "medication";
    if (lower.includes("diet") || lower.includes("food")) return "diet";
    if (lower.includes("precaution") || lower.includes("care")) return "precaution";
    return "general";
  })();

  const meds = intent === "medication" ? getMedicationSuggestions({ age: session?.inputs?.age, severityBucket: session?.prediction?.severity }) : [];
  const dietPlan =
    session?.suggestions?.dietPlan ||
    [
      "Light meals with soups and steamed vegetables.",
      "Vitamin-C rich fruits (oranges, kiwi) if tolerated.",
      "Avoid caffeine and alcohol until fever resolves.",
      "Oral rehydration solutions after perspiration or vomiting.",
    ];

  if (!openAIClient) {
    const reply = buildRuleBasedResponse({ intent, session, hospitals, meds, dietPlan });
    return { reply, intent };
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(session) },
    ...(session.assistantHistory || []).slice(-6),
    {
      role: "user",
      content: `${sanitizedMessage}

Context:
Hospitals: ${JSON.stringify(hospitals || [])}
Medications: ${JSON.stringify(meds || [])}
Diet plan: ${JSON.stringify(dietPlan)}
`,
    },
  ];

  const completion = await openAIClient.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 400,
    messages,
  });

  const aiReply = completion.choices?.[0]?.message?.content;
  const reply = `${aiReply?.trim()}\n\n${DISCLAIMER}`;
  return { reply, intent, meds, dietPlan };
}












