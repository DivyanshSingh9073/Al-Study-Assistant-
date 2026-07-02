import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API routes FIRST
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, jsonMode } = req.body;
      
      // Check if client provided an API key header
      const clientKey = req.headers["x-custom-gemini-key"];
      
      // Determine which key to use: client key or system key
      let apiKeyToUse = (typeof clientKey === "string" && clientKey.trim() && !clientKey.includes("•"))
        ? clientKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKeyToUse) {
        console.warn("No API key found. Falling back to empty or placeholder.");
        return res.status(400).json({ error: { message: "API_KEY_MISSING" } });
      }

      let response;
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKeyToUse,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        const config: any = {
          temperature: 0.7,
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (jsonMode) {
          config.responseMimeType = "application/json";
        }

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: config
        });
      } catch (firstError: any) {
        // If the first attempt used a custom key and failed, try to fallback to process.env.GEMINI_API_KEY
        const isCustomKeyUsed = apiKeyToUse !== process.env.GEMINI_API_KEY;
        if (isCustomKeyUsed && process.env.GEMINI_API_KEY) {
          console.warn("Custom API Key failed, falling back to system API Key:", firstError.message);
          try {
            const aiFallback = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                }
              }
            });

            const config: any = {
              temperature: 0.7,
            };

            if (systemInstruction) {
              config.systemInstruction = systemInstruction;
            }

            if (jsonMode) {
              config.responseMimeType = "application/json";
            }

            response = await aiFallback.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: config
            });
          } catch (fallbackError: any) {
            throw new Error(`Fallback API call failed: ${fallbackError.message}`);
          }
        } else {
          throw firstError;
        }
      }

      const resultText = response.text;

      if (!resultText) {
        return res.status(500).json({ error: { message: "EMPTY_RESPONSE" } });
      }

      res.json({ text: resultText });

    } catch (error: any) {
      console.error("Gemini error:", error);
      // Extract nested error message if possible
      const errorMsg = error.message || "SERVER_ERROR";
      res.status(500).json({ error: { message: errorMsg } });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
