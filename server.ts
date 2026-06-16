import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Force JSON parsing with increased payload limits for images and PDFs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import * as XLSX from "xlsx";
import JSZip from "jszip";

// Core function to extract content from .docx
async function extractTextFromDocx(base64Data: string): Promise<string> {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    return "";
  }
  
  const xmlText = await docXmlFile.async("string");
  const paragraphs: string[] = [];
  
  // Parse paragraphs <w:p>...</w:p>
  const wPRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let match;
  while ((match = wPRegex.exec(xmlText)) !== null) {
    const paragraphXml = match[1];
    const wTRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    let paragraphText = "";
    while ((textMatch = wTRegex.exec(paragraphXml)) !== null) {
      let runText = textMatch[1];
      runText = runText
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      paragraphText += runText;
    }
    if (paragraphText.trim()) {
      paragraphs.push(paragraphText.trim());
    }
  }
  
  if (paragraphs.length === 0) {
    // Direct backup fallback matching any xml text block
    const wTRegexDirect = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = wTRegexDirect.exec(xmlText)) !== null) {
      paragraphs.push(tMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"));
    }
  }
  
  return paragraphs.join("\n");
}

// Core function to extract content from .pptx
async function extractTextFromPptx(base64Data: string): Promise<string> {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const zip = await JSZip.loadAsync(buffer);
  
  // Find all slide XML files
  const slideFiles = Object.keys(zip.files).filter(path => 
    path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
  );
  
  // Sort slide files numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numA - numB;
  });
  
  let extractedText = "";
  
  for (const slidePath of slideFiles) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    
    const xmlText = await slideFile.async("string");
    const slideNumber = slidePath.replace(/[^0-9]/g, "");
    
    extractedText += `\n--- Slide ${slideNumber} ---\n`;
    
    // Match all text elements inside <a:t>...</a:t>
    const aTRegex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g;
    let match;
    const slideTexts: string[] = [];
    while ((match = aTRegex.exec(xmlText)) !== null) {
      const tText = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      if (tText.trim()) {
        slideTexts.push(tText.trim());
      }
    }
    extractedText += slideTexts.join("  ") + "\n";
  }
  
  return extractedText;
}

// Core function to extract Excel and CSV content
function extractTextFromExcel(base64Data: string): string {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let extractedText = "";
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    if (csv && csv.trim()) {
      extractedText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
    }
  });
  
  return extractedText;
}

// Advanced fallback pattern parsing to extract readable string fragments from binary blobs (.doc, .ppt, .xls)
function extractCleanTextFromBinary(buffer: Buffer): string {
  const textUtf16 = buffer.toString("utf16le");
  const textUtf8 = buffer.toString("utf8");
  
  // Match contiguous words of Cambodia Khmer (Unicode 0x1780 to 0x17FF) or English alphanumeric strings
  const cleanRegex = /[\u1780-\u17FFa-zA-Z0-9\s.,!?()\-+=]{4,}/g;
  
  const matches16 = textUtf16.match(cleanRegex) || [];
  const matches8 = textUtf8.match(cleanRegex) || [];
  
  const words16 = matches16.filter(w => w.trim().length > 6).join(" ");
  const words8 = matches8.filter(w => w.trim().length > 6).join("\n");
  
  return words16.length > words8.length ? words16 : words8;
}

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
  const { lessonText, count, images, pdfs, officeFiles, questionType, pisaLanguage = 'khmer' } = req.body;
  
  const hasText = lessonText && lessonText.trim().length > 0;
  const hasImages = images && Array.isArray(images) && images.length > 0;
  const hasPdfs = pdfs && Array.isArray(pdfs) && pdfs.length > 0;
  const hasOffice = officeFiles && Array.isArray(officeFiles) && officeFiles.length > 0;

  if (!hasText && !hasImages && !hasPdfs && !hasOffice) {
    return res.status(400).json({ 
      error: "ខ្លឹមសារមេរៀន រូបភាព ឯកសារ PDF ឬឯកសារការិយាល័យតម្រូវឱ្យបញ្ចូលយ៉ាងហោចណាស់មួយ (Please provide text, images, PDF, or Office files)" 
    });
  }

  // Extract text from Office documents if any
  let extractedOfficeText = "";
  if (hasOffice) {
    for (const file of officeFiles) {
      const fileName = file.name || "Document";
      const mimeType = file.mimeType || "";
      const base64Data = file.data || "";
      
      try {
        if (fileName.toLowerCase().endsWith(".docx") || mimeType.includes("wordprocessingml") || mimeType === "application/docx") {
          const text = await extractTextFromDocx(base64Data);
          extractedOfficeText += `\n[Extracted from Word: ${fileName}]\n${text}\n`;
        } else if (fileName.toLowerCase().endsWith(".pptx") || mimeType.includes("presentationml") || mimeType === "application/pptx") {
          const text = await extractTextFromPptx(base64Data);
          extractedOfficeText += `\n[Extracted from PowerPoint: ${fileName}]\n${text}\n`;
        } else if (
          fileName.toLowerCase().endsWith(".xlsx") || 
          fileName.toLowerCase().endsWith(".xls") || 
          fileName.toLowerCase().endsWith(".csv") || 
          mimeType.includes("spreadsheet") || 
          mimeType.includes("excel") || 
          mimeType.includes("csv")
        ) {
          const text = extractTextFromExcel(base64Data);
          extractedOfficeText += `\n[Extracted from Sheet: ${fileName}]\n${text}\n`;
        } else {
          // Fallback parsing (e.g. .doc, .ppt, .xls, .txt, etc.)
          const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
          const buffer = Buffer.from(cleanBase64, "base64");
          
          if (fileName.toLowerCase().endsWith(".txt")) {
            const text = buffer.toString("utf8");
            extractedOfficeText += `\n[Extracted from Text File: ${fileName}]\n${text}\n`;
          } else {
            const text = extractCleanTextFromBinary(buffer);
            if (text.trim().length > 10) {
              extractedOfficeText += `\n[Extracted from Doc File: ${fileName}]\n${text}\n`;
            }
          }
        }
      } catch (err) {
        console.error(`Failed to extract text from ${fileName}:`, err);
      }
    }
  }

  const isPisa = questionType === 'pisa';
  const isBilingual = pisaLanguage === 'bilingual';
  const isEnglish = pisaLanguage === 'english';

  let languagePrompt = `The language of the output questions and options must be in Khmer language, matching the theme of the material.`;
  if (isEnglish) {
    languagePrompt = `CRITICAL LANGUAGE REQUIREMENT: Your output questions, options, and explanations MUST be written entirely in English language because this is an international standard evaluation. Do not use Khmer. Everything must be high-quality, clear, correct academic English translation.`;
  } else if (isBilingual) {
    languagePrompt = `CRITICAL LANGUAGE REQUIREMENT: Your output questions, options, and explanations MUST have both Khmer and English side-by-side (English support) because this is an international standard evaluation. For every question text, each option, and explanation text, write the Khmer text first, immediately followed by the English translation in parentheses. Example format:
- Question: "តើអ្វីទៅជាប្រភពថាមពលចម្បងរបស់ផែនដី? (What is the main energy source of the Earth?)"
- Options:
  1. "ព្រះអាទិត្យ (The Sun)"
  2. "ធ្យូងថ្ម (Coal)"
  3. "ខ្យល់ (Wind)"
  4. "ប្រេងកាត (Petroleum)"
- Explanation: "ព្រះអាទិត្យគឺជាប្រភពថាមពលចម្បងដោយសារ... (The sun is the main source of energy because...)"
Make sure everything including the options represents exact equivalent translations so that students can understand both Khmer and English.`;
  }

  const promptText = `Based on the provided input materials (which may contain text notes, images, PDF files, or Microsoft Office documents), generate exactly ${count || 25} multiple-choice questions for students. 
Each question should be high-quality and have exactly 4 options.

${languagePrompt}

${!isPisa ? `CRITICAL SPECIAL REQUIREMENT: All questions MUST be in Lesson-based General Evaluation format. Focus on asking about definitions, formulas, theories, or key points mentioned directly in the lesson material. However, mix in real daily-life situations (ជីវភាពរស់នៅប្រចាំថ្ងៃ) for approximately 20% of the total questions (e.g. if count is 10, around 2 of them should apply the formulas/theories to daily life scenarios, while the other 8 focus directly on the core lesson contents).` : ''}

${isPisa ? `CRITICAL SPECIAL REQUIREMENT: All questions MUST be in PISA (Programme for International Student Assessment) format. Act as an expert educational system developer and design the evaluation based on these gold standard PISA guidelines:

=== គំរូ Prompt 01 (PISA Structure & Context) ===
- តម្រូវឱ្យបង្កើតសំណួរបែប PISA សមស្របទៅតាមមុខវិជ្ជា (គណិតវិទ្យា/វិទ្យាសាស្ត្រ/អំណាន) និងកម្រិតថ្នាក់របស់សិស្ស។
- សំណួរត្រូវតែផ្អែកលើស្ថានភាពជីវិតពិតជាក់ស្ដែង (Real-life situation) ហើយតម្រូវឱ្យមានការវិភាគវែកញែករកហេតុផល (Reasoning) មិនមែនគ្រាន់តែរំលឹកទ្រឹស្ដី ឬរូបមន្តមេរៀនឡើងវិញនោះទេ។
- ក្នុងសំណួរនីមួយៗត្រូវរួមបញ្ចូល៖
  * បរិបទ ឬ សេណារីយ៉ូខ្លីមួយ (Context/Scenario) សម្រាប់ឱ្យសិស្សអាននិងយល់។
  * សំណួរពហុជ្រើសរើស មានជម្រើសចម្លើយ ៤ ជម្រើស មានចម្លើយត្រឹមត្រូវ ១ និងចម្លើយបន្លំជាលក្ខណៈគិតថ្លឹងថ្លែងចំនួន ៣។
  * ចម្លើយត្រឹមត្រូវជាមួយនឹងការពន្យល់ល្អិតល្អន់ និងខ្លីៗអំពីមូលហេតុ។

=== គំរូ Prompt 02 (Problem-Solving Level - PISA Level 3) ===
- បង្កើតសំណួរបែប PISA ក្នុងកម្រិត៣ (Level 3) ដោយប្រើបរិបទពិភពលោកពិតពីជីវិតប្រចាំថ្ងៃទាក់ទងនឹងមេរៀន និងកម្រិតថ្នាក់។
- ភារកិច្ចរបស់សំណួរគួរតែវាយតម្លៃលើសមត្ថភាពដោះស្រាយបញ្ហា (Problem-solving) និងការគិតត្រិះរិះស៊ីជម្រៅ (Critical Thinking)។
- ត្រូវតែរួមបញ្ចូល៖
  * អត្ថបទខ្លី ទិន្នន័យ តារាង ឬស្ថានភាពជាក់ស្ដែងមួយ។
  * សំណួរផ្ទាល់ដែលតម្រូវឱ្យមានការបកស្រាយ (Interpretation) ការវិភាគ ឬការគណនាដោយប្រើការគិត។
  * ចម្លើយច្បាស់លាស់ និងការបង្ហាញពីការដោះស្រាយជាជំហានៗ។` : ''}

CRITICAL EXAM SPECIFICATIONS FOR MATHEMATICS, PHYSICS, AND CHEMISTRY FORMULAS:
If the questions involve math, physics, or chemistry:
- Use standard notations for formulas so they can be processed and rendered beautifully:
  - Exponents (powers): write using "^" (e.g., "x^2", "10^{-5}", "y^{2x}").
  - Subscripts (indices or molecular numbers): write using "_" (e.g., "H_2O", "CO_2", "x_i", "C_nH_{2n+2}"). Note: common formulas like "H2O", "CO2", "H2SO4" can also just be written directly without underscores and will be auto-subscripted.
  - Fractions: write using LaTeX style "\\frac{numerator}{denominator}" (e.g., "\\frac{s}{t}", "\\frac{1}{2}").
  - Square roots: write using "\\sqrt{expression}" (e.g., "\\sqrt{16}", "\\sqrt{x}").
  - Chemical reaction arrows: write using "->" or "-->" or "\\rightarrow" (e.g., "2H_2 + O_2 -> 2H_2O").
  - Mathematics symbols: use LaTeX style formatting: "\\pm" for ±, "\\times" for ×, "\\div" for ÷, "\\le" for ≤, "\\ge" for ≥, "\\pi" for π, "\\Delta" for Δ, "\\alpha" for α, "\\beta" for β, "\\theta" for θ.

Please thoroughly analyze all provided resource attachments (images, PDF documents, and extracted text from Word, PowerPoint, or Excel files) and formulate questions testing the main concepts.

Provide the response in JSON format.`;

  const parts: any[] = [];
  parts.push({ text: promptText });

  if (hasText || extractedOfficeText.trim()) {
    let textMaterial = "";
    if (hasText) {
      textMaterial += `Lesson Text Notes:\n${lessonText}\n\n`;
    }
    if (extractedOfficeText.trim()) {
      textMaterial += `Extracted Content from Documents:\n${extractedOfficeText}\n`;
    }
    parts.push({ text: textMaterial });
  }

  if (hasImages) {
    images.forEach((img: { mimeType: string, data: string }) => {
      let base64 = img.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: base64
        }
      });
    });
  }

  if (hasPdfs) {
    pdfs.forEach((pdf: { mimeType: string, data: string }) => {
      let base64 = pdf.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      });
    });
  }

  try {
    const modelsToTry = [
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash"
    ];

    const generateWithFallback = async (partsList: any[]): Promise<any> => {
      let lastError: any = null;
      
      for (const modelName of modelsToTry) {
        const attempts = 2;
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(`Attempting question generation with model: ${modelName} (attempt ${attempt}/${attempts})`);
            const result = await ai.models.generateContent({
              model: modelName,
              contents: { parts: partsList },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "The question text, written in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)" },
                      options: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Exactly 4 multiple choice options, written in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)"
                      },
                      correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option" },
                      explanation: { type: Type.STRING, description: "Detailed explanation of why the correct option is right of the scenario and step-by-step reasoning in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)" }
                    },
                    required: ["text", "options", "correctIndex"]
                  }
                }
              }
            });
            return result;
          } catch (error: any) {
            lastError = error;
            const errorMsg = error?.message || String(error);
            console.warn(`Model ${modelName} failed on attempt ${attempt}: ${errorMsg}`);
            
            if (attempt < attempts) {
              const delay = 1000 * attempt;
              console.log(`Retrying ${modelName} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        console.log(`Failing over to standard fallback model after ${modelName} encountered errors...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      throw lastError || new Error("Failed after attempting all generative models and retries.");
    };

    const response = await generateWithFallback(parts);

    const generatedText = response.text || "[]";
    const jsonParsed = JSON.parse(generatedText);
    const mappedQuestions = Array.isArray(jsonParsed) ? jsonParsed.map((q: any) => ({
      ...q,
      questionType: questionType || 'general'
    })) : [];
    res.json({ questions: mappedQuestions });
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
