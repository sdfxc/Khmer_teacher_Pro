import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Force JSON parsing
app.use(express.json());

// Initialize Gemini client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API route to proxy Gemini API call
app.post("/api/generate-questions", async (req, res) => {
  const { lessonText, count } = req.body;
  if (!lessonText) {
    return res.status(400).json({ error: "ខ្លឹមសារមេរៀនតម្រូវឱ្យបញ្ចូល (Lesson text is required)" });
  }

  const prompt = `Based on the following lesson text, generate ${count || 25} multiple-choice questions for students in Khmer language. 
Each question should be high-quality and have exactly 4 options.
The language of the output questions and options must be in Khmer language, matching the theme.
Provide the response in JSON format.

Lesson Text:
${lessonText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text, written in Khmer" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 4 multiple choice options, written in Khmer"
              },
              correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option" }
            },
            required: ["text", "options", "correctIndex"]
          }
        }
      }
    });

    const generatedText = response.text || "[]";
    const jsonParsed = JSON.parse(generatedText);
    res.json({ questions: jsonParsed });
  } catch (error: any) {
    console.error("Error generating questions from Gemini API:", error);
    res.status(500).json({ error: error.message || "មានកំហុសក្នុងការបង្កើតសំណួរពី Gemini API" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
