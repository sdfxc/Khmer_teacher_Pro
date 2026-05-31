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
  officeFiles: FileData[] = []
): Promise<Question[]> {
  try {
    // 1. First, try to request the custom backend server proxy
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lessonText, count, images, pdfs, officeFiles })
      });

      if (response.ok) {
        const data = await response.json();
        const rawQuestions: any[] = data.questions || [];
        return rawQuestions.map((q: any, i: number) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          id: `q-${i}-${Date.now()}`
        }));
      }

      // If it returned 404 (static hosting like Vercel with no custom node running)
      // or other issues, throw to fall back
      if (response.status === 404) {
        throw new Error("SERVER_404");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (serverError: any) {
      if (serverError.message === "SERVER_404") {
        console.log("Server proxy call returned 404, falling back to direct client-side request.");
      } else {
        throw serverError; // Propagate normal server extraction/validation errors
      }
      
      // Calculate API key
      const apiKey = getSavedApiKey();
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
          const txt = await extractClientPptx(of.data);
          extractedClientText += `\n[PowerPoint Presentation: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet") || rawType.includes("excel")) {
          const txt = extractClientExcel(of.data);
          extractedClientText += `\n[Excel Sheet: ${name}]\n${txt}\n`;
        }
      }

      const prompt = `Based on the provided input materials (which may contain text notes, images, PDF documents, or Microsoft Office documents), generate ${count} multiple-choice questions for students in Khmer language. 
Each question should be high-quality and have exactly 4 options.
The language of the output questions and options must be in Khmer language, matching the theme.

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

      const directRes = await fetch(
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
                    text: { type: "STRING", description: "The question text, written in Khmer" },
                    options: { 
                      type: "ARRAY", 
                      items: { type: "STRING" },
                      description: "Exactly 4 multiple choice options, written in Khmer"
                    },
                    correctIndex: { type: "INTEGER", description: "The 0-based index of the correct option" }
                  },
                  required: ["text", "options", "correctIndex"]
                }
              }
            }
          })
        }
      );

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

      const jsonResult = await directRes.ok ? await directRes.json() : {};
      const textContent = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error("គ្មានទិន្នន័យត្រឡប់មកវិញពី Gemini API ទេ។");
      }

      const rawQuestions = JSON.parse(textContent);
      return rawQuestions.map((q: any, i: number) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        id: `q-${i}-${Date.now()}`
      }));
    }
  } catch (error: any) {
    console.error("Error in generateQuestions:", error);
    throw error;
  }
}


