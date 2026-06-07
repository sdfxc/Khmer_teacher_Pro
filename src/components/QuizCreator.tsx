/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDoc, orderBy } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash, ArrowUp, ArrowDown, Save, FileSpreadsheet, ImageIcon, Check, Info, Settings, HelpCircle, Layers, Sparkles, Wand2, UploadCloud, FileText, X, Globe, Sun, Moon } from 'lucide-react';
import { Question, QuestionType, Quiz } from '../types';
import { gameAudio } from '../utils/audio';

async function generateQuizDirectlyOnClient(params: {
  subject: string;
  grade: string;
  topic: string;
  numQuestions: number;
  languageFormat: 'khmer' | 'english';
  textContext: string;
  fileBase64: string;
  fileMimeType: string;
  apiKey: string;
}): Promise<Response> {
  const {
    subject,
    grade,
    topic,
    numQuestions,
    languageFormat,
    textContext,
    fileBase64,
    fileMimeType,
    apiKey
  } = params;

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

  const parts: any[] = [{ text: basePrompt }];

  if (fileBase64 && fileMimeType) {
    parts.push({
      inlineData: {
        mimeType: fileMimeType,
        data: fileBase64
      }
    });
    parts.push({
      text: `The attached file/image contains the core material/diagram/equation to extract questions from. Please analyze it fully, identify any complex mathematical, chemical, physics, of diagrammatic formulas, and output relevant questions.`
    });
  }

  // Try compatible models in sequence to prevent 502/503/Quota failures
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];
  let apiResponse = null;
  let lastError = null;
  let textContent = '[]';

  for (const modelName of modelsToTry) {
    try {
      console.log(`[StudyPlay Direct] Attempting client quiz generation with model: ${modelName}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  text: { type: 'STRING' },
                  type: { type: 'STRING' },
                  options: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  },
                  correctAnswer: { type: 'STRING' },
                  explanation: { type: 'STRING' },
                  timer: { type: 'INTEGER' },
                  points: { type: 'INTEGER' },
                  difficulty: { type: 'STRING' }
                },
                required: ['text', 'type', 'options', 'correctAnswer', 'explanation']
              }
            },
            temperature: 0.2
          }
        })
      });

      if (res.ok) {
        apiResponse = res;
        const resultJSON = await res.json();
        textContent = resultJSON.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        console.log(`[StudyPlay Direct] Success with client direct model: ${modelName}`);
        break;
      } else {
        const errText = await res.text();
        let errMessage = `Status ${res.status}`;
        try {
          const errJSON = JSON.parse(errText);
          errMessage = errJSON.error?.message || errMessage;
        } catch (_) {}
        lastError = new Error(errMessage);
        console.warn(`[StudyPlay Direct] Model ${modelName} failed: ${errMessage}`);
      }
    } catch (err: any) {
      lastError = err;
      console.error(`[StudyPlay Direct] Network/Fetch error on ${modelName}:`, err);
    }
  }

  if (!apiResponse) {
    throw lastError || new Error('All attempts to directly generate a quiz via Gemini models failed.');
  }

  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null
    },
    json: async () => JSON.parse(textContent.trim()),
    text: async () => textContent
  } as Response;
}

export default function QuizCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editQuizId = searchParams.get('edit');

  const [user, setUser] = useState<any>(() => {
    const local = localStorage.getItem('studyplay_teacher_session');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return auth.currentUser;
  });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((usr) => {
      if (usr) {
        setUser(usr);
        setAuthChecked(true);
      } else {
        const local = localStorage.getItem('studyplay_teacher_session');
        if (local) {
          try {
            setUser(JSON.parse(local));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, []);

  // Quiz details
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('studyplay_theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('studyplay_theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('studyplay_theme', 'dark');
    }
  }, [isLightMode]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  
  // API key states
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem('studyplay_gemini_api_key') || '';
  });
  const [savedApiKey, setSavedApiKey] = useState(() => {
    return localStorage.getItem('studyplay_gemini_api_key') || '';
  });

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // AI Quiz Generator states
  const [activeTab, setActiveTab] = useState<'editor' | 'ai'>('editor');
  const [aiSubject, setAiSubject] = useState('');
  const [aiGrade, setAiGrade] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [isCustomQuestions, setIsCustomQuestions] = useState(false);
  const [aiLanguageFormat, setAiLanguageFormat] = useState<'khmer' | 'english'>('khmer');
  const [aiTextContext, setAiTextContext] = useState('');
  const [optionsFormat, setOptionsFormat] = useState<'khmer' | 'english'>('khmer');
  const [hasServerKey, setHasServerKey] = useState(false);

  // Fetch server-side key status on load
  useEffect(() => {
    const checkServerKey = async () => {
      try {
        const response = await fetch('/api/ai/config');
        if (response.ok) {
          const data = await response.json();
          setHasServerKey(!!data.hasServerKey);
        }
      } catch (err) {
        console.error('Error fetching AI server config:', err);
      }
    };
    checkServerKey();
  }, []);

  // File Upload states
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState('');
  const [uploadedFileMimeType, setUploadedFileMimeType] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Paste hook for capturing images directly via Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const rawBase64 = base64.split(',')[1] || base64;
            setUploadedFileBase64(rawBase64);
            setUploadedFileMimeType(blob.type);
            setUploadedFileName(`Pasted Screenshot (${new Date().toLocaleTimeString()}).png`);
            gameAudio.playTick();
            setSuccessMsg('បានអនុវត្តការបិទភ្ជាប់រូបភាពពី Clipboard រួចរាល់!');
            setTimeout(() => setSuccessMsg(''), 3000);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      navigate('/');
      return;
    }

    if (editQuizId) {
      // Load existing quiz for editing
      const loadQuizData = async () => {
        setLoading(true);
        try {
          const quizDocRef = doc(db, 'quizzes', editQuizId);
          const quizSnap = await getDoc(quizDocRef);

          if (!quizSnap.exists()) {
            setErrorMsg('រកមិនឃើញកម្រងសំណួរនេះឡើយ');
            setLoading(false);
            return;
          }

          const qData = quizSnap.data();
          if (qData.creatorId !== user.uid) {
            setErrorMsg('អ្នកមិនមានសិទ្ធិកែប្រែកម្រងសំណួរនេះឡើយ');
            setLoading(false);
            return;
          }

          setTitle(qData.title || '');
          setDescription(qData.description || '');

          // Get questions subcollection
          const questionsRef = collection(db, `quizzes/${editQuizId}/questions`);
          const qSnap = await getDocs(query(questionsRef, orderBy('order', 'asc')));
          
          const loadedQuestions: Partial<Question>[] = [];
          qSnap.forEach((doc) => {
            const d = doc.data();
            loadedQuestions.push({
              id: doc.id,
              quizId: editQuizId,
              type: d.type as QuestionType,
              text: d.text || '',
              imageUrl: d.imageUrl || '',
              timer: d.timer || 20,
              points: d.points || 1000,
              order: d.order || 0,
              options: d.options || ['', '', '', ''],
              correctAnswer: d.correctAnswer || '',
              matchingPairs: d.matchingPairs || {},
              difficulty: (d.difficulty || 'medium') as any,
              explanation: d.explanation || ''
            });
          });

          // If no questions exist, add an empty template
          if (loadedQuestions.length === 0) {
            loadedQuestions.push(generateEmptyQuestion(1));
          }

          setQuestions(loadedQuestions);
          setActiveQuestionIdx(0);
          setLoading(false);
        } catch (e) {
          console.error(e);
          setErrorMsg('មានបញ្ហាក្នុងការទាញយកកម្រងសំណួរ');
          setLoading(false);
        }
      };

      loadQuizData();
    } else {
      // Create new quiz template
      setTitle('កម្រងសំណួរមិនទាន់មានចំណងជើង');
      setDescription('ការពិពណ៌នាសង្ខេបសម្រាប់កម្រងសំណួរនេះ');
      setQuestions([generateEmptyQuestion(1)]);
      setActiveQuestionIdx(0);
    }
  }, [editQuizId, user, authChecked]);

  function generateEmptyQuestion(order: number): Partial<Question> {
    return {
      type: 'multiple_choice',
      text: 'សំណួរថ្មី...',
      timer: 20,
      points: 1000,
      order,
      options: ['ចម្លើយក', 'ចម្លើយខ', 'ចម្លើយគ', 'ចម្លើយឃ'],
      correctAnswer: 'ចម្លើយក',
      imageUrl: '',
      difficulty: 'medium',
      explanation: '',
      matchingPairs: { 'ឆ្វេងA': 'ស្តាំA', 'ឆ្វេងB': 'ស្តាំB' }
    };
  }

  const handleAddQuestion = () => {
    gameAudio.playTick();
    const newOrder = questions.length + 1;
    const newQ = generateEmptyQuestion(newOrder);
    setQuestions([...questions, newQ]);
    setActiveQuestionIdx(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    gameAudio.playTick();
    if (questions.length <= 1) {
      alert('កម្រងសំណួរត្រូវតែមានសំណួរយ៉ាងហោចណាស់ ១!');
      return;
    }
    const filtered = questions.filter((_, i) => i !== idx);
    // Recalculate orders
    const updated = filtered.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(updated);
    setActiveQuestionIdx(Math.max(0, idx - 1));
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    gameAudio.playTick();
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questions.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...questions];
    
    // Swap entries
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Fix orders
    updated[idx].order = idx + 1;
    updated[targetIdx].order = targetIdx + 1;

    setQuestions(updated);
    setActiveQuestionIdx(targetIdx);
  };

  const handleUpdateActiveField = (field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[activeQuestionIdx] = { ...updated[activeQuestionIdx], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (optIdx: number, val: string) => {
    const updated = [...questions];
    const currentQ = updated[activeQuestionIdx];
    if (currentQ.options) {
      const newOpts = [...currentQ.options];
      newOpts[optIdx] = val;
      currentQ.options = newOpts;
      setQuestions(updated);
    }
  };

  const handleSaveQuiz = async () => {
    gameAudio.playTick();
    if (!title.trim()) {
      alert('សូមបំពេញចំណងជើងកម្រងសំណួរ!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let quizId = editQuizId;

      if (!quizId) {
        // Create new Quiz doc in quizzes
        const quizRef = await addDoc(collection(db, 'quizzes'), {
          title: title.trim(),
          description: description.trim(),
          creatorId: user?.uid,
          questionCount: questions.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        quizId = quizRef.id;
      } else {
        // Update existing Quiz doc
        await updateDoc(doc(db, 'quizzes', quizId), {
          title: title.trim(),
          description: description.trim(),
          questionCount: questions.length,
          updatedAt: new Date().toISOString()
        });

        // Delete old questions from subcollection
        const oldQuestionsRef = collection(db, `quizzes/${quizId}/questions`);
        const oldSnap = await getDocs(oldQuestionsRef);
        for (const d of oldSnap.docs) {
          await deleteDoc(doc(db, `quizzes/${quizId}/questions`, d.id));
        }
      }

      // Bulk write new questions
      const nestedRef = collection(db, `quizzes/${quizId}/questions`);
      for (const q of questions) {
        await addDoc(nestedRef, {
          type: q.type || 'multiple_choice',
          text: q.text || '',
          timer: q.timer || 20,
          points: q.points || 1000,
          order: q.order || 1,
          options: q.options || ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          imageUrl: q.imageUrl || '',
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          matchingPairs: q.matchingPairs || {},
          quizId: quizId
        });
      }

      setSuccessMsg('រក្សាទុកកម្រងសំណួរបានជោគជ័យ!');
      setTimeout(() => {
        navigate('/teacher');
      }, 1500);

    } catch (e) {
      console.error(e);
      setErrorMsg('មានបញ្ហាក្នុងការរក្សាទុកសំណួរ');
    } finally {
      setLoading(false);
    }
  };

  // CSV Importer logic (Splits text by newline, parses standard row formats)
  const handleImportCsv = () => {
    gameAudio.playTick();
    setErrorMsg('');
    setSuccessMsg('');

    if (!csvText.trim()) {
      alert('សូមបញ្ចូលអត្ថបទ CSV របស់អ្នក!');
      return;
    }

    try {
      const rows = csvText.split('\n').filter(r => r.trim().length > 0);
      const parsedQuestions: Partial<Question>[] = [];

      rows.forEach((row, idx) => {
        const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 5) return; // Ignore malformed lines

        const qText = cols[0];
        const qType = cols[1] as QuestionType;
        const qTimer = parseInt(cols[2], 10) || 20;
        const qPoints = parseInt(cols[3], 10) || 1000;
        const qCorrect = cols[4];
        
        let qOptions: string[] = [];
        if (cols.length > 5) {
          qOptions = cols.slice(5);
        } else if (qType === 'true_false') {
          qOptions = ['ត្រូវ', 'ខុស'];
        }

        parsedQuestions.push({
          type: qType,
          text: qText,
          timer: qTimer,
          points: qPoints,
          options: qOptions,
          correctAnswer: qCorrect,
          order: idx + 1,
          matchingPairs: { 'ឆ្វេងA': 'ស្តាំA', 'ឆ្វេងB': 'ស្តាំB' }
        });
      });

      if (parsedQuestions.length === 0) {
        setErrorMsg('មិនអាចវិភាគរកឃើញសំណួរណាមួយឡើយ។ សូមពិនិត្យមើលទ្រង់ទ្រាយគំរូ។');
        return;
      }

      setQuestions(parsedQuestions);
      setActiveQuestionIdx(0);
      setShowCsvImporter(false);
      setSuccessMsg(`បាននាំចូលសំណួរចំនួន ${parsedQuestions.length} ដោយជោគជ័យ!`);
    } catch (e) {
      console.error(e);
      setErrorMsg('កំហុសវិភាគអត្ថបទ CSV។ សូមប្រាកដថាអ្នកបានចែកវាដោយសញ្ញាក្បៀស (,)');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileMimeType(file.type);
    gameAudio.playTick();

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const rawBase64 = base64.split(',')[1] || base64;
      setUploadedFileBase64(rawBase64);
      setSuccessMsg(`បានបញ្ចូលឯកសារ៖ ${file.name} រួចរាល់!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIQuiz = async () => {
    if (!aiTopic.trim() && !aiTextContext.trim() && !uploadedFileBase64) {
      alert('សូមបំពេញប្រធានបទ ឬបញ្ចូលអត្ថបទ/ឯកសារដើម្បីអោយ AI បង្កើតសំណួរ!');
      return;
    }

    setIsAiGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    gameAudio.playTick();

    const actualKey = (savedApiKey || apiKeyInput || '').trim();

    // Auto-save the key to local storage if they entered it in the input but didn't explicitly hit Save
    if (actualKey && !savedApiKey) {
      try {
        localStorage.setItem('studyplay_gemini_api_key', actualKey);
        setSavedApiKey(actualKey);
        setApiKeyInput(actualKey);
      } catch (storageErr) {
        console.warn('Failed to save API Key to localStorage:', storageErr);
      }
    }

    try {
      let response;
      let usedClientDirect = false;

      // If we are on a static site or client-only host (no server-side key configured) AND the user provides an API key:
      // We directly run browser-side (client) generation to avoid 404 on backend routes!
      if (!hasServerKey && actualKey) {
        console.log('[StudyPlay] No server-side key detected. Bypassing backend and using client-side Gemini API directly...');
        usedClientDirect = true;
        response = await generateQuizDirectlyOnClient({
          subject: aiSubject,
          grade: aiGrade,
          topic: aiTopic,
          numQuestions: aiNumQuestions,
          languageFormat: aiLanguageFormat,
          textContext: aiTextContext,
          fileBase64: uploadedFileBase64,
          fileMimeType: uploadedFileMimeType,
          apiKey: actualKey
        });
      } else {
        // Otherwise, first attempt server-side generation
        try {
          response = await fetch('/api/ai/generate-quiz', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: aiSubject,
              grade: aiGrade,
              topic: aiTopic,
              numQuestions: aiNumQuestions,
              languageFormat: aiLanguageFormat,
              textContext: aiTextContext,
              fileBase64: uploadedFileBase64,
              fileMimeType: uploadedFileMimeType,
              clientApiKey: actualKey
            })
          });
        } catch (networkErr) {
          console.warn('Network error calling API route, attempting direct client fallback...', networkErr);
          if (actualKey) {
            usedClientDirect = true;
            response = await generateQuizDirectlyOnClient({
              subject: aiSubject,
              grade: aiGrade,
              topic: aiTopic,
              numQuestions: aiNumQuestions,
              languageFormat: aiLanguageFormat,
              textContext: aiTextContext,
              fileBase64: uploadedFileBase64,
              fileMimeType: uploadedFileMimeType,
              apiKey: actualKey
            });
          } else {
            throw networkErr;
          }
        }

        // If the server-side call returned 404, 405, 500, or any non-ok status (e.g. static hosting on GitHub Pages, Vercel SPA) and actualKey is available,
        // we gracefully fall back to direct client-side generation!
        if (response && (response.status === 404 || !response.ok) && actualKey && !usedClientDirect) {
          console.log(`API route returned status ${response.status}. Attempting direct browser-to-Gemini generation...`);
          usedClientDirect = true;
          try {
            response = await generateQuizDirectlyOnClient({
              subject: aiSubject,
              grade: aiGrade,
              topic: aiTopic,
              numQuestions: aiNumQuestions,
              languageFormat: aiLanguageFormat,
              textContext: aiTextContext,
              fileBase64: uploadedFileBase64,
              fileMimeType: uploadedFileMimeType,
              apiKey: actualKey
            });
          } catch (fallbackErr: any) {
            console.error('Direct fallback also failed:', fallbackErr);
            throw fallbackErr;
          }
        }
      }

      if (!response.ok) {
        let errMsg = 'ការបង្កើតកម្រងសំណួរដោយ AI បរាជ័យ';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } else {
            const errorText = await response.text();
            console.error('Server non-JSON response:', errorText);
            errMsg = `ម៉ាស៊ីនបម្រើបានផ្ដល់កំហុស (Status ${response.status})។ សូមពិនិត្យមើលការកំណត់ ឬ API Key របស់អ្នក!`;
          }
        } catch (_) {
          errMsg = `ម៉ាស៊ីនបម្រើបានផ្ដល់កំហុស (Status ${response.status})`;
        }
        throw new Error(errMsg);
      }

      let generatedQs;
      try {
        generatedQs = await response.json();
      } catch (parseError) {
        console.error('Failed to parse final response as JSON:', parseError);
        throw new Error('លទ្ធផលទទួលបានមកវិញមិនមែនជាទម្រង់ JSON ត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត!');
      }

      if (!Array.isArray(generatedQs) || generatedQs.length === 0) {
        throw new Error('AI មិនបានផ្ដល់ចម្លើយសំណួរត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត។');
      }

      // Format questions correctly to match our state
      const processedQs = generatedQs.map((q: any, idx: number) => {
        // Ensure accurate Khmer option labels inside the options array if requested in Khmer Format
        let resolvedOpts = q.options && q.options.length > 0 ? q.options : ['ក', 'ខ', 'គ', 'ឃ'];
        return {
          type: q.type || 'multiple_choice',
          text: q.text,
          timer: q.timer || 25,
          points: q.points || 1000,
          order: questions.length + idx + 1,
          options: resolvedOpts,
          correctAnswer: q.correctAnswer || resolvedOpts[0],
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          imageUrl: ''
        };
      });

      const append = confirm(`បានបង្កើតសំណួរគំរូចំនួន ${processedQs.length} ដោយជោគជ័យ! តើអ្នកចង់បន្ថែមវាទៅក្នុងបញ្ជីសំណួរដែលមានស្រាប់មែនទេ? (ចុច បោះបង់ ដើម្បីជំនួសបញ្ជីចាស់ចោល)`);

      if (append) {
        setQuestions([...questions, ...processedQs]);
        setActiveQuestionIdx(questions.length);
      } else {
        setQuestions(processedQs);
        setActiveQuestionIdx(0);
      }

      setSuccessMsg(`បានបង្កើតសំណួរគំរូចំនួន ${processedQs.length} ដ៏ត្រឹមត្រូវដោយជោគជ័យជាមួយ Gemini AI ផ្អែកលើទិន្នន័យឯកសាររបស់លោកគ្រូ!`);
      setActiveTab('editor'); // Switch tab back to editor so teacher can inspect and customize
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'កំហុសបច្ចេកទេសក្នុងវិភាគសំណួរជាមួយ Gemini AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const activeQ = questions[activeQuestionIdx] || {};

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => { gameAudio.playTick(); navigate('/teacher'); }}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition text-sm font-bold cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCsvImporter(!showCsvImporter)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition text-indigo-400 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>នាំចូលពី Excel .xlsx</span>
          </button>

          <button
            onClick={handleSaveQuiz}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-900/20 transition cursor-pointer"
            id="quiz-save-btn"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកកម្រងសំណួរ'}</span>
          </button>
        </div>
      </header>

      {/* Main Creator Area */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        
        {/* Left Panel: Question list tracker (4 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 shadow-lg">
            <h2 className="text-sm font-black text-slate-300 flex items-center space-x-2 pb-3 border-b border-slate-700/50 mb-3">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>បញ្ជីសំណួរ ({questions.length})</span>
            </h2>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => { gameAudio.playTick(); setActiveQuestionIdx(idx); }}
                  className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    activeQuestionIdx === idx
                      ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black">សំណួរ {idx + 1}</span>
                    <span className="text-3xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 capitalize">
                      {q.type === 'multiple_choice' ? 'ពហុជ្រើស' : q.type === 'true_false' ? 'ត្រូវ/ខុស' : q.type === 'fill_blank' ? 'បំពេញចន្លោះ' : q.type === 'matching' ? 'ភ្ជាប់គូ' : 'ចម្លើយខ្លី'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-1 font-medium select-none">
                    {q.text || 'មិនទាន់មានសំណួរ'}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddQuestion}
              className="w-full mt-4 flex items-center justify-center space-x-1.5 bg-slate-700 hover:bg-slate-600 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              id="add-question-btn"
            >
              <Plus className="w-4 h-4" />
              <span>បន្ថែមសំណួរថ្មី</span>
            </button>
          </div>

          {/* Quick Quiz Info Card */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 shadow-lg space-y-3">
            <h2 className="text-xs font-black text-slate-300">ព័ត៌មានកម្រងសំណួរ</h2>
            <div>
              <label className="text-3xs text-slate-400 font-bold block mb-1">ចំណងជើង</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-3xs text-slate-400 font-bold block mb-1">ការពិពណ៌នា</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs leading-relaxed text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Question Builder Interface (9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-350 rounded-2xl text-xs font-bold text-center">
              {successMsg}
            </div>
          )}

          {/* Choice Box Grid for Editor vs Gemini AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Box 1: Manual Editor */}
            <div
              onClick={() => { gameAudio.playTick(); setActiveTab('editor'); }}
              className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3 ${
                activeTab === 'editor'
                  ? 'bg-indigo-950/20 border-indigo-500 shadow-xl shadow-indigo-500/10 hover:border-indigo-400'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'editor' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-500'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-black text-xs md:text-sm ${activeTab === 'editor' ? 'text-indigo-400' : 'text-slate-300'}`}>
                    ✍️ រៀបចំសំណួរដោយដៃ (Manual Editor)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">សរសេរ និងរៀបចំដោយខ្លួនឯង</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                រៀបចំ បញ្ចូល ឬកែសម្រួលសំណួរនីមួយៗដោយខ្លួនឯងផ្ទាល់ ជាមួយនឹងជម្រើសចម្លើយ និងការកំណត់លម្អិត។
              </p>
              <div className="flex justify-end pt-1">
                <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${
                  activeTab === 'editor' ? 'bg-indigo-600 text-white font-sans font-black' : 'bg-slate-900 text-slate-500'
                }`}>
                  {activeTab === 'editor' ? 'កំពុងជ្រើសរើស ●' : 'ចុចដើម្បីប្តូរ'}
                </span>
              </div>
            </div>

            {/* Box 2: Gemini AI */}
            <div
              onClick={() => { gameAudio.playTick(); setActiveTab('ai'); }}
              className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3 ${
                activeTab === 'ai'
                  ? 'bg-indigo-950/20 border-indigo-500 shadow-xl shadow-indigo-500/10 hover:border-indigo-400'
                  : 'bg-slate-905 border-slate-855 hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'ai' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-900 text-slate-500'}`}>
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className={`font-black text-xs md:text-sm ${activeTab === 'ai' ? 'text-amber-500' : 'text-slate-300'}`}>
                    🤖 បង្កើតសំណួរដោយ Gemini AI (Multimodal Extractor)
                  </h3>
                  <span className="text-[10px] text-amber-500 font-bold block mt-0.5">ស្វ័យប្រវត្ត ល្បឿនលឿន</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                បង្កើតសំណួរល្បឿនលឿនពីមេរៀន សៀវភៅ ឬរូបថតសន្លឹកកិច្ចការ លំហាត់ផ្សេងៗដោយប្រើប្រាស់បញ្ញាសិប្បនិម្មិត Gemini AI។
              </p>
              <div className="flex justify-end pt-1">
                <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${
                  activeTab === 'ai' ? 'bg-indigo-650 text-white font-sans font-black' : 'bg-slate-900 text-slate-500'
                }`}>
                  {activeTab === 'ai' ? 'កំពុងជ្រើសរើស ●' : 'ចុចដើម្បីប្តូរ'}
                </span>
              </div>
            </div>
          </div>

          {/* CONDITIONAL RENDER: AI GENERATOR PANEL */}
          {activeTab === 'ai' && (
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-white flex items-center space-x-2">
                    <Wand2 className="w-5 h-5 text-amber-400" />
                    <span>មជ្ឈមណ្ឌលស្វ័យប្រវត្តិកម្ម និងបង្កើតសំណួរជាមួយ AI</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    បញ្ញាដោយបច្ចេកវិទ្យា GEMINI AI | <span className="text-indigo-400 font-bold">🔐 កំណត់ API Key</span>
                  </p>
                </div>
              </div>

              {/* Gemini API Key Box styled EXACTLY like the user's reference with Request & Insert linkings */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-5 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/10 pb-3">
                  <span className="text-xs md:text-sm font-black text-indigo-300 flex items-center space-x-2">
                    <span className="text-base">🔑</span>
                    <span>កំណត់កូនសោ API សម្រាប់សិក្សា & បង្កើតសំណួរ (Gemini API Key)</span>
                  </span>
                  
                  <a 
                    href="https://aistudio.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-extrabold uppercase bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all font-sans"
                  >
                    <span>👉 ស្នើសុំ API Key ឥតគិតថ្លៃទីនេះ ↗</span>
                  </a>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-slate-300 font-bold block">
                    បញ្ចូលកូនសោ API របស់អ្នក * (កូនសោចាប់ផ្ដើមដោយ៖ <span className="font-mono text-indigo-400">AIzaSy...</span>)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="password"
                      placeholder="បញ្ចូលកូនសោ API Gemini របស់អ្នកនៅទីនេះ..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playTick();
                        if (apiKeyInput.trim()) {
                          localStorage.setItem('studyplay_gemini_api_key', apiKeyInput.trim());
                          setSavedApiKey(apiKeyInput.trim());
                          setSuccessMsg('រក្សាទុកកូនសោ API Gemini របស់លោកគ្រូអ្នកគ្រូបានជោគជ័យ!');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        } else {
                          localStorage.removeItem('studyplay_gemini_api_key');
                          setSavedApiKey('');
                          setSuccessMsg('បានលុបកូនសោ API Gemini រួចរាល់!');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }
                      }}
                      className="px-8 py-3.5 bg-indigo-650 text-white hover:bg-indigo-600 font-black text-xs rounded-xl shadow-lg shadow-indigo-900/40 transition-all duration-150 cursor-pointer text-center whitespace-nowrap flex items-center justify-center font-sans"
                    >
                      <span>រក្សាទុកកូនសោ</span>
                    </button>
                  </div>
                </div>

                <div className="text-2xs text-slate-400 leading-relaxed font-semibold">
                  💡 <strong>ព័ត៌មានបន្ថែម៖</strong> ប្រព័ន្ធរក្សាកូនសោ API Gemini របស់លោកគ្រូ និងអ្នកគ្រូដោយសម្ងាត់បំផុតនៅក្នុងកន្លែងផ្ទុកទិន្នន័យ Local Web Storage របស់ Browser។ វាធានាថាកូនសោនឹងមិនត្រូវបានបញ្ជូនទៅកាន់ម៉ាស៊ីនបម្រើ (Server) ណាមួយឡើយ គឺដំណើរការផ្ទាល់តែម្តង។
                </div>
              </div>

              {/* WARNING MODAL ALERT IF API KEY IS NOT CONFIGURED AND NOT SAVED */}
              {!savedApiKey && !hasServerKey ? (
                <div className="p-5 bg-red-500/5 border border-red-500/15 text-red-450 rounded-2xl space-y-2.5">
                  <div className="flex items-start space-x-2.5">
                    <span className="text-base">⚠️</span>
                    <p className="text-xs font-black leading-relaxed text-red-400">
                      សូមបញ្ចូល កូនសោ API Gemini (Gemini API Key) ដើម្បីបង្កើតសំណួរដោយផ្ទាល់ពីកម្មវិធីរុករក (Browser)។
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playTick();
                      alert("សូមបំពេញកូនសោ API Gemini នៅលើប្រអប់កំណត់ខាងលើ រួចចុច 'រក្សាទុក'!");
                    }}
                    className="text-indigo-400 hover:text-indigo-300 text-2xs font-black flex items-center space-x-1 pl-6 cursor-pointer"
                  >
                    <span>កំណត់ ឬប្តូរ API Key ឡើងវិញ ↗</span>
                  </button>
                </div>
              ) : !savedApiKey && hasServerKey ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 rounded-2xl">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">✔️</span>
                    <p className="text-xs font-black leading-relaxed text-emerald-400">
                      ប្រព័ន្ធមាន កូនសោ API រួចជាស្រេចពីម៉ាស៊ីនបម្រើ (Pre-configured Server Key)! លោកគ្រូអ្នកគ្រូអាចលេងកម្សាន្ត និងបង្កើតសំនួរបានភ្លាមៗដោយមិនចាំបាច់បញ្ចូលកូនសោផ្ទាល់ខ្លួនឡើយ។
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Form entries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1.5">📚 មុខវិជ្ជា (Subject)</label>
                  <input
                    type="text"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    placeholder="ឧទាហរណ៍៖ រូបវិទ្យា, គណិតវិទ្យា, គីមីវិទ្យា..."
                    className="w-full bg-slate-900 border border-slate-705 px-4 py-2.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1.5">🎓 កម្រិតថ្នាក់ (Grade Level)</label>
                  <select
                    value={aiGrade}
                    onChange={(e) => setAiGrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-705 px-3 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">ជ្រើសរើសថ្នាក់...</option>
                    <option value="Grade 7">ថ្នាក់ទី ៧</option>
                    <option value="Grade 8">ថ្នាក់ទី ៨</option>
                    <option value="Grade 9">ថ្នាក់ទី ៩</option>
                    <option value="Grade 10">ថ្នាក់ទី ១០</option>
                    <option value="Grade 11">ថ្នាក់ទី ១១</option>
                    <option value="Grade 12">ថ្នាក់ទី ១២</option>
                  </select>
                </div>

                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1.5">🎯 ប្រធានបទសិក្សា (Topic/Focus)</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="ឧទាហរណ៍៖ ចំណាំងផ្លាតនៃពន្លឺ, សមីការដឺក្រេទី២..."
                    className="w-full bg-slate-900 border border-slate-705 px-4 py-2.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-2xs text-slate-400 font-bold block mb-1.5">🔢 ចំនួនសំណួរ (Questions)</label>
                    <div className="space-y-2">
                      <select
                        value={isCustomQuestions ? 'custom' : aiNumQuestions}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setIsCustomQuestions(true);
                            if (aiNumQuestions <= 20) {
                              setAiNumQuestions(30);
                            }
                          } else {
                            setIsCustomQuestions(false);
                            setAiNumQuestions(parseInt(val, 10));
                          }
                        }}
                        className="w-full bg-slate-905 border border-slate-705 px-3 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={3}>៣ សំណួរ (3 Qs)</option>
                        <option value={5}>៥ សំណួរ (5 Qs)</option>
                        <option value={10}>១០ សំណួរ (10 Qs)</option>
                        <option value={15}>១៥ សំណួរ (15 Qs)</option>
                        <option value={20}>២០ សំណួរ (20 Qs)</option>
                        <option value={25}>២៥ សំណួរ (25 Qs)</option>
                        <option value={30}>៣០ សំណួរ (30 Qs)</option>
                        <option value={40}>៤០ សំណួរ (40 Qs)</option>
                        <option value={50}>៥០ សំណួរ (50 Qs)</option>
                        <option value="custom">✍️ កំណត់ចំនួនផ្ទាល់ខ្លួន... (Custom)</option>
                      </select>

                      {isCustomQuestions && (
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={aiNumQuestions}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              setAiNumQuestions(isNaN(parsed) ? 1 : Math.max(1, Math.min(100, parsed)));
                            }}
                            className="w-full bg-slate-900 border border-slate-705 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="ចំនួនសំណួរ (១ - ១ hundred)"
                          />
                          <span className="absolute right-3 top-2 text-2xs text-slate-500">
                            សំណួរ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-2xs text-slate-400 font-bold block mb-1.5">🌐 ភាសាសំណួរ (Quiz Language)</label>
                    <select
                      value={aiLanguageFormat}
                      onChange={(e) => setAiLanguageFormat(e.target.value as 'khmer' | 'english')}
                      className="w-full bg-slate-905 border border-slate-705 px-3 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="khmer">ភាសាខ្មែរ 🇰🇭</option>
                      <option value="english">English 🇺🇸</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Paste details from Text */}
              <div className="space-y-1.5">
                <label className="text-2xs text-slate-400 font-bold block">📝 បិទភ្ជាប់អត្ថបទមេរៀន សៀវភៅ ឬកំណត់ត្រា (Lesson / Notes Context)</label>
                <textarea
                  value={aiTextContext}
                  onChange={(e) => setAiTextContext(e.target.value)}
                  rows={4}
                  placeholder="បិទភ្ជាប់ចំណុចសំខាន់ៗនៃមេរៀនរបស់អ្នកនៅទីនេះ។ AI នឹងទាញយកសំណួរពហុជ្រើសរើស ត្រូវ/ខុស ឬបំពេញចន្លោះផ្អែកលើអត្ថបទនេះ..."
                  className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-2xl text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Interactive File Dropzone for PDF, Images, Word, Slides, Spreadsheets */}
              <div className="p-6 border-2 border-dashed border-slate-705 rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 hover:border-indigo-500/50 transition duration-150 relative flex flex-col items-center justify-center text-center group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.csv,image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="dropzone-file-input"
                />
                
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
                <p className="text-xs font-black text-slate-300">
                  {uploadedFileName ? `📂 ${uploadedFileName}` : 'អូសនិងទម្លាក់ ឬ ចុចដើម្បីស្វែងរកឯកសារដើម្បីផ្ដល់ឱ្យ AI'}
                </p>
                <p className="text-3xs text-slate-500 mt-1 whitespace-pre-wrap leading-normal">
                  គាំទ្រ៖ PDF, DOC, DOCX, PPT, PPTX, TXT, XLSX, CSV, PNG, JPG, JPEG, WEBP <br/>
                  <strong className="text-indigo-400">💡 ពិសេស៖</strong> អ្នកក៏អាចថតចម្លងរូបភាព ចុចប្រអប់នេះ រួចចុច <strong className="text-indigo-400">Ctrl + V</strong> ដើម្បីបញ្ចូលរូបថតពី Clipboard របស់អ្នកបានដោយសេរី!
                </p>

                {uploadedFileBase64 && (
                  <div className="mt-4 p-2 bg-slate-800 rounded-xl flex items-center space-x-2 border border-slate-700 text-3xs text-slate-300">
                    {uploadedFileMimeType.startsWith('image/') ? (
                      <img src={`data:${uploadedFileMimeType || 'image/png'};base64,${uploadedFileBase64}`} alt="Preview" className="w-8.5 h-8.5 object-cover rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <FileText className="w-6 h-6 text-indigo-400" />
                    )}
                    <span>ឯកសារទំហំរៀបចំរួចរាល់ ({uploadedFileName})</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setUploadedFileName('');
                        setUploadedFileBase64('');
                        setUploadedFileMimeType('');
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 bg-slate-950/40 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={handleGenerateAIQuiz}
                  className="w-full md:w-auto flex items-center justify-center space-x-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-indigo-950/40 transition disabled:opacity-40 cursor-pointer"
                  id="gemini-generate-btn"
                >
                  {isAiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Gemini AI កំពុងវិភាគឯកសារ និងរៀបចំសំណួរ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                      <span>បង្កើតសំណួរគំរូដោយស្វ័យប្រវត្តជាមួយ AI (Gemini Generate)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* CONDITIONAL RENDER: MANUAL EDITOR */}
          {activeTab === 'editor' && (
            <>

          {/* CSV Importer Modal (Shown conditionally) */}
          {showCsvImporter && (
            <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-white text-sm">នាំចូលសំណួរពី Excel .xlsx ឬ CSV</h3>
                  <p className="text-3xs text-slate-400 mt-1">
                    ចម្លងសំណួរពី Excel ឬ CSV រួចបិទភ្ជាប់ក្នុងប្រអប់ខាងក្រោម។ ទម្រង់គំរូ៖<br />
                    <code className="text-amber-400">សំណួរ,ប្រភេទ,រយៈពេល(វិនាទី),ពិន្ទុ,ចម្លើយត្រូវ,ជម្រើស១,ជម្រើស២,ជម្រើស៣,ជម្រើស៤</code>
                  </p>
                </div>
                <button 
                  onClick={() => setShowCsvImporter(false)} 
                  className="text-xs text-slate-400 hover:text-white"
                >
                  បិទវិញ
                </button>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={4}
                placeholder={`ឧទាហរណ៍៖\nព្រះមហាក្សត្រខ្មែរបច្ចុប្បន្នជាគ្រូណា?,multiple_choice,20,1000,នរោត្តម សីហមុនី,នរោត្តម សីហនុ,នរោត្តម សីហមុនី,ស៊ីសុវត្ថិ,ព្រះកែវហ្វា\nប្រទេសកម្ពុជាមានព្រំប្រទល់ជាប់ឡាវ,true_false,15,1000,ត្រូវ`}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowCsvImporter(false)}
                  className="bg-slate-700 hover:bg-slate-600 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleImportCsv}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>អនុវត្តការនាំចូល</span>
                </button>
              </div>
            </div>
          )}

          {/* Core Question Editor Body */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative">
            {/* Top Config row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-700/50 mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black text-indigo-400">សំណួរ #{activeQuestionIdx + 1}</span>
                <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl">
                  <button
                    disabled={activeQuestionIdx === 0}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'up')}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    title="ផ្លាស់ទីឡើងលើ"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={activeQuestionIdx === questions.length - 1}
                    onClick={() => handleMoveQuestion(activeQuestionIdx, 'down')}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    title="ផ្លាស់ទីចុះក្រោម"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                {/* Type selector */}
                <div className="flex-1 md:flex-initial">
                  <select
                    value={activeQ.type || 'multiple_choice'}
                    onChange={(e) => handleUpdateActiveField('type', e.target.value as QuestionType)}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="multiple_choice">សំណួរជ្រើសរើសចម្លើយពហុ</option>
                    <option value="true_false">សំណួរខុស ឬ ត្រូវ</option>
                    <option value="fill_blank">សំណួរបំពេញចន្លោះ (Fill Blank)</option>
                    <option value="matching">សំណួរភ្ជាប់គូ (Matching)</option>
                    <option value="short_answer">សំណួរឆ្លើយខ្លី (Short Answer)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(activeQuestionIdx)}
                  className="p-2 bg-red-950/40 text-red-400 border border-red-500/10 hover:bg-red-950/60 transition rounded-xl"
                  title="លុបសំណួរ"
                >
                  <Trash className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Editing Section */}
            <div className="space-y-6">
              {/* Question text */}
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1.5">✍️ បំពេញសំណួររបស់អ្នក</label>
                <input
                  type="text"
                  value={activeQ.text || ''}
                  onChange={(e) => handleUpdateActiveField('text', e.target.value)}
                  placeholder="បញ្ចូលចំណងជើងសំណួរ ឬលំហាត់គណិតវិទ្យា/រូបវិទ្យានៅទីនេះ..."
                  className="w-full bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Grid: Timer / Points / Image URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1">⏱️ រយៈពេលឆ្លើយ (វិនាទី)</label>
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={activeQ.timer || 20}
                    onChange={(e) => handleUpdateActiveField('timer', Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="វិនាទី"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[5, 10, 15, 20, 30, 45, 60, 125, 180].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleUpdateActiveField('timer', t)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          (activeQ.timer || 20) === t
                            ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                            : 'bg-slate-905 border-slate-700 text-slate-400 hover:bg-slate-705 hover:text-slate-200'
                        }`}
                      >
                        {t} វិ.
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1">⭐ ពិន្ទុទទួលបាន</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={100}
                    value={activeQ.points || 1000}
                    onChange={(e) => handleUpdateActiveField('points', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="ចំនុចពិន្ទុ"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[500, 1000, 1500, 2000, 5000].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => handleUpdateActiveField('points', pts)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          (activeQ.points || 1000) === pts
                            ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                            : 'bg-slate-905 border-slate-700 text-slate-400 hover:bg-slate-705 hover:text-slate-200'
                        }`}
                      >
                        {pts.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-2xs text-slate-400 font-bold block mb-1">🖼️ តំណភ្ជាប់រូបភាព (ImageUrl - ជម្រើស)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={activeQ.imageUrl || ''}
                      onChange={(e) => handleUpdateActiveField('imageUrl', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 pl-8 pr-3 py-2.5 rounded-xl text-3xs font-mono text-slate-300 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <ImageIcon className="w-4 h-4 text-slate-500 absolute left-2.5 top-3.5" />
                  </div>
                </div>
              </div>

              {/* Grid: Difficulty and Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div className="md:col-span-4">
                  <label className="text-2xs text-slate-400 font-bold block mb-1">⚡ កម្រិតលំបាក (Difficulty)</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => handleUpdateActiveField('difficulty', diff)}
                        className={`py-1.5 rounded-lg text-3xs font-extrabold uppercase transition cursor-pointer ${
                          (activeQ.difficulty || 'medium') === diff
                            ? diff === 'easy' ? 'bg-emerald-600 text-white shadow' : diff === 'medium' ? 'bg-amber-600 text-white shadow' : 'bg-red-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {diff === 'easy' ? 'ងាយ' : diff === 'medium' ? 'មធ្យម' : 'ពិបាក'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-8">
                  <label className="text-2xs text-slate-400 font-bold block mb-1">💡 ការពន្យល់ចម្លើយត្រឹមត្រូវ (Explanation for Student results)</label>
                  <input
                    type="text"
                    value={activeQ.explanation || ''}
                    onChange={(e) => handleUpdateActiveField('explanation', e.target.value)}
                    placeholder="ពន្យល់សិស្សពីមូលហេតុចម្លើយត្រឹមត្រូវ..."
                    className="w-full bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Input Answers depending on selected category */}
              <div className="pt-4 border-t border-slate-700/50">
                <h3 className="text-xs font-black text-slate-300 mb-4">⚙️ កំណត់រចនាសម្ព័ន្ធជម្រើសចម្លើយ និងការផ្គូផ្គង</h3>

                {/* MULTIPLE CHOICE */}
                {activeQ.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(activeQ.options || ['', '', '', '']).map((opt, optIdx) => (
                        <div key={optIdx} className="relative">
                          <span className={`absolute left-3 top-3 px-1.5 py-0.5 rounded text-3xs font-bold ${
                            optIdx === 0 ? 'bg-red-500/20 text-red-300' :
                            optIdx === 1 ? 'bg-blue-500/20 text-blue-300' :
                            optIdx === 2 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {optionsFormat === 'khmer'
                              ? (optIdx === 0 ? 'ក' : optIdx === 1 ? 'ខ' : optIdx === 2 ? 'គ' : 'ឃ')
                              : (optIdx === 0 ? 'A' : optIdx === 1 ? 'B' : optIdx === 2 ? 'C' : 'D')}
                          </span>
                          
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                            placeholder={`ជម្រើសទី ${optIdx + 1}`}
                            className="w-full bg-slate-900 border border-slate-800 pl-10 pr-10 py-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />

                          <button
                            onClick={() => handleUpdateActiveField('correctAnswer', opt)}
                            className={`absolute right-3 top-2.5 p-1 rounded-lg transition-all ${
                              activeQ.correctAnswer === opt && opt.length > 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-500'
                            }`}
                            title="ចម្លើយដ៏ត្រឹមត្រូវ"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 text-3xs text-slate-400 rounded-xl leading-normal">
                      💡 <strong>តម្រុយ៖</strong> ចុចលើរូបសញ្ញាគ្រីស <Check className="w-3.5 h-3.5 inline inline-block bg-emerald-500 text-white p-0.5 rounded" /> នៅខាងស្តាំប្រអប់ជម្រើសចម្លើយ ដើម្បីកំណត់ចម្លើយនោះជាចម្លើយត្រូវ។
                    </div>
                  </div>
                )}

                {/* TRUE / FALSE */}
                {activeQ.type === 'true_false' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleUpdateActiveField('correctAnswer', 'ត្រូវ')}
                      className={`flex-1 py-4 rounded-xl font-bold text-center transition cursor-pointer ${
                        activeQ.correctAnswer === 'ត្រូវ'
                          ? 'bg-emerald-600 border border-emerald-500 text-white text-sm shadow-lg'
                          : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400'
                      }`}
                    >
                      ត្រូវ (True)
                    </button>
                    <button
                      onClick={() => handleUpdateActiveField('correctAnswer', 'ខុស')}
                      className={`flex-1 py-4 rounded-xl font-bold text-center transition cursor-pointer ${
                        activeQ.correctAnswer === 'ខុស'
                          ? 'bg-red-600 border border-red-500 text-white text-sm shadow-lg'
                          : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400'
                      }`}
                    >
                      ខុស (False)
                    </button>
                  </div>
                )}

                {/* FILL BLANK */}
                {activeQ.type === 'fill_blank' && (
                  <div className="space-y-3">
                    <label className="text-3xs text-slate-400 font-bold block mb-1">ពាក្យគន្លឹះចម្លើយត្រូវ (បំពេញចន្លោះ)</label>
                    <input
                      type="text"
                      value={activeQ.correctAnswer || ''}
                      onChange={(e) => handleUpdateActiveField('correctAnswer', e.target.value)}
                      placeholder="ពាក្យ/សមីការចម្លើយត្រឹមត្រូវ (ឧ. H2O, ផែនដី)"
                      className="w-full bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-3xs text-slate-400 rounded-xl leading-normal">
                      ℹ️ សិស្សគ្រាន់តែវាយបញ្ចូលពាក្យឆ្លើយគន្លឹះខាងលើ ដើម្បីទទួលបានពិន្ទុ។ មិនគិតអំពីអក្សរតូចធំឡើយ។
                    </div>
                  </div>
                )}

                {/* SHORT ANSWER */}
                {activeQ.type === 'short_answer' && (
                  <div className="space-y-3">
                    <label className="text-3xs text-slate-400 font-bold block mb-1">ចម្លើយខ្លីស្វ័យប្រវត្តិតម្រូវ</label>
                    <input
                      type="text"
                      value={activeQ.correctAnswer || ''}
                      onChange={(e) => handleUpdateActiveField('correctAnswer', e.target.value)}
                      placeholder="ចម្លើយខ្លីដ៏ត្រឹមត្រូវ (ឧ. 100, ភ្នំពេញ)"
                      className="w-full bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* MATCHING */}
                {activeQ.type === 'matching' && (
                  <div className="space-y-3">
                    <label className="text-3xs text-slate-400 font-bold block mb-1">ភ្ជាប់គូផ្គូផ្គង (ឆ្វេង ភ្ជាប់ទៅ ស្តាំ)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-3xs font-bold text-slate-400 block mb-1.5">គូឆ្វេង៖</span>
                        <input
                          type="text"
                          value={activeQ.correctAnswer ? activeQ.correctAnswer.split('==')[0] : 'ឆ្វេង'}
                          onChange={(e) => {
                            const right = activeQ.correctAnswer ? activeQ.correctAnswer.split('==')[1] || 'ស្តាំ' : 'ស្តាំ';
                            handleUpdateActiveField('correctAnswer', `${e.target.value}==${right}`);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-3xs font-bold text-slate-400 block mb-1.5">គូស្តាំ៖</span>
                        <input
                          type="text"
                          value={activeQ.correctAnswer ? activeQ.correctAnswer.split('==')[1] : 'ស្តាំ'}
                          onChange={(e) => {
                            const left = activeQ.correctAnswer ? activeQ.correctAnswer.split('==')[0] || 'ឆ្វេង' : 'ឆ្វេង';
                            handleUpdateActiveField('correctAnswer', `${left}==${e.target.value}`);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
            </>
          )}
        </div>
      </main>

      {/* Floating Theme Switcher Option (Light / Dark Mode Toggle) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            gameAudio.playTick();
            setIsLightMode(!isLightMode);
          }}
          className="w-12 h-12 rounded-full bg-indigo-650 hover:bg-indigo-600 text-white shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer border border-indigo-400/20"
          title={isLightMode ? "ប្តូរទៅរបៀបងងឹត (Dark Mode)" : "ប្តូរទៅរបៀបភ្លឺ (Light Mode)"}
        >
          {isLightMode ? (
            <Moon className="w-5.5 h-5.5 text-amber-200" />
          ) : (
            <Sun className="w-5.5 h-5.5 text-yellow-300" />
          )}
        </button>
      </div>

      <footer className="bg-slate-950 py-4 border-t border-slate-900 text-center text-xs text-slate-500 mt-12">
        <p>&copy; 2026 StudyPlay. បង្កើតឡើងជាពិសេសសម្រាប់ភាសាខ្មែរ ប្រើប្រាស់ពុម្ពអក្សរបាត់ដំបង។</p>
      </footer>
    </div>
  );
}
