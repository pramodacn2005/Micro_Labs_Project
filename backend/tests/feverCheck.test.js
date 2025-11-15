import { jest } from "@jest/globals";
import request from "supertest";

const mockPredictFever = jest.fn();
const mockGenerateReport = jest.fn();
const mockLookupHospitals = jest.fn();
const mockMedicationSuggestions = jest.fn();
const mockSaveSession = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateSession = jest.fn();
const mockAssistantResponse = jest.fn();

async function createApp() {
  jest.unstable_mockModule("../services/feverModelService.js", () => ({
    predictFever: mockPredictFever,
    trainFeverModel: jest.fn().mockResolvedValue({ metrics: {} }),
  }));

  jest.unstable_mockModule("../services/pdfReportService.js", () => ({
    generateFeverReport: mockGenerateReport,
    readReportBuffer: jest.fn(),
  }));

  jest.unstable_mockModule("../services/hospitalLookupService.js", () => ({
    lookupHospitals: mockLookupHospitals,
  }));

  jest.unstable_mockModule("../services/medicationService.js", () => ({
    getMedicationSuggestions: mockMedicationSuggestions,
  }));

  jest.unstable_mockModule("../store/feverSessionStore.js", () => ({
    saveSession: mockSaveSession,
    getSession: mockGetSession,
    updateSession: mockUpdateSession,
  }));

  jest.unstable_mockModule("../services/assistantService.js", () => ({
    generateAssistantResponse: mockAssistantResponse,
  }));

  const mod = await import("../app.js");
  return mod.default;
}

const basePayload = {
  age: 30,
  gender: "Male",
  heart_rate_bpm: 100,
  respiratory_rate_bpm: 18,
  spo2: 98,
  bp_systolic: 120,
  bp_diastolic: 80,
  chills: true,
  sweating: false,
  loss_of_appetite: false,
  sore_throat: true,
  runny_nose: false,
  nasal_congestion: false,
  vomiting: false,
  fatigue: "mild",
  headache: "none",
  body_aches: "mild",
  breathing_difficulty: "none",
  cough: "dry",
  body_pain_scale: 3,
  alcohol_consumption: "none",
  medical_history: false,
  medical_history_text: "",
  body_temperature: { temperature_value: 38.2, temperature_unit: "C" },
  consent: true,
};

describe("Fever Symptoms Checker API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPredictFever.mockResolvedValue({
      prediction: { label: "Moderate Fever", probability: 0.81, severity: "High probability" },
      explainability: { top_features: [{ feature: "temperature_c", importance: 0.4 }] },
    });
    mockGenerateReport.mockResolvedValue({
      reportId: "report_test",
      filePath: "/tmp/report.enc",
      pdfUrl: "http://localhost:4000/api/reports/report_test?sessionId=session123",
    });
    mockLookupHospitals.mockResolvedValue([{ name: "Test Hospital", address: "123 Main St" }]);
    mockMedicationSuggestions.mockReturnValue([
      { id: "paracetamol", name: "Paracetamol", clinicianVerified: false, guidance: "Example", source: "" },
    ]);
    mockGetSession.mockResolvedValue({
      sessionId: "session123",
      reportId: "report_test",
      reportPath: "/tmp/report.enc",
      consent: true,
      inputs: {},
      hospitals: [{ name: "Test Hospital" }],
      assistantHistory: [],
    });
    mockAssistantResponse.mockResolvedValue({ reply: "Stay hydrated", intent: "precaution" });
  });

  test("POST /api/fever-check returns prediction payload", async () => {
    const app = await createApp();
    const response = await request(app).post("/api/fever-check").send(basePayload).expect(200);

    expect(response.body.prediction.label).toBe("Moderate Fever");
    expect(mockPredictFever).toHaveBeenCalledTimes(1);
    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });

  test("POST /api/fever-check fails without consent", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/fever-check")
      .send({ ...basePayload, consent: false })
      .expect(400);

    expect(response.body.message).toBe("Invalid payload");
  });

  test("POST /api/ai-assistant/:sessionId/message returns reply", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/ai-assistant/session123/message")
      .send({ message: "Suggest precautions" })
      .expect(200);

    expect(response.body.reply).toContain("Stay hydrated");
    expect(mockAssistantResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Suggest precautions",
      })
    );
  });
});

