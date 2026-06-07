import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits to support base64 file and image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize GoogleGenAI client nicely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Get status config of the server-side AI key
app.get('/api/ai/config', (req, res) => {
  res.json({
    hasServerKey: !!process.env.GEMINI_API_KEY
  });
});

// API route for AI Quiz Generation
app.post('/api/ai/generate-quiz', async (req, res) => {
  const {
    subject,
    grade,
    topic,
    numQuestions = 5,
    languageFormat = 'khmer', // 'khmer' or 'english'
    textContext, // raw text prompt or pasted text
    fileBase64,  // base64 of image / doc
    fileMimeType, // e.g. "image/png", "application/pdf"
    clientApiKey // user's custom api key from frontend
  } = req.body;

  const activeApiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!activeApiKey) {
    return res.status(400).json({
      error: 'សូមបញ្ចូល កូនសោ API Gemini (Gemini API Key) ជាមុនសិនដើម្បីប្រើប្រាស់មុខងារ AI នេះ។'
    });
  }

  try {
    const activeAiClient = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Build a solid prompt instructing Gemini
    const promptParts: any[] = [];
    
    let basePrompt = `You are StudyPlay AI, a highly advanced educational content generator specializing in interactive quizzes for students aged 6-18. 
Generate exactly ${numQuestions} educational questions.
The language of the quiz must match the requested format:
- Questions and choices must be in Cambodian Khmer language if format is 'khmer', or standard English if format is 'english'.
- If the format is 'khmer', multiple choice option indexes must use traditional Khmer format letters (ក, ខ, គ, ឃ) or just be general answers. The correct answer must be written exactly as one of the options.

The subject is "${subject || 'General Knowledge'}", Grade Level is "${grade || 'Any'}", and Topic/Focus is "${topic || 'General study material'}".
`;

    if (textContext) {
      basePrompt += `\nAdditional source content/context provided by teacher:\n"""\n${textContext}\n"""\n`;
    }

    basePrompt += `
For each question, ensure:
- It is visually/analytically appealing and fits the grade level.
- Keep difficulty mixed (Easy, Medium, Hard).
- Provide a clear, educational "explanation" of why the correct answer is right. This explanation must be in Khmer if format is 'khmer', and English if 'english'.
- If there are math/physics/chemistry elements, print clean notations. If a diagram contains equations or visual schemas, extract and construct related conceptual questions.

Return a JSON array containing objects with the following EXACT properties:
1. "text" (string): The question text.
2. "type" (string): Either "multiple_choice", "true_false", "fill_blank", or "short_answer".
3. "options" (array of strings): For multiple_choice, provide exactly 4 answers. For true_false, provide exactly ['ត្រូវ', 'ខុស'] (if khmer) or ['True', 'False'] (if english). For fill_blank and short_answer, this should be empty.
4. "correctAnswer" (string): Must match EXACTLY one of the choices for multiple_choice or true_false. For fill_blank/short_answer, it must be the correct short keyword answer text.
5. "explanation" (string): Explaining the correct answer.
6. "timer" (number): Timer in seconds (default 25).
7. "points" (number): Points value (default 1000).
8. "difficulty" (string): "easy", "medium", or "hard".
`;

    promptParts.push({ text: basePrompt });

    // Handle uploaded file or image parsing via Gemini multimodal capabilities
    if (fileBase64 && fileMimeType) {
      promptParts.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileBase64
        }
      });
      promptParts.push({
        text: `The attached file/image contains the core material/diagram/equation to extract questions from. Please analyze it fully, identify any complex mathematical, chemical, physics, of diagrammatic formulas, and output relevant questions.`
      });
    }

    let response = null;
    let lastError = null;
    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`[StudyPlay AI] Attempting generation with model: ${modelName}`);
        response = await activeAiClient.models.generateContent({
          model: modelName,
          contents: promptParts,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  timer: { type: Type.INTEGER },
                  points: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING }
                },
                required: ['text', 'type', 'options', 'correctAnswer', 'explanation']
              }
            },
            temperature: 0.2
          }
        });
        
        if (response) {
          console.log(`[StudyPlay AI] Success generating quiz with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.error(`[StudyPlay AI] Model ${modelName} failed:`, err.message || err);
        lastError = err;
        // If it's a client error (e.g., status 400 with invalid API Key), do not try other models as it will also fail
        if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError || new Error('All attempts to generate quiz via Gemini models failed.');
    }

    let resultText = response.text || '[]';
    // Robust fallback: clean any potential markdown surrounding the JSON
    resultText = resultText.trim();
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    
    try {
      res.json(JSON.parse(resultText));
    } catch (parseError: any) {
      console.error('JSON Parsing Error of Gemini response:', parseError, 'Raw response:', resultText);
      res.status(500).json({ error: 'កំហុសក្នុងការពន្យល់លទ្ធផល JSON របស់ AI។ សូមសាកល្បងម្ដងទៀត!' });
    }

  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    res.status(500).json({ error: error.message || 'Error occurred during AI quiz generation.' });
  }
});

// Vite / static file serving logic
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StudyPlay App] Server is live on http://localhost:${PORT}`);
  });
}

startServer();
