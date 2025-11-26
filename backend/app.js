import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
//import vitalsRouter from "./routes/vitals.js";
dotenv.config();
import vitalsRouter from "./controllers/vitalsControllerSimple.js";
import fileRouter from "./controllers/fileController.js";
import medicineAlertsRouter from "./routes/medicineAlerts.js";
import vitalAlertsRouter from "./routes/vitalAlerts.js";
import feverRouter from "./routes/feverCheckRoutes.js";
import assistantRouter from "./routes/assistantRoutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import prescriptionRouter from "./routes/prescriptionRoutes.js";
import labReportRouter from "./routes/labReportRoutes.js";

// Load .env from backend directory by default. If you keep a single root .env, set ENV_PATH.
dotenv.config({ path: process.env.ENV_PATH || new URL(".env", import.meta.url) });

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration - allow frontend origin and handle preflight
// In development, allow all origins to avoid CORS issues
// In production, set CORS_ORIGIN to specific allowed origins
const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow all origins
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
      : [];
    
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware only once
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(morgan("tiny"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/vitals", vitalsRouter);
app.use("/api/files", fileRouter);
app.use("/api/medicine-alerts", medicineAlertsRouter);
app.use("/api/vital-alerts", vitalAlertsRouter);
app.use("/api", feverRouter);
app.use("/api", assistantRouter);
app.use("/api", appointmentRouter);
app.use("/api", prescriptionRouter);
app.use("/api", labReportRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

export default app;
