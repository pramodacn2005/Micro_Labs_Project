import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, "..", "..", "ml", "scripts");
const predictScript = path.join(scriptsDir, "predict_lab_report_model.py");
const trainScript = path.join(scriptsDir, "train_lab_report_model.py");
const pythonExecutable = process.env.PYTHON_PATH || "python";

function runPython(scriptPath, inputPayload = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(inputPayload);
    const child = spawn(pythonExecutable, [scriptPath], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const errorMsg = stderr || `Python script exited with code ${code}`;
        console.error("[LabModel] Python script failed:", errorMsg);
        return reject(new Error(errorMsg));
      }
      try {
        const parsed = JSON.parse(stdout || "{}");
        resolve(parsed);
      } catch (error) {
        console.error("[LabModel] Failed to parse python response:", stdout);
        reject(new Error(`Failed to parse python response: ${error.message}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

export async function predictLabReportModel(payload) {
  if (!fs.existsSync(predictScript)) {
    throw new Error("Lab report prediction script is missing");
  }
  return runPython(predictScript, { action: "predict", payload });
}

export async function trainLabReportModel(options = {}) {
  if (!fs.existsSync(trainScript)) {
    throw new Error("Lab report training script is missing");
  }
  return runPython(trainScript, { action: "train", options });
}





