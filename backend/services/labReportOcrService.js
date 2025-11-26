import axios from "axios";
import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";

const DEFAULT_PROVIDER = (process.env.LAB_REPORT_OCR_PROVIDER || "google").toLowerCase();
const MAX_FILE_SIZE_MB = Number(process.env.LAB_REPORT_MAX_FILE_MB || 10);

function ensureFileSupported(file) {
  if (!file) {
    throw new Error("No lab report file provided");
  }
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/heic",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error("Unsupported file type. Upload PDF, PNG, or JPG reports.");
  }
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(`File too large. Max allowed size is ${MAX_FILE_SIZE_MB} MB.`);
  }
}

function extractCandidateRows(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row && /\d/.test(row))
    .slice(0, 60)
    .map((row) => {
      const [label, value] = row.split(/[:\-]/).map((chunk) => chunk?.trim());
      return {
        raw: row,
        label: label || row,
        value: value || "",
      };
    });
}

async function runGoogleVision(file) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not configured");
  }

  const base64 = file.buffer.toString("base64");
  const requestPayload = {
    requests: [
      {
        features: [
          { type: "DOCUMENT_TEXT_DETECTION" },
          { type: "TEXT_DETECTION" },
        ],
        imageContext: {
          languageHints: ["en", "en-t-i0-handwrit", "en-t-medical"],
        },
      },
    ],
  };

  if (file.mimetype === "application/pdf" || file.mimetype === "application/tiff") {
    requestPayload.requests[0].inputConfig = {
      content: base64,
      mimeType: file.mimetype,
    };
  } else {
    requestPayload.requests[0].image = {
      content: base64,
    };
  }

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const { data } = await axios.post(endpoint, requestPayload, {
    timeout: Number(process.env.LAB_REPORT_OCR_TIMEOUT_MS || 25000),
  });

  const response = data?.responses?.[0];
  const text = response?.fullTextAnnotation?.text || "";

  return {
    provider: "google_vision",
    text,
    warnings: response?.error ? [response.error.message] : [],
    confidence: response?.fullTextAnnotation?.pages?.[0]?.confidence,
    rows: extractCandidateRows(text),
  };
}

async function runTesseract(file) {
  if (file.mimetype === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    return {
      provider: "pdf_parse",
      text: parsed.text || "",
      warnings: [],
      confidence: null,
      rows: extractCandidateRows(parsed.text),
    };
  }

  const result = await Tesseract.recognize(file.buffer, "eng", {
    logger: () => {},
  });
  return {
    provider: "tesseract",
    text: result?.data?.text || "",
    warnings: result?.data?.confidence < 60 ? ["Low OCR confidence"] : [],
    confidence: result?.data?.confidence,
    rows: extractCandidateRows(result?.data?.text),
  };
}

export async function extractLabReportText(file) {
  ensureFileSupported(file);

  const provider = DEFAULT_PROVIDER;
  try {
    if (provider === "google") {
      return await runGoogleVision(file);
    }
    if (provider === "tesseract") {
      return await runTesseract(file);
    }
    // Default fallback: use Google first, Tesseract fallback
    return await runGoogleVision(file);
  } catch (error) {
    console.warn("[LabOCR] Primary OCR failed:", error.message);
    return await runTesseract(file);
  }
}





