const FIELD_PATTERNS = [
  {
    key: "wbc_count",
    label: "WBC count",
    regexes: [
      /wbc\s*(?:count)?\s*[:=]\s*([\d,.]+)/i,
      /wbc\s+(?:count\s+)?([\d,.]+)/i,
      /white\s+blood\s+cells?\s*[:=]?\s*([\d,.]+)/i,
      /wbc[^\d]{0,10}([\d,.]+)/i,
    ],
    unit: "cells/µL",
  },
  {
    key: "rbc_count",
    label: "RBC count",
    regexes: [
      /rbc\s*(?:count)?\s*[:=]\s*([\d,.]+)/i,
      /rbc\s+(?:count\s+)?([\d,.]+)/i,
      /red\s+blood\s+cells?\s*[:=]?\s*([\d,.]+)/i,
      /rbc[^\d]{0,10}([\d,.]+)/i,
    ],
    unit: "millions/µL",
  },
  {
    key: "platelet_count",
    label: "Platelet count",
    regexes: [
      /platelets?\s*[:=]\s*([\d,.]+)/i,
      /platelets?\s+([\d,.]+)/i,
      /plt\s*[:=]?\s*([\d,.]+)/i,
      /platelets?[^\d]{0,10}([\d,.]+)/i,
    ],
    unit: "cells/µL",
  },
  {
    key: "crp",
    label: "CRP",
    regexes: [
      /crp\s*[:=]\s*([\d.,]+)/i,
      /crp\s+([\d.,]+)/i,
      /c[-\s]*reactive\s*protein\s*[:=]?\s*([\d.,]+)/i,
      /crp[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "mg/L",
  },
  {
    key: "esr",
    label: "ESR",
    regexes: [
      /esr\s*[:=]\s*([\d.,]+)/i,
      /esr\s+([\d.,]+)/i,
      /erythrocyte\s+sedimentation\s+rate\s*[:=]?\s*([\d.,]+)/i,
      /esr[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "mm/hr",
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    regexes: [
      /hgb\s*[:=]\s*([\d.,]+)/i,
      /hgb\s+([\d.,]+)/i,
      /hemoglobin\s*[:=]?\s*([\d.,]+)/i,
      /hb\s*[:=]?\s*([\d.,]+)/i,
      /hemoglobin[^\d]{0,10}([\d.,]+)/i,
      /hgb[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "g/dL",
  },
  {
    key: "neutrophils",
    label: "Neutrophils %",
    regexes: [
      /neutrophils?\s*[:=]\s*([\d.,]+)/i,
      /neutrophils?\s+([\d.,]+)/i,
      /neut\s*%?\s*[:=]?\s*([\d.,]+)/i,
      /neutrophils?[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "%",
  },
  {
    key: "lymphocytes",
    label: "Lymphocytes %",
    regexes: [
      /lymphocytes?\s*[:=]\s*([\d.,]+)/i,
      /lymphocytes?\s+([\d.,]+)/i,
      /lymph\s*%?\s*[:=]?\s*([\d.,]+)/i,
      /lymphocytes?[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "%",
  },
  {
    key: "temperature_c",
    label: "Temperature °C",
    regexes: [
      /temp(?:erature)?\s*[:=]\s*([\d.,]+)/i,
      /temp(?:erature)?\s+([\d.,]+)/i,
      /temp[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "°C",
  },
  {
    key: "spo2",
    label: "SpO2 %",
    regexes: [
      /spo2\s*[:=]\s*([\d.,]+)/i,
      /spo2\s+([\d.,]+)/i,
      /oxygen\s+saturation\s*[:=]?\s*([\d.,]+)/i,
      /spo2[^\d]{0,10}([\d.,]+)/i,
    ],
    unit: "%",
  },
  {
    key: "heart_rate_bpm",
    label: "Heart rate",
    regexes: [
      /hr\s*[:=]\s*([\d.,]+)/i,
      /heart\s+rate\s*[:=]?\s*([\d.,]+)/i,
      /pulse\s*[:=]?\s*([\d.,]+)/i,
      /hr[^\d]{0,5}([\d.,]+)/i,
    ],
    unit: "bpm",
  },
];

const FEVER_MARKER_KEYWORDS = [
  { key: "dengue", label: "Dengue marker", patterns: [/dengue/i, /ns1/i, /igg/i, /igm/i] },
  { key: "malaria", label: "Malaria marker", patterns: [/malaria/i, /plasmodium/i, /pfhrp2/i] },
  { key: "typhoid", label: "Typhoid marker", patterns: [/typhoid/i, /widal/i, /salmonella/i] },
  { key: "bacterial", label: "Bacterial infection", patterns: [/bacterial/i, /culture\s+positive/i] },
  { key: "viral", label: "Viral marker", patterns: [/viral/i, /influenza/i, /adenovirus/i, /covid/i] },
];

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const cleaned = value.toString().replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : Number(parsed.toFixed(2));
}

function findInLines(lines, patterns) {
  // Try exact line matches first
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const value = toNumber(match[1]);
        if (value != null) {
          return value;
        }
      }
    }
  }
  
  // Try searching across multiple lines (for values that might be split)
  const fullText = lines.join(" ");
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const value = toNumber(match[1]);
      if (value != null) {
        return value;
      }
    }
  }
  
  return null;
}

export function parseLabReport({ text = "", rows = [] }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(line => line.length > 0);
  const values = {};
  const extractionMeta = {};

  console.log("[LabParser] Parsing text. Total lines:", lines.length, "Text length:", text.length);
  console.log("[LabParser] Sample lines (first 10):", lines.slice(0, 10));

  FIELD_PATTERNS.forEach((field) => {
    let value = findInLines(lines, field.regexes);
    if (value == null && rows.length > 0) {
      const rowTexts = rows.map((row) => `${row.label || ""} ${row.value || ""}`).filter(r => r.trim());
      value = findInLines(rowTexts, field.regexes);
    }
    
    // If still not found, try searching in the full text (removing line breaks)
    if (value == null) {
      const fullTextNoBreaks = text.replace(/\s+/g, " ");
      for (const pattern of field.regexes) {
        const match = fullTextNoBreaks.match(pattern);
        if (match && match[1]) {
          value = toNumber(match[1]);
          if (value != null) break;
        }
      }
    }
    
    values[field.key] = value;
    extractionMeta[field.key] = {
      label: field.label,
      unit: field.unit,
      raw: value,
      confidence: value != null ? 0.75 : 0,
    };
    
    if (value != null) {
      console.log(`[LabParser] ✓ Extracted ${field.label}: ${value}`);
    }
  });

  const extractedCount = Object.values(values).filter(v => v != null).length;
  console.log(`[LabParser] Extraction complete. Found ${extractedCount} out of ${FIELD_PATTERNS.length} parameters`);

  const detectedMarkers = [];
  FEVER_MARKER_KEYWORDS.forEach((marker) => {
    const matched = marker.patterns.some((pattern) => pattern.test(text));
    if (matched) {
      detectedMarkers.push(marker.label);
    }
  });

  return {
    values,
    extractionMeta,
    detectedMarkers,
    textPreview: text.slice(0, 4000),
    tableRows: rows,
  };
}


