import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, "..", "..", "ml", "scripts");
const predictScript = path.join(scriptsDir, "predict_fever_model.py");
const trainScript = path.join(scriptsDir, "train_fever_model.py");
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
        console.error(`[FeverModel] Python script failed: ${errorMsg}`);
        console.error(`[FeverModel] Script path: ${scriptPath}`);
        console.error(`[FeverModel] Python executable: ${pythonExecutable}`);
        return reject(new Error(errorMsg));
      }
      try {
        const parsed = JSON.parse(stdout || "{}");
        resolve(parsed);
      } catch (error) {
        console.error(`[FeverModel] Failed to parse response. stdout: ${stdout}`);
        reject(new Error(`Failed to parse python response: ${error.message} | ${stdout}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

export async function predictFever(payload) {
  try {
    // Check if script file exists before attempting to run
    if (!fs.existsSync(predictScript)) {
      throw new Error(`Python prediction script not found at: ${predictScript}`);
    }
    return await runPython(predictScript, { action: "predict", payload });
  } catch (error) {
    console.error("[FeverModel] predictFever failed:", error.message);
    throw error;
  }
}

export async function trainFeverModel(options = {}) {
  return runPython(trainScript, { action: "train", options });
}


