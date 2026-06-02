import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, BookOpen, Loader2, Info, Upload, FileText, Trash2, FileSpreadsheet, Presentation } from 'lucide-react';
import { generateQuestions, getSavedApiKey, saveApiKey, FileData } from '../lib/gemini';
import { Question } from '../types';
import { PREBUILT_LESSONS } from '../lib/templates';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
}

const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'csv': return 'text/csv';
    case 'txt': return 'text/plain';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
};

export default function LessonModal({ isOpen, onClose, onQuestionsGenerated }: LessonModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(25);
  const [apiKeyInput, setApiKeyInput] = useState(getSavedApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // States for files
  const [uploadedImages, setUploadedImages] = useState<FileData[]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<FileData[]>([]);
  const [uploadedOfficeFiles, setUploadedOfficeFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const nameLower = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string; 
        const fileData: FileData = {
          name: file.name,
          mimeType: file.type || getMimeTypeFromExtension(nameLower),
          data: base64String
        };

        if (nameLower.endsWith('.pdf')) {
          setUploadedPdfs(prev => {
            if (prev.some(p => p.name === file.name)) return prev;
            return [...prev, fileData];
          });
        } else if (
          nameLower.endsWith('.docx') ||
          nameLower.endsWith('.doc') ||
          nameLower.endsWith('.pptx') ||
          nameLower.endsWith('.ppt') ||
          nameLower.endsWith('.xlsx') ||
          nameLower.endsWith('.xls') ||
          nameLower.endsWith('.csv') ||
          nameLower.endsWith('.txt') ||
          file.type.includes('wordprocessingml') ||
          file.type.includes('presentationml') ||
          file.type.includes('spreadsheetml') ||
          file.type.includes('msword') ||
          file.type.includes('ms-excel') ||
          file.type.includes('ms-powerpoint') ||
          file.type === 'text/plain'
        ) {
          setUploadedOfficeFiles(prev => {
            if (prev.some(o => o.name === file.name)) return prev;
            return [...prev, fileData];
          });
        } else if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|jfif)$/i.test(nameLower)) {
          setUploadedImages(prev => {
            if (prev.some(p => p.name === file.name)) return prev;
            return [...prev, fileData];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // Listen to Global Paste Events
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `Pasted Image-${Date.now().toString().slice(-4)}.png`, { type: blob.type });
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!text.trim() && uploadedImages.length === 0 && uploadedPdfs.length === 0 && uploadedOfficeFiles.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const questions = await generateQuestions(text, count, uploadedImages, uploadedPdfs, uploadedOfficeFiles);
      onQuestionsGenerated(questions);
      // Clean up inputs on success
      setText('');
      setUploadedImages([]);
      setUploadedPdfs([]);
      setUploadedOfficeFiles([]);
      onClose();
    } catch (err: any) {
      if (err.message === "NEED_API_KEY") {
        setShowKeyInput(true);
        setErrorMsg("សូមបញ្ចូល កូនសោ API Gemini (Gemini API Key) ដើម្បីបង្កើតសំណួរដោយផ្ទាល់ពីកម្មវិធីរុករក (Browser)។");
      } else {
        const rawErr = err.message || '';
        if (
          rawErr.toLowerCase().includes("quota") ||
          rawErr.toLowerCase().includes("limit") ||
          rawErr.toLowerCase().includes("resource_exhausted") ||
          rawErr.toLowerCase().includes("exhausted") ||
          rawErr.toLowerCase().includes("429") ||
          rawErr.toLowerCase().includes("busy") ||
          rawErr.toLowerCase().includes("overloaded")
        ) {
          setErrorMsg("⚠️ កូតានៃគណនីឥតគិតថ្លៃរួមគ្នាសម្រាប់កម្មវិធី (Gemini API Shared Free Quota) ត្រូវបានកំណត់ទំហំ។ សូមសាកល្បងម្ដងទៀតក្នុងរយៈពេល ១ នាទីខាងមុខ ឬកំណត់ API Key ផ្ទាល់ខ្លួនរបស់អ្នក (ចុច '🔐 កំណត់ API Key' ខាងលើ) ឬជ្រើសរើសប្រើប្រាស់មេរៀនគំរូទូទៅខាងក្រោមភ្លាមៗដោយពុំបាច់រង់ចាំ AI ឡើយ!");
        } else {
          setErrorMsg(rawErr || 'មានបញ្ហាក្នុងការបង្កើតសំណួរ');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">បង្កើតសន្លឹកប័ណ្ណសំណួរ</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">បញ្ជាដោយបច្ចេកវិទ្យា Gemini AI</p>
                    <span className="text-[10px] text-slate-300">|</span>
                    <button 
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-0.5"
                    >
                      🔐 កំណត់ API Key
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {showKeyInput && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      🔐 កូនសោ API Gemini (Gemini API Key)
                    </label>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-bold"
                    >
                      បង្កើត API Key ឥតគិតថ្លៃ ↗
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        saveApiKey(e.target.value);
                      }}
                      placeholder="បញ្ចូលកូនសោ API Gemini (ឧទាហរណ៍៖ AIzaSy...)"
                      className="flex-1 p-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(false)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      រក្សាទុក
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700/80 mt-2 leading-relaxed">
                    ព្រោះតែកម្មវិធីនេះត្រូវបានបង្ហោះជាលក្ខណៈ static (ឧទាហរណ៍ Vercel, Github Pages) គ្មានម៉ាស៊ីនបម្រើផ្ទាល់ខ្លួន, អ្នកត្រូវការបញ្ចូលកូនសោ API ផ្ទាល់ខ្លួនដើម្បីប្រើប្រាស់មុខងារ AI នេះ។ កូនសោនឹងត្រូវបានរក្សាទុកក្នុងឧបករណ៍របស់អ្នកដោយមានសុវត្ថិភាពខ្ពស់។
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                  <span className="text-red-500 font-bold shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="text-xs text-red-800 font-semibold leading-relaxed">{errorMsg}</p>
                    {(errorMsg.includes("API Key") || errorMsg.includes("កូនសោ") || errorMsg.includes("NEED_API_KEY") || errorMsg.includes("403") || errorMsg.includes("400")) && (
                      <button
                        onClick={() => setShowKeyInput(true)}
                        className="text-xs text-indigo-600 hover:underline font-bold mt-1.5 block"
                      >
                        កំណត់ ឬប្ដូរ API Key ឡើងវិញ ↗
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Prebuilt Lesson Templates */}
              <div className="mb-6 p-5 bg-indigo-50/40 border border-indigo-100 rounded-3xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3.5 gap-2 border-b border-indigo-100/50 pb-2.5">
                  <span className="flex items-center gap-2 text-xs font-black text-slate-705 dark:text-slate-700 uppercase tracking-wider">
                    📚 ជ្រើសរើសមេរៀនគំរូទូទៅ និងរហ័ស (Instant Offline Templates)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full border border-emerald-250">
                    មិនប្រើអ៊ីនធឺណិត / រួចរាល់ភ្លាមៗ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PREBUILT_LESSONS.map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => {
                        onQuestionsGenerated([...lesson.questions]);
                        onClose();
                      }}
                      className="text-left p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xl select-none">
                            {lesson.subject === 'math' ? '🧮' : lesson.subject === 'physics' ? '⚡' : lesson.subject === 'chemistry' ? '🧪' : '🏰'}
                          </span>
                          <h4 className="text-[12.5px] font-black text-slate-800 group-hover:text-indigo-650 transition-colors">
                            {lesson.title}
                          </h4>
                        </div>
                        <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed font-semibold">
                          {lesson.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-extrabold mt-3 inline-block">
                        ទាញចូល {lesson.questions.length} សំណួរភ្លាមៗ ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  ខ្លឹមសារមេរៀន
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="សូមចម្លងខ្លឹមសារមេរៀន ឬកំណត់ចំណាំរបស់អ្នកដាក់ទីនេះ... AI នឹងបង្កើតសំណួរចេញពីមេរៀននេះ។"
                  className="w-full h-40 p-4 bg-white text-slate-900 border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm leading-relaxed font-semibold placeholder-slate-400 shadow-sm"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  📎 បញ្ចូលឯកសារ ឬរូបភាពបន្ថែម
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDragging 
                      ? "border-indigo-600 bg-indigo-50/50 scale-[0.99] text-indigo-600" 
                      : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50 bg-slate-50/20 text-slate-500"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple 
                    accept="image/*,application/pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt" 
                    className="hidden" 
                  />
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">អូស និងទម្លាក់ រូបភាព, PDF, Word, Excel, PowerPoint ទីនេះ</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                    ឬចុចដើម្បីជ្រើសរើសឯកសារ (ឬ ចុច <kbd className="bg-slate-100 px-1 py-0.5 rounded border text-slate-600 font-mono text-[9px]">Ctrl + V</kbd> ដើម្បីចម្លងរូបភាពពី Clipboard)
                  </p>
                </div>

                {/* Uploaded Files list */}
                {(uploadedImages.length > 0 || uploadedPdfs.length > 0 || uploadedOfficeFiles.length > 0) && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ឯកសារភ្ជាប់ដែលបានផ្ទុកឡើង ({uploadedImages.length + uploadedPdfs.length + uploadedOfficeFiles.length})៖</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {uploadedImages.map((img, idx) => (
                        <div key={`img-${idx}`} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl relative group">
                          <img 
                            src={img.data} 
                            alt="uploaded preview" 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{img.name || `រូបភាព ${idx + 1}`}</p>
                            <p className="text-[9.5px] text-green-600 font-semibold flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" /> រូបភាពរួចរាល់
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {uploadedPdfs.map((pdf, idx) => (
                        <div key={`pdf-${idx}`} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl relative group">
                          <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{pdf.name || `ឯកសារ PDF ${idx + 1}`}</p>
                            <p className="text-[9.5px] text-rose-600 font-semibold flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" /> ឯកសារ PDF រួចរាល់
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedPdfs(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {uploadedOfficeFiles.map((of, idx) => {
                        const isWord = of.name?.toLowerCase().endsWith('.docx') || of.name?.toLowerCase().endsWith('.doc') || of.mimeType?.includes('word');
                        const isSlide = of.name?.toLowerCase().endsWith('.pptx') || of.name?.toLowerCase().endsWith('.ppt') || of.mimeType?.includes('presentation') || of.mimeType?.includes('powerpoint');
                        const isExcel = of.name?.toLowerCase().endsWith('.xlsx') || of.name?.toLowerCase().endsWith('.xls') || of.name?.toLowerCase().endsWith('.csv') || of.mimeType?.includes('spreadsheet') || of.mimeType?.includes('excel') || of.mimeType?.includes('csv');

                        let iconComponent = <FileText className="w-5 h-5" />;
                        let bgClass = "bg-slate-50 border-slate-100 text-slate-600";
                        let bannerText = "ឯកសាររួចរាល់";
                        let statusColor = "text-slate-600";

                        if (isWord) {
                          iconComponent = <FileText className="w-5 h-5" />;
                          bgClass = "bg-blue-50 border-blue-100 text-blue-600";
                          bannerText = "ឯកសារ Word រួចរាល់";
                          statusColor = "text-blue-600";
                        } else if (isSlide) {
                          iconComponent = <Presentation className="w-5 h-5" />;
                          bgClass = "bg-orange-50 border-orange-100 text-orange-600";
                          bannerText = "ឯកសារ PowerPoint រួចរាល់";
                          statusColor = "text-orange-600";
                        } else if (isExcel) {
                          iconComponent = <FileSpreadsheet className="w-5 h-5" />;
                          bgClass = "bg-emerald-50 border-emerald-100 text-emerald-600";
                          bannerText = "សន្លឹកការងារ Excel រួចរាល់";
                          statusColor = "text-emerald-600";
                        }

                        return (
                          <div key={`of-${idx}`} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl relative group">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${bgClass}`}>
                              {iconComponent}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 truncate">{of.name || `ឯកសារការិយាល័យ ${idx + 1}`}</p>
                              <p className={`text-[9.5px] font-semibold flex items-center gap-1 ${statusColor}`}>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full animate-bounce ${isExcel ? 'bg-emerald-500' : isWord ? 'bg-blue-500' : isSlide ? 'bg-orange-500' : 'bg-slate-500'}`} /> {bannerText}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedOfficeFiles(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="w-full sm:flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-slate-700">ចំនួនសន្លឹកប័ណ្ណ</label>
                    <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-lg text-sm">{count}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    step="5"
                    value={count} 
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                  />
                  <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400 uppercase">
                    <span>៥</span>
                    <span>១០០ សន្លឹក</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || (!text.trim() && uploadedImages.length === 0 && uploadedPdfs.length === 0 && uploadedOfficeFiles.length === 0)}
                  className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl active:scale-95 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      កំពុងបង្កើត...
                    </>
                  ) : (
                    <>
                      បង្កើតសំណួរ
                      <Sparkles className="w-5 h-5 text-indigo-400 group-hover:animate-pulse" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  AI នឹងធ្វើការវិភាគលើអត្ថបទមេរៀន រូបភាព ឯកសារ PDF ឬឯកសារការិយាល័យ (Word, Excel, PowerPoint) របស់អ្នកដើម្បីបង្កើតសំណួរពហុជ្រើសរើស។ 
                  អ្នកអាចដាក់ឯកសារជាភាសាខ្មែរ ឬអង់គ្លេស។
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

