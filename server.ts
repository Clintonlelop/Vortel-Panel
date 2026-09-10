import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Shared Gemini AI setup (with custom telemetry User-Agent as required)
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/diagnose", async (req, res) => {
  try {
    const { logs, files, errorText, qwenApiKey } = req.body;

    // 1. If user provides a Qwen API Key, attempt to call Qwen via DashScope compatible mode
    if (qwenApiKey && qwenApiKey.trim() !== "") {
      try {
        const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${qwenApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: "qwen-plus",
            messages: [
              {
                role: "system",
                content: "You are VORTEX PANEL AI, a senior systems engineer and bot deployment debugger. Your task is to analyze terminal error logs and file structures, isolate the problem file, explain the bug clearly, and provide the exact modified replacement code for the broken file.\n\nYou must return a JSON response matching this EXACT schema:\n{\n  \"errorAnalysis\": \"Brief analysis of the error and stack trace\",\n  \"brokenFileName\": \"relative/path/to/file (e.g. package.json or index.js)\",\n  \"fixedContent\": \"the complete, modified file content with the bug fixed\",\n  \"explanation\": \"clear description of what was fixed\"\n}",
              },
              {
                role: "user",
                content: `ERROR TEXT:\n${errorText || "N/A"}\n\nTERMINAL LOGS:\n${logs || ""}\n\nCURRENT FILE PATHS AND CONTENTS:\n${JSON.stringify(files, null, 2)}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const assistantMessage = data.choices?.[0]?.message?.content;
          if (assistantMessage) {
            const parsed = JSON.parse(assistantMessage);
            return res.json({
              success: true,
              engine: "Qwen AI (qwen-plus)",
              ...parsed,
            });
          }
        } else {
          const errText = await response.text();
          console.error("Qwen API failed, falling back to Gemini", errText);
        }
      } catch (err: any) {
        console.error("Error calling Qwen API, falling back to Gemini", err.message);
      }
    }

    // 2. Fall back to Gemini with secure schema-enforced JSON schema
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured on the server, and no valid Qwen API key was provided.",
      });
    }

    const prompt = `ERROR TEXT:\n${errorText || "N/A"}\n\nTERMINAL LOGS:\n${logs || ""}\n\nCURRENT FILE PATHS AND CONTENTS:\n${JSON.stringify(files, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are VORTEX PANEL AI, a senior systems engineer and bot deployment debugger. Your task is to analyze terminal error logs and file structures, isolate the problem file, explain the bug clearly, and provide the exact modified replacement code for the broken file. Return your analysis in the requested JSON structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errorAnalysis: { type: Type.STRING, description: "Brief analysis of the error and stack trace" },
            brokenFileName: { type: Type.STRING, description: "The relative path to the file that is broken, e.g. package.json or index.js" },
            fixedContent: { type: Type.STRING, description: "The FULL corrected file content with the fix applied. Do not truncate." },
            explanation: { type: Type.STRING, description: "Clear explanation of what was fixed and why" }
          },
          required: ["errorAnalysis", "brokenFileName", "fixedContent", "explanation"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return res.json({
        success: true,
        engine: "Vortex AI (Gemini Fallback)",
        ...parsed,
      });
    } else {
      throw new Error("Empty response from Gemini");
    }

  } catch (error: any) {
    console.error("Diagnosis error:", error);
    res.status(500).json({
      error: "Diagnostics engine failed: " + error.message,
    });
  }
});

// Configure Vite or Static Asset Middleware
async function initialize() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vortex Panel server running on http://localhost:${PORT}`);
  });
}

initialize();
