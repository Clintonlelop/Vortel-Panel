import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Respect the environment PORT (required for VPS/PaaS hosting)
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Optional shared-secret gate for /api/diagnose. When VORTEX_API_TOKEN is set,
// requests must include `Authorization: Bearer <token>` (or x-api-token header).
const API_TOKEN = process.env.VORTEX_API_TOKEN || "";

// In-memory fixed-window rate limiter (no external deps). Tune via env.
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 20;
const ipHits = new Map<string, { count: number; windowStart: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return next();
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    console.warn(`[rate-limit] 429 for ${ip}`);
    return res.status(429).json({
      error: "Too many requests. Please wait a minute before trying again.",
    });
  }
  return next();
}

// Periodically clear stale rate-limit entries to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) ipHits.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function requireApiToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!API_TOKEN) return next(); // Auth is optional when no token is configured
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const alt = (req.headers["x-api-token"] as string) || "";
  if (bearer === API_TOKEN || alt === API_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized. Missing or invalid API token." });
}

// ---- Gemini setup (server-side secret) ----
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    })
  : null;

// ---- Helpers ----

/** Strip markdown fences that LLMs often wrap JSON in. */
function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

/** Validate the shape of a diagnostic payload coming back from any LLM. */
function isValidDiagnostic(d: unknown): d is {
  errorAnalysis: string;
  brokenFileName: string;
  fixedContent: string;
  explanation: string;
} {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return (
    typeof o.errorAnalysis === "string" &&
    o.errorAnalysis.length > 0 &&
    typeof o.brokenFileName === "string" &&
    o.brokenFileName.length > 0 &&
    typeof o.fixedContent === "string" &&
    typeof o.explanation === "string"
  );
}

// ---- API routes ----

app.use(express.json({ limit: "512kb" }));

// Lightweight request logging (method, path, duration, status)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
    geminiConfigured: Boolean(ai),
    tokenRequired: Boolean(API_TOKEN),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/diagnose", rateLimit, requireApiToken, async (req, res) => {
  try {
    const { logs, files, errorText, qwenApiKey } = (req.body || {}) as {
      logs?: string;
      files?: Record<string, string>;
      errorText?: string;
      qwenApiKey?: string;
    };

    // Basic payload validation
    if (typeof logs !== "string" || typeof files !== "object" || files === null) {
      return res.status(400).json({ error: "Invalid request body: expected { logs, files }." });
    }
    const fileEntries = Object.entries(files).filter(([k, v]) => typeof k === "string" && typeof v === "string");
    if (fileEntries.length === 0) {
      return res.status(400).json({ error: "No files provided to diagnose." });
    }

    // 1) Prefer the user-supplied Qwen key (DashScope OpenAI-compatible endpoint)
    if (qwenApiKey && typeof qwenApiKey === "string" && qwenApiKey.trim() !== "") {
      try {
        const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${qwenApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: "qwen-plus",
            messages: [
              {
                role: "system",
                content:
                  "You are VORTEX PANEL AI, a senior systems engineer and bot deployment debugger. Your task is to analyze terminal error logs and file structures, isolate the problem file, explain the bug clearly, and provide the exact modified replacement code for the broken file.\n\nYou must return a JSON response matching this EXACT schema:\n{\n  \"errorAnalysis\": \"Brief analysis of the error and stack trace\",\n  \"brokenFileName\": \"bare file name only (e.g. index.js or package.json), no folders or paths\",\n  \"fixedContent\": \"the complete, modified file content with the bug fixed\",\n  \"explanation\": \"clear description of what was fixed\"\n}",
              },
              {
                role: "user",
                content: `ERROR TEXT:\n${errorText || "N/A"}\n\nTERMINAL LOGS:\n${logs}\n\nCURRENT FILE PATHS AND CONTENTS:\n${JSON.stringify(Object.fromEntries(fileEntries), null, 2)}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const assistantMessage = data.choices?.[0]?.message?.content;
          if (assistantMessage) {
            const parsed: unknown = JSON.parse(stripJsonFences(assistantMessage));
            if (isValidDiagnostic(parsed)) {
              return res.json({ success: true, engine: "Qwen AI (qwen-plus)", ...parsed });
            }
          }
        } else {
          const errText = await response.text();
          console.error("Qwen API failed, falling back to Gemini:", errText.slice(0, 500));
        }
      } catch (err: any) {
        console.error("Error calling Qwen API, falling back to Gemini:", err?.message);
      }
    }

    // 2) Fall back to Gemini with schema-enforced JSON output
    if (!ai) {
      return res.status(503).json({
        error:
          "No AI engine configured. Set GEMINI_API_KEY in the server environment (or provide a Qwen API key in the panel) to enable diagnostics.",
      });
    }

    const prompt = `ERROR TEXT:\n${errorText || "N/A"}\n\nTERMINAL LOGS:\n${logs}\n\nCURRENT FILE PATHS AND CONTENTS:\n${JSON.stringify(Object.fromEntries(fileEntries), null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are VORTEX PANEL AI, a senior systems engineer and bot deployment debugger. Your task is to analyze terminal error logs and file structures, isolate the problem file, explain the bug clearly, and provide the exact modified replacement code for the broken file. Return your analysis in the requested JSON structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errorAnalysis: { type: Type.STRING, description: "Brief analysis of the error and stack trace" },
            brokenFileName: {
              type: Type.STRING,
              description: "The bare file name only (e.g. 'index.js' or 'package.json'), no folders or paths",
            },
            fixedContent: {
              type: Type.STRING,
              description: "The FULL corrected file content with the fix applied. Do not truncate.",
            },
            explanation: { type: Type.STRING, description: "Clear explanation of what was fixed and why" },
          },
          required: ["errorAnalysis", "brokenFileName", "fixedContent", "explanation"],
        },
      },
    });

    if (response.text) {
      const parsed: unknown = JSON.parse(stripJsonFences(response.text.trim()));
      if (isValidDiagnostic(parsed)) {
        return res.json({ success: true, engine: "Vortex AI (Gemini Fallback)", ...parsed });
      }
      return res.status(502).json({ error: "AI engine returned a malformed diagnosis payload." });
    }
    return res.status(502).json({ error: "AI engine returned an empty response." });
  } catch (error: any) {
    console.error("Diagnosis error:", error);
    // Generic client message; details stay in server logs
    return res.status(500).json({ error: "Diagnostics engine failed. Please try again." });
  }
});
// Unknown API routes must answer with JSON (never the SPA HTML shell).
// Registered AFTER all real API routes so it only catches genuine misses.
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ---- Static/frontend serving ----

async function initialize() {
  if (process.env.NODE_ENV !== "production") {
    // vite is only needed in dev; keeping it out of the prod import graph keeps
    // the bundled server free of the whole dev-toolchain dependency tree.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error(
        `Fatal: production build output not found at ${distPath}. Run "npm run build" first.`
      );
      process.exit(1);
    }
    app.use(express.static(distPath));
    // SPA fallback that does NOT swallow API 404s (handled above)
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Vortex Panel server running on http://${HOST}:${PORT} (mode: ${process.env.NODE_ENV || "development"})`);
  });

  // Graceful shutdown (PM2 / systemd / docker stop friendly)
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed. Exiting.");
      process.exit(0);
    });
    // Force-exit if connections hang
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
  });
}

initialize().catch((err) => {
  console.error("Fatal: server failed to initialize:", err);
  process.exit(1);
});
