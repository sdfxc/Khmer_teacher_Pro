import { Question } from "../types";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export function getSavedApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("GEMINI_API_KEY") || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "";
}

export function saveApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("GEMINI_API_KEY", key);
  }
}

export function removeApiKey() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GEMINI_API_KEY");
  }
}

export interface FileData {
  mimeType: string;
  data: string; // base64 encoded
  name?: string;
}

// Client-side Word Docx text extraction mapping
async function extractClientDocx(base64Data: string): Promise<string> {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    // Decode base64 to binary string on client
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const zip = await JSZip.loadAsync(bytes);
    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) return "";
    
    const xmlText = await docXmlFile.async("string");
    const paragraphs: string[] = [];
    const wPRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let match;
    while ((match = wPRegex.exec(xmlText)) !== null) {
      const pXml = match[1];
      const wTRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let textMatch;
      let pText = "";
      while ((textMatch = wTRegex.exec(pXml)) !== null) {
        let runText = textMatch[1];
        runText = runText
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        pText += runText;
      }
      if (pText.trim()) {
        paragraphs.push(pText.trim());
      }
    }
    return paragraphs.join("\n");
  } catch (err) {
    console.error("Client docx extraction error:", err);
    return "";
  }
}

// Client-side PowerPoint text extraction mapping
async function extractClientPptx(base64Data: string): Promise<string> {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const zip = await JSZip.loadAsync(bytes);
    const slideFiles = Object.keys(zip.files).filter(path => 
      path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
    );
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
      return numA - numB;
    });
    
    let extractedText = "";
    for (const slidePath of slideFiles) {
      const sFile = zip.file(slidePath);
      if (!sFile) continue;
      const xmlText = await sFile.async("string");
      const slideNum = slidePath.replace(/[^0-9]/g, "");
      extractedText += `\n--- Slide ${slideNum} ---\n`;
      
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
  } catch (err) {
    console.error("Client pptx extraction error:", err);
    return "";
  }
}

// Client-side Excel text extraction mapping
function extractClientExcel(base64Data: string): string {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const workbook = XLSX.read(bytes, { type: "array" });
    let extractedText = "";
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      if (csv && csv.trim()) {
        extractedText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
      }
    });
    return extractedText;
  } catch (err) {
    console.error("Client excel extraction error:", err);
    return "";
  }
}

export async function generateQuestions(
  lessonText: string, 
  count: number = 25,
  images: FileData[] = [],
  pdfs: FileData[] = [],
  officeFiles: FileData[] = [],
  questionType: 'general' | 'pisa' = 'general',
  pisaLanguage: 'khmer' | 'english' | 'bilingual' = 'khmer'
): Promise<Question[]> {
  try {
    // 1. First, try to request the custom backend server proxy
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lessonText, count, images, pdfs, officeFiles, questionType, pisaLanguage })
      });

      if (response.ok) {
        let data: any;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error("ទទួលបានទិន្នន័យមិនត្រឹមត្រូវពីម៉ាស៊ីនបម្រើ (Invalid response format from server)");
        }
        const rawQuestions: any[] = data.questions || [];
        return rawQuestions.map((q: any, i: number) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          id: `q-${i}-${Date.now()}`,
          questionType: q.questionType || questionType,
          explanation: q.explanation || ""
        }));
      }

      // If it returned 404 (static hosting like Vercel with no custom node running)
      // or other issues, throw to fall back
      if (response.status === 404) {
        throw new Error("SERVER_404");
      } else {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
    } catch (serverError: any) {
      const savedKey = getSavedApiKey();
      if (serverError.message === "SERVER_404" || (savedKey && savedKey.trim().length > 0)) {
        console.log("Server proxy call failed or returned 404, falling back to direct client-side request using client's API key. Error was:", serverError);
      } else {
        throw serverError; // Propagate normal server errors if no local key is available to fall back to
      }
      
      // Calculate API key
      const apiKey = savedKey;
      if (!apiKey) {
        // Throw a specific error that the UI can catch to ask for a key
        throw new Error("NEED_API_KEY");
      }

      // 2. Direct Gemini API call from the client (Client-side Fallback helper)
      let extractedClientText = "";
      for (const of of officeFiles) {
        const name = of.name || "Doc";
        const rawType = of.mimeType || "";
        if (name.toLowerCase().endsWith(".docx") || rawType.includes("wordprocessingml")) {
          const txt = await extractClientDocx(of.data);
          extractedClientText += `\n[Word Document: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".pptx") || rawType.includes("presentationml")) {
          const txt = await extractClientPptx(of.data);        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet") || rawType.includes("excel")) {
          const txt = extractClientExcel(of.data);
          extractedClientText += `\n[Excel Sheet: ${name}]\n${txt}\n`;
        }
      }

      const isPisa = questionType === 'pisa';
      const isBilingual = pisaLanguage === 'bilingual';
      const isEnglish = pisaLanguage === 'english';
      
      let languagePrompt = `The language of the output questions and options must be in Khmer language, matching the theme.`;
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

      const prompt = `Based on the provided input materials (which may contain text notes, images, PDF documents, or Microsoft Office documents), generate ${count} multiple-choice questions for students. 
Each question should be high-quality and have exactly 4 options.

${languagePrompt}

${!isPisa ? `CRITICAL SPECIAL REQUIREMENT: All questions MUST be in Lesson-based General Evaluation format. Focus on asking about definitions, formulas, theories, or key points mentioned directly in the lesson material. However, mix in real daily-life situations (ជីវភាពរស់នៅប្រចាំថ្ងៃ) for approximately 20% of the total questions (e.g. if count is 10, around 2 of them should apply the formulas/theories to daily life scenarios, while the other 8 focus directly on the core lesson contents).` : ''}

${isPisa ? `CRITICAL SPECIAL REQUIREMENT: All questions MUST be in PISA (Programme for International Student Assessment) format. Act as an expert educational system developer and design the evaluation based on these gold standard PISA guidelines:

=== គំរូ Prompt 01 (PISA Structure & Context) ===
- តម្រូវឱ្យបង្កើតសំណួរបែប PISA សមស្របទៅតាមមុខវិជ្ជា (គណិតវិទ្យា/វិទ្យាសាស្រ្ដ/អំណាន) និងកម្រិតថ្នាក់របស់សិស្ស។
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

Please thoroughly analyze all provided resource attachments (images, PDF documents, and extracted text from Word, PowerPoint, or Excel files) and text notes, then provide the response in JSON format.`;

      const parts: any[] = [{ text: prompt }];

      if (lessonText?.trim() || extractedClientText.trim()) {
        let combined = "";
        if (lessonText?.trim()) combined += `Lesson Text Notes:\n${lessonText}\n\n`;
        if (extractedClientText.trim()) combined += `Extracted Content from Documents:\n${extractedClientText}\n`;
        parts.push({ text: combined });
      }

      images.forEach((img) => {
        let base64Data = img.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: base64Data
          }
        });
      });

      pdfs.forEach((pdf) => {
        let base64Data = pdf.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        });
      });

      const fetchWithRetry = async (retriesLeft = 4, delayMs = 1500): Promise<Response> => {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: parts
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      text: { type: "STRING", description: "The question text, written in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)" },
                      options: { 
                        type: "ARRAY", 
                        items: { type: "STRING" },
                        description: "Exactly 4 multiple choice options, written in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)"
                      },
                      correctIndex: { type: "INTEGER", description: "The 0-based index of the correct option" },
                      explanation: { type: "STRING", description: "Detailed explanation of why the correct option is right in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)" }
                    },
                    required: ["text", "options", "correctIndex"]
                  }
                }
              }
            })
          }
        );

        if (!res.ok) {
          const errText = await res.clone().text().catch(() => "");
          let isRetryable = false;
          try {
            const errJson = JSON.parse(errText);
            const msg = errJson.error?.message || "";
            if (
              res.status === 503 ||
              res.status === 429 ||
              res.status === 500 ||
              msg.includes("503") ||
              msg.includes("UNAVAILABLE") ||
              msg.toLowerCase().includes("overloaded") ||
              msg.toLowerCase().includes("demand") ||
              msg.toLowerCase().includes("temporary")
            ) {
              isRetryable = true;
            }
          } catch (_) {
            if (res.status === 503 || res.status === 429 || res.status === 500) {
              isRetryable = true;
            }
          }

          if (isRetryable && retriesLeft > 0) {
            console.warn(`Direct client Gemini API returned retryable status (${res.status}). Retrying in ${delayMs}ms... (${retriesLeft} retries left)`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return fetchWithRetry(retriesLeft - 1, delayMs * 2);
          }
        }
        return res;
      };

      const directRes = await fetchWithRetry();

      if (!directRes.ok) {
        const errText = await directRes.text().catch(() => "");
        let errMsg = `កំហុសក្នុងការបង្កើតសំណួរ (HTTP ${directRes.status})`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) {
            errMsg = `កំហុសពី Gemini API៖ ${errJson.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const jsonResult = await directRes.json();
      const textContent = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error("គ្មានទិន្នន័យត្រឡប់មកវិញពី Gemini API ទេ។");
      }

      const rawQuestions = JSON.parse(textContent);
      return rawQuestions.map((q: any, i: number) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        id: `q-${i}-${Date.now()}`,
        questionType: questionType,
        explanation: q.explanation || ""
      }));
    }
  } catch (error: any) {
    console.error("Error in generateQuestions:", error);
    throw error;
  }
}


