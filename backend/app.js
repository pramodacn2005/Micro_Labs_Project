import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import vitalsRouter from "./routes/vitals.js";

// Load .env from backend directory by default. If you keep a single root .env, set ENV_PATH.
dotenv.config({ path: process.env.ENV_PATH || new URL(".env", import.meta.url) });

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || ["*"] }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/vitals", vitalsRouter);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});



