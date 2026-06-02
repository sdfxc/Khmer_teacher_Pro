import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Timer, CheckCircle, XCircle, Info, Trophy, AlertCircle, RotateCcw, BookOpen, Plus, Trash2, Layers, Folder, Edit3, Check, X, ChevronDown, Printer, Download, Sparkles, Settings, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, QuizCard, Student, QuizRoom, QuizChapter } from '../types';
import FormulaRenderer, { renderFormulaToHtml, preprocessText } from './FormulaRenderer';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  AlignmentType, 
  BorderStyle, 
  WidthType, 
  VerticalAlign,
  ImageRun
} from 'docx';

interface QuizPanelProps {
  cards: QuizCard[];
  onCardClick: (card: QuizCard) => void;
  onAnswer: (correct: boolean) => void;
  onReset: () => void;
  activeCard: QuizCard | null;
  selectedStudent: Student | null;
  chapters: QuizChapter[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (chapterId: string, roomName: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, newName: string) => void;
  onCreateChapter: (chapterName: string) => void;
  onRenameChapter: (chapterId: string, newName: string) => void;
  onDeleteChapter: (chapterId: string) => void;
  isDarkMode?: boolean;
  onUpdateCards?: (updatedCards: QuizCard[]) => void;
}

export const AVAILABLE_FONTS = [
  { id: 'Khmer OS', name: 'Khmer OS', cssValue: "'Khmer OS', 'Hanuman', serif", wordFontName: 'Khmer OS', googleFontId: 'Hanuman' },
  { id: 'Khmer OS Content', name: 'Khmer OS Content', cssValue: "'Khmer OS Content', 'Content', sans-serif", wordFontName: 'Khmer OS Content', googleFontId: 'Content' },
  { id: 'Khmer OS Siemreap', name: 'Khmer OS Siemreap', cssValue: "'Khmer OS Siemreap', 'Siemreap', sans-serif", wordFontName: 'Khmer OS Siemreap', googleFontId: 'Siemreap' },
  { id: 'Khmer OS Battambang', name: 'Khmer OS Battambang', cssValue: "'Khmer OS Battambang', 'Battambang', sans-serif", wordFontName: 'Khmer OS Battambang', googleFontId: 'Battambang' },
  { id: 'Khmer OS Muol Light', name: 'Khmer OS Muol Light', cssValue: "'Khmer OS Muol Light', 'Moul', sans-serif", wordFontName: 'Khmer OS Muol Light', googleFontId: 'Moul' },
  { id: 'Khmer OS Muol', name: 'Khmer OS Muol', cssValue: "'Khmer OS Muol', 'Moul', sans-serif", wordFontName: 'Khmer OS Muol', googleFontId: 'Moul' },
  { id: 'Battambang', name: 'បាត់ដំបង (Battambang)', cssValue: "'Battambang', 'Khmer OS Battambang', sans-serif", wordFontName: 'Khmer OS Battambang', googleFontId: 'Battambang' },
  { id: 'Moul', name: 'អក្សរមូល (Moul)', cssValue: "'Moul', 'Khmer OS Muol Light', sans-serif", wordFontName: 'Khmer OS Muol Light', googleFontId: 'Moul' },
  { id: 'Ang DaunTep', name: 'សន្លឹកសៀវភៅ (Ang DaunTep)', cssValue: "'Ang DaunTep', 'AngDaunTep', 'Khmer OS Ang DaunTep', sans-serif", wordFontName: 'Khmer OS Ang DaunTep', googleFontId: 'AngDaunTep' },
  { id: 'Content', name: 'មាតិកា (Content)', cssValue: "'Content', 'Khmer OS Content', sans-serif", wordFontName: 'Khmer OS Content', googleFontId: 'Content' },
  { id: 'Kantumruy Pro', name: 'កន្ទុយរុយ (Kantumruy Pro)', cssValue: "'Kantumruy Pro', sans-serif", wordFontName: 'Kantumruy Pro', googleFontId: 'Kantumruy Pro' },
  { id: 'Siemreap', name: 'សៀមរាប (Siemreap)', cssValue: "'Siemreap', sans-serif", wordFontName: 'Khmer OS Siemreap', googleFontId: 'Siemreap' },
  { id: 'Hanuman', name: 'ហនុមាន (Hanuman)', cssValue: "'Hanuman', serif", wordFontName: 'Khmer OS', googleFontId: 'Hanuman' },
  { id: 'Nokora', name: 'នគរ (Nokora)', cssValue: "'Nokora', serif", wordFontName: 'Khmer OS Bokor', googleFontId: 'Nokora' },
  { id: 'Odor Mean Chey', name: 'ឧត្តរមានជ័យ (Odor)', cssValue: "'Odor Mean Chey', sans-serif", wordFontName: 'Khmer OS Metal Chrieng', googleFontId: 'Odor Mean Chey' },
  { id: 'Preahvihear', name: 'ព្រះវិហារ (Preahvihear)', cssValue: "'Preahvihear', sans-serif", wordFontName: 'Khmer OS Freehand', googleFontId: 'Preahvihear' },
  { id: 'Koulen', name: 'កូលែន (Koulen)', cssValue: "'Koulen', sans-serif", wordFontName: 'Koulen', googleFontId: 'Koulen' },
  { id: 'Angkor', name: 'អង្គរ (Angkor)', cssValue: "'Angkor', display", wordFontName: 'Angkor', googleFontId: 'Angkor' },
  { id: 'Bokor', name: 'បូកគោ (Bokor)', cssValue: "'Bokor', display", wordFontName: 'Bokor', googleFontId: 'Bokor' },
  { id: 'Fasthand', name: 'ដៃរហ័ស (Fasthand)', cssValue: "'Fasthand', cursive", wordFontName: 'Fasthand', googleFontId: 'Fasthand' }
];

export const FONT_SIZES = [5, 6, 7, 8, 9, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20, 24];

export default function QuizPanel({ 
  cards, 
  onCardClick, 
  onAnswer, 
  onReset,
  activeCard,
  selectedStudent,
  chapters = [],
  activeRoomId = null,
  onSelectRoom,
  onCreateRoom,
  onDeleteRoom,
  onRenameRoom,
  onCreateChapter,
  onRenameChapter,
  onDeleteChapter,
  isDarkMode = false,
  onUpdateCards
}: QuizPanelProps) {
  const activeRoom = chapters.reduce<QuizRoom | null>((found, ch) => {
    if (found) return found;
    return ch.rooms?.find(r => r.id === activeRoomId) || null;
  }, null);

  const activeChapter = chapters.find(ch => ch.rooms?.some(r => r.id === activeRoomId));

  const [timeLeft, setTimeLeft] = useState(25);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  
  // Teacher QA editing states
  const [isEditQuestionsModalOpen, setIsEditQuestionsModalOpen] = useState(false);
  const [localEditCards, setLocalEditCards] = useState<QuizCard[]>([]);
  const [selectedEditIndex, setSelectedEditIndex] = useState<number>(0);

  // Sync copy of cards when edit modal is opened
  useEffect(() => {
    if (isEditQuestionsModalOpen) {
      setLocalEditCards(JSON.parse(JSON.stringify(cards)));
      setSelectedEditIndex(0);
    }
  }, [isEditQuestionsModalOpen, cards]);

  const [viewMode, setViewMode] = useState<'quiz' | 'manage'>('quiz');
  
  const handleDeleteLocalQuestion = (index: number) => {
    const updated = localEditCards.filter((_, idx) => idx !== index);
    const reindexed = updated.map((card, i) => ({
      ...card,
      number: i + 1
    }));
    setLocalEditCards(reindexed);
    if (selectedEditIndex >= reindexed.length) {
      setSelectedEditIndex(Math.max(0, reindexed.length - 1));
    }
  };

  const handleAddLocalQuestion = () => {
    const newQuestionCard: QuizCard = {
      id: `c-added-${Date.now()}-${Math.random()}`,
      number: localEditCards.length + 1,
      question: {
        id: `q-added-${Date.now()}-${Math.random()}`,
        text: 'សំណួរថ្មី...',
        options: ['ចម្លើយទី ១', 'ចម្លើយទី ២', 'ចម្លើយទី ៣', 'ចម្លើយទី ៤'],
        correctIndex: 0
      },
      isRevealed: false,
      status: 'idle'
    };
    const updated = [...localEditCards, newQuestionCard];
    setLocalEditCards(updated);
    setSelectedEditIndex(updated.length - 1);
  };

  const handleUpdateLocalQuestionText = (text: string) => {
    setLocalEditCards(prev => prev.map((card, idx) => {
      if (idx === selectedEditIndex) {
        return {
          ...card,
          question: {
            ...card.question,
            text
          }
        };
      }
      return card;
    }));
  };

  const handleUpdateLocalOption = (optIndex: number, value: string) => {
    setLocalEditCards(prev => prev.map((card, idx) => {
      if (idx === selectedEditIndex) {
        const newOptions = [...card.question.options];
        newOptions[optIndex] = value;
        return {
          ...card,
          question: {
            ...card.question,
            options: newOptions
          }
        };
      }
      return card;
    }));
  };

  const handleUpdateLocalCorrectIndex = (correctIndex: number) => {
    setLocalEditCards(prev => prev.map((card, idx) => {
      if (idx === selectedEditIndex) {
        return {
          ...card,
          question: {
            ...card.question,
            correctIndex
          }
        };
      }
      return card;
    }));
  };

  const [savedScrollTop, setSavedScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [tempChapterName, setTempChapterName] = useState('');

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [tempRoomName, setTempRoomName] = useState('');

  const [creatingRoomForChapterId, setCreatingRoomForChapterId] = useState<string | null>(null);
  const [newRoomNameMap, setNewRoomNameMap] = useState<Record<string, string>>({});

  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [openChapterDropdownId, setOpenChapterDropdownId] = useState<string | null>(null);

  // Export & Print state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [headerFont, setHeaderFont] = useState('Khmer OS Muol Light');
  const [bodyFont, setBodyFont] = useState('Battambang');
  const [headerFontSize, setHeaderFontSize] = useState(10.5);
  const [bodyFontSize, setBodyFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<string>('A4');
  const [marginTop, setMarginTop] = useState<number>(0.5);
  const [marginBottom, setMarginBottom] = useState<number>(0.5);
  const [marginLeft, setMarginLeft] = useState<number>(0.5);
  const [marginRight, setMarginRight] = useState<number>(0.5);
  const [marginUnit, setMarginUnit] = useState<string>('in');
  const [headerLayout, setHeaderLayout] = useState<string>('5-1-5');
  const [customLeftSpan, setCustomLeftSpan] = useState<number>(5);
  const [customCenterSpan, setCustomCenterSpan] = useState<number>(2);
  const [customRightSpan, setCustomRightSpan] = useState<number>(5);
  const [examCenter, setExamCenter] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [subjectName, setSubjectName] = useState('មេរៀនទី១');
  const [deskNumber, setDeskNumber] = useState('');
  
  const [examName, setExamName] = useState('');
  const [gradeNumber, setGradeNumber] = useState('');
  const [examSession, setExamSession] = useState('');
  const [durationTime, setDurationTime] = useState('');
  const [totalScore, setTotalScore] = useState('');
  const [studentName, setStudentName] = useState('');
  
  const [logoText1, setLogoText1] = useState('សាលារៀនសុវណ្ណភូមិ');
  const [logoText2, setLogoText2] = useState('ទីតាំងផ្សារដីហុយ');
  
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('teacher_custom_logo') || null;
    }
    return null;
  });
  
  const [optionsLayout, setOptionsLayout] = useState<'inline' | 'stacked'>('inline');
  const [optionStyle, setOptionStyle] = useState<'khmer' | 'latin'>('khmer');
  const [highlightKey, setHighlightKey] = useState(false);
  const [imgSrc, setImgSrc] = useState('/Sovannphomi.png');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (activeRoom) {
      setSubjectName(activeRoom.name);
    } else {
      setSubjectName('...................................');
    }
  }, [activeRoomId, activeRoom]);

  const SovannaphumiLogoSVG = () => (
    <svg viewBox="0 0 120 120" className="w-16 h-16 pointer-events-none mx-auto" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#1e40af" stroke="#f59e0b" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="46" fill="#dc2626" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="34" fill="#0284c7" stroke="#f59e0b" strokeWidth="1" />
      <path d="M 45,55 L 60,40 L 75,55 L 75,70 C 75,75 60,82 60,82 C 60,82 45,75 45,70 Z" fill="#eab308" stroke="#ffffff" strokeWidth="1" />
      <path d="M 48,58 C 52,56 58,56 60,60 C 62,56 68,56 72,58 M 48,64 C 52,62 58,62 60,66 C 62,62 68,62 72,64" stroke="#101827" strokeWidth="1" fill="none" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,1.5" />
    </svg>
  );

  const getOptionPrefix = (index: number) => {
    if (optionStyle === 'khmer') {
      const khmerPrefixes = ['ក', 'ខ', 'គ', 'ឃ', 'ង'];
      return khmerPrefixes[index] || String.fromCharCode(65 + index);
    }
    return String.fromCharCode(65 + index);
  };

  const triggerPrint = () => {
    window.print();
  };

  const getWordPageSize = (size: string) => {
    switch (size) {
      case 'A3': return 'size: 11.69in 16.54in;';
      case 'B4': return 'size: 9.84in 13.90in;';
      case 'B5': return 'size: 6.93in 9.84in;';
      case 'Letter': return 'size: 8.50in 11.00in;';
      case 'A4':
      default:
        return 'size: 8.27in 11.69in;';
    }
  };

  const generateDocHtml = (selectedHeaderFontObj: any, selectedBodyFontObj: any, questionCards: any[]) => {
    let questionsHtml = '';
    questionCards.forEach((card, qIdx) => {
      let optionsHtml = '';
      if (optionsLayout === 'inline') {
        optionsHtml = `
          <table class="options-table">
            <tr>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 0 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(0)}. ${renderFormulaToHtml(card.question.options[0] || '')}
              </td>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 1 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(1)}. ${renderFormulaToHtml(card.question.options[1] || '')}
              </td>
            </tr>
            <tr>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 2 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(2)}. ${renderFormulaToHtml(card.question.options[2] || '')}
              </td>
              <td class="option-cell ${highlightKey && card.question.correctIndex === 3 ? 'correct-highlight' : ''}">
                ${getOptionPrefix(3)}. ${renderFormulaToHtml(card.question.options[3] || '')}
              </td>
            </tr>
          </table>
        `;
      } else {
        optionsHtml = `
          <table class="options-table">
            ${card.question.options.map((opt: string, oIdx: number) => `
              <tr>
                <td class="option-cell ${highlightKey && card.question.correctIndex === oIdx ? 'correct-highlight' : ''}" style="width: 100%;">
                  ${getOptionPrefix(oIdx)}. ${renderFormulaToHtml(opt)}
                </td>
              </tr>
            `).join('')}
          </table>
        `;
      }
      
      questionsHtml += `
        <div class="question-block">
          <div class="question-text font-bold">សំណួរទី ${qIdx + 1}៖ ${renderFormulaToHtml(card.question.text)}</div>
          ${optionsHtml}
        </div>
      `;
    });

    const headerGoogleFont = selectedHeaderFontObj.googleFontId || selectedHeaderFontObj.id;
    const bodyGoogleFont = selectedBodyFontObj.googleFontId || selectedBodyFontObj.id;

    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>វិញ្ញាសាប្រឡង</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=${headerGoogleFont.replace(/ /g, '+')}&family=${bodyGoogleFont.replace(/ /g, '+')}&display=swap');
        
        @page Section1 {
          ${getWordPageSize(pageSize)}
          margin: ${marginTop}${marginUnit} ${marginRight}${marginUnit} ${marginBottom}${marginUnit} ${marginLeft}${marginUnit};
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        p.MsoFooter, li.MsoFooter, div.MsoFooter {
          margin: 0in;
          margin-bottom: .0001pt;
          mso-pagination: widow-orphan;
          font-size: 10.0pt;
          font-family: ${selectedBodyFontObj.cssValue};
          text-align: center;
          color: #4b5563;
        }
        table#hrdftrtbl {
          display: none;
        }
        
        body {
          font-family: ${selectedBodyFontObj.cssValue};
          line-height: 1.5;
          padding: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .header-cell {
          font-family: ${selectedHeaderFontObj.cssValue};
          font-size: ${headerFontSize}pt;
          vertical-align: top;
          padding: 4px;
        }
        .header-right-cell {
          font-family: ${selectedHeaderFontObj.cssValue};
          font-size: ${headerFontSize}pt;
          vertical-align: top;
          padding: 4px;
        }
        .center-text {
          text-align: center;
        }
        .bold-text {
          font-weight: bold;
        }
        .school-title {
          font-family: ${selectedHeaderFontObj.cssValue};
          font-weight: bold;
          font-size: ${headerFontSize}pt;
          margin-top: 4px;
        }
        .divider {
          border-bottom: 3px double #000000;
          margin-top: 10px;
          margin-bottom: 20px;
          height: 1px;
        }
        .exam-title-container {
          text-align: center;
          margin-bottom: 20px;
          font-family: ${selectedBodyFontObj.cssValue};
        }
        .exam-title {
          font-family: ${selectedBodyFontObj.cssValue};
          font-weight: bold;
          font-size: ${bodyFontSize + 2}pt;
          text-decoration: underline;
        }
        .question-block {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .question-text {
          font-family: ${selectedBodyFontObj.cssValue};
          font-weight: bold;
          margin-bottom: 6px;
          font-size: ${bodyFontSize}pt;
        }
        .options-table {
          width: 100%;
          border-collapse: collapse;
          margin-left: 15px;
        }
        .option-cell {
          font-family: ${selectedBodyFontObj.cssValue};
          padding: 3px;
          vertical-align: top;
          font-size: ${bodyFontSize}pt;
        }
        .correct-highlight {
          color: #059669;
          font-weight: bold;
          background-color: #ecfdf5;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <table class="header-table">
          <tr>
            <td class="header-cell" style="width: 30%;">
              <div>មណ្ឌលប្រឡង៖ <span class="bold-text">${examCenter || '.....................................................'}</span></div>
              <div style="margin-top: 6px;">លេខបន្ទប់៖ <span class="bold-text">${roomNumber || '..................'}</span></div>
              <div style="margin-top: 6px;">វិញ្ញាសា៖ <span class="bold-text">${subjectName || '.....................................'}</span></div>
              <div style="margin-top: 6px;">លេខតុ៖ <span class="bold-text">${deskNumber || '..................'}</span></div>
            </td>
            <td class="header-cell center-text" style="width: 32%;">
              <div style="height: 60px; text-align: center;">
                ${customLogo ? `
                  <img src="${customLogo}" width="45" height="45" style="object-fit: contain; max-height: 45px; max-width: 100px; display: inline-block;" />
                ` : `
                  <div style="display: inline-block; width: 45px; height: 45px; border-radius: 50%; border: 3px solid #1e40af; background-color: #0284c7; color: white; text-align: center; line-height: 40px; font-weight: bold; font-size: 8pt;">
                    SPS
                  </div>
                `}
              </div>
              <div class="school-title">${logoText1}</div>
              <div style="font-size: 9pt; margin-top: 2px;">${logoText2}</div>
            </td>
            <td class="header-right-cell" style="width: 38%; text-align: left; padding-left: 10px;">
              <div>ប្រឡង៖ <span class="bold-text">${examName || '..................'}</span> &nbsp;&nbsp;&nbsp; ថ្នាក់ទី៖ <span class="bold-text">${gradeNumber || '...............'}</span></div>
              <div style="margin-top: 6px;">ឈ្មោះ៖ <span class="bold-text">${studentName || '.....................................'}</span></div>
              <div style="margin-top: 6px;">សម័យប្រឡង៖ <span class="bold-text">${examSession || '......../......../........'}</span></div>
              <div style="margin-top: 6px;">រយៈពេល៖ <span class="bold-text">${getDurationDisplay(durationTime) || '................ នាទី'}</span> <span style="font-size: 9pt;">(${getScoreDisplay(totalScore) || '...... ពិន្ទុ'})</span></div>
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="exam-title-container">
          <div class="exam-title">សន្លឹកកិច្ចការវិញ្ញាសា</div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 5px; color: #1e293b;">
            សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់
          </div>
          <div style="font-size: 7.5pt; color: #7f1d1d; margin-top: 6px; font-weight: normal; font-style: italic;">
            (បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ។)
          </div>
        </div>
  
        <div class="questions-container">
          ${questionsHtml}
        </div>

        <!-- MSO Footers for MS Word exports -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0" style="display:none;">
          <tr>
            <td>
              <div style="mso-element:footer" id="f1">
                <p class="MsoFooter">
                  <span style="mso-field-code:'PAGE'"></span>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
  };

  const exportToWord = async () => {
    const selectedHeaderFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0]) };
    const selectedBodyFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0]) };
    selectedHeaderFontObj.name = selectedHeaderFontObj.wordFontName || selectedHeaderFontObj.name;
    selectedBodyFontObj.name = selectedBodyFontObj.wordFontName || selectedBodyFontObj.name;
    const questionCards = cards.filter(c => c.question) as (QuizCard & { question: Question })[];

    // Fetch logo as ArrayBuffer if available for Embedding in Docx
    const imagePath = customLogo || imgSrc;
    let logoImageRun: any = null;
    if (imagePath && typeof imagePath === 'string') {
      try {
        const response = await fetch(imagePath);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          let imageType: "png" | "jpg" | "gif" | "bmp" = "png";
          if (imagePath.toLowerCase().endsWith(".jpg") || imagePath.toLowerCase().endsWith(".jpeg")) {
            imageType = "jpg";
          } else if (imagePath.toLowerCase().endsWith(".gif")) {
            imageType = "gif";
          } else if (imagePath.toLowerCase().endsWith(".bmp")) {
            imageType = "bmp";
          }
          logoImageRun = new ImageRun({
            data: buffer,
            type: imageType,
            transformation: {
              width: 50,
              height: 50,
            }
          });
        }
      } catch (e) {
        console.warn("Failed to load logo for docx export:", e);
      }
    }

    // Helper: Twips conversions (1 inch = 1440 dxa, 1 cm = 567 dxa)
    const getDocxMargin = (val: number, unit: string) => {
      if (unit === 'in') {
        return val * 1440;
      }
      return val * 567; // cm
    };

    const getDocxPageDimensions = (size: string) => {
      switch (size) {
        case 'A3': return { width: 16834, height: 23818 };
        case 'B4': return { width: 14170, height: 20016 };
        case 'B5': return { width: 9979, height: 14170 };
        case 'Letter': return { width: 12240, height: 15840 };
        case 'A4':
        default:
          return { width: 11906, height: 16838 };
      }
    };

    // Helper: Parse and convert LaTeX, Math formulas, Sub/Superscripts on-the-fly to beautiful edit-ready Docx TextRuns
    const convertHtmlToTextRuns = (
      text: string, 
      fontName: string, 
      fontSizePt: number, 
      bold: boolean = false, 
      italic: boolean = false, 
      fontColor?: string,
      isSub: boolean = false,
      isSup: boolean = false
    ): TextRun[] => {
      if (!text) return [];

      let processed = preprocessText(text);

      // Normalize ^{...} to <sup>...</sup>
      processed = processed.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
      // Normalize _{...} to <sub>...</sub>
      processed = processed.replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");

      // Normalize simple ^... to <sup>...</sup>
      processed = processed.replace(/\^([0-9a-zA-Z+\-≈=#*]+)/g, "<sup>$1</sup>");
      // Normalize simple _... to <sub>...</sub>
      processed = processed.replace(/_([0-9a-zA-Z\x7f-\xff]+)/g, "<sub>$1</sub>");

      const runs: TextRun[] = [];
      let index = 0;

      while (index < processed.length) {
        const subIdx = processed.indexOf("<sub>", index);
        const supIdx = processed.indexOf("<sup>", index);
        const fracIdx = processed.indexOf("\\frac", index);
        const sqrtIdx = processed.indexOf("\\sqrt", index);

        const candidates = [
          { type: "sub", idx: subIdx },
          { type: "sup", idx: supIdx },
          { type: "frac", idx: fracIdx },
          { type: "sqrt", idx: sqrtIdx }
        ].filter(c => c.idx !== -1);

        if (candidates.length === 0) {
          const remainingText = processed.substring(index);
          runs.push(new TextRun({
            text: remainingText,
            font: fontName,
            size: fontSizePt * 2,
            bold,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
          break;
        }

        candidates.sort((a, b) => a.idx - b.idx);
        const nextMatch = candidates[0];

        if (nextMatch.idx > index) {
          const textBefore = processed.substring(index, nextMatch.idx);
          runs.push(new TextRun({
            text: textBefore,
            font: fontName,
            size: fontSizePt * 2,
            bold,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
        }

        index = nextMatch.idx;

        if (nextMatch.type === "sub" || nextMatch.type === "sup") {
          const isSubscript = nextMatch.type === "sub";
          const startTag = isSubscript ? "<sub>" : "<sup>";
          const endTag = isSubscript ? "</sub>" : "</sup>";
          const startIdx = index + startTag.length;
          const endIdx = processed.indexOf(endTag, startIdx);

          if (endIdx === -1) {
            runs.push(new TextRun({
              text: startTag,
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
            index = startIdx;
          } else {
            const innerText = processed.substring(startIdx, endIdx);
            const innerRuns = convertHtmlToTextRuns(
              innerText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub || isSubscript,
              isSup || !isSubscript
            );
            runs.push(...innerRuns);
            index = endIdx + endTag.length;
          }
        } else if (nextMatch.type === "sqrt") {
          let innerText = "";
          let nextCharIdx = index + 5; // skip "\sqrt"
          while (nextCharIdx < processed.length && /\s/.test(processed[nextCharIdx])) {
            nextCharIdx++;
          }
          if (processed[nextCharIdx] === "{") {
            let braceCount = 1;
            let scanIdx = nextCharIdx + 1;
            while (scanIdx < processed.length && braceCount > 0) {
              if (processed[scanIdx] === "{") braceCount++;
              else if (processed[scanIdx] === "}") braceCount--;
              scanIdx++;
            }
            if (braceCount === 0) {
              innerText = processed.substring(nextCharIdx + 1, scanIdx - 1);
              index = scanIdx;
            } else {
              innerText = processed.substring(nextCharIdx + 1);
              index = processed.length;
            }
          } else {
            innerText = processed[nextCharIdx] || "";
            index = nextCharIdx + 1;
          }

          runs.push(new TextRun({
            text: "√(",
            font: fontName,
            size: fontSizePt * 2,
            bold: true,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));

          const innerRuns = convertHtmlToTextRuns(
            innerText,
            fontName,
            fontSizePt,
            bold,
            italic,
            fontColor,
            isSub,
            isSup
          );
          runs.push(...innerRuns);

          runs.push(new TextRun({
            text: ")",
            font: fontName,
            size: fontSizePt * 2,
            bold: true,
            italics: italic,
            color: fontColor,
            subScript: isSub,
            superScript: isSup,
          }));
        } else if (nextMatch.type === "frac") {
          let numText = "";
          let denText = "";
          let scanIdx = index + 5; // skip "\frac"
          
          const parseCurlyBlock = () => {
            while (scanIdx < processed.length && /\s/.test(processed[scanIdx])) {
              scanIdx++;
            }
            if (processed[scanIdx] === "{") {
              let braceCount = 1;
              let startBlock = scanIdx + 1;
              scanIdx++;
              while (scanIdx < processed.length && braceCount > 0) {
                if (processed[scanIdx] === "{") braceCount++;
                else if (processed[scanIdx] === "}") braceCount--;
                scanIdx++;
              }
              if (braceCount === 0) {
                return processed.substring(startBlock, scanIdx - 1);
              }
            }
            return "";
          };

          numText = parseCurlyBlock();
          denText = parseCurlyBlock();

          if (numText || denText) {
            index = scanIdx;
            
            runs.push(new TextRun({
              text: "(",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));

            const numRuns = convertHtmlToTextRuns(
              numText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub,
              isSup
            );
            runs.push(...numRuns);

            runs.push(new TextRun({
              text: " / ",
              font: fontName,
              size: fontSizePt * 2,
              bold: true,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));

            const denRuns = convertHtmlToTextRuns(
              denText,
              fontName,
              fontSizePt,
              bold,
              italic,
              fontColor,
              isSub,
              isSup
            );
            runs.push(...denRuns);

            runs.push(new TextRun({
              text: ")",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
          } else {
            runs.push(new TextRun({
              text: "\\frac",
              font: fontName,
              size: fontSizePt * 2,
              bold,
              italics: italic,
              color: fontColor,
              subScript: isSub,
              superScript: isSup,
            }));
            index = index + 5;
          }
        }
      }

      if (runs.length === 0) {
        runs.push(new TextRun({
          text: "",
          font: fontName,
          size: fontSizePt * 2,
        }));
      }

      return runs;
    };

    // Document Table Layout widths calculations (Summing up to 100%)
    const totalSpan = customLeftSpan + customCenterSpan + customRightSpan;
    
    let pctLeft = 38;
    let pctCenter = 15;
    let pctRight = 47;
    
    if (headerLayout === '5-1-5') {
      pctLeft = 44;
      pctCenter = 10;
      pctRight = 46;
    } else if (headerLayout === '5-2-5') {
      pctLeft = 38;
      pctCenter = 20;
      pctRight = 42;
    } else if (headerLayout === '4-4-4') {
      pctLeft = 33;
      pctCenter = 33;
      pctRight = 34;
    } else if (headerLayout === '4-2-6') {
      pctLeft = 33;
      pctCenter = 17;
      pctRight = 50;
    } else if (headerLayout === '5-1-6') {
      pctLeft = 38;
      pctCenter = 10;
      pctRight = 52;
    } else if (headerLayout === 'custom') {
      pctLeft = Math.round((customLeftSpan / totalSpan) * 100);
      pctCenter = Math.round((customCenterSpan / totalSpan) * 100);
      pctRight = 100 - pctLeft - pctCenter;
    }

    // Borderless Style Definition
    const borderNone = {
      style: BorderStyle.NONE,
      size: 0,
      color: "auto"
    };

    const tableBordersNone = {
      top: borderNone,
      bottom: borderNone,
      left: borderNone,
      right: borderNone,
      insideHorizontal: borderNone,
      insideVertical: borderNone,
    };

    // Header Blocks Child Definitions
    const leftCellChildren = [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "មណ្ឌលប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examCenter || ".....................................................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "លេខបន្ទប់៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: roomNumber || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "វិញ្ញាសា៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: subjectName || ".....................................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "លេខតុ៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: deskNumber || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      })
    ];

    const centerCellChildren: Paragraph[] = [];
    if (logoImageRun) {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [logoImageRun]
      }));
    } else {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "« LOGO »", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true })
        ]
      }));
    }
    
    centerCellChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: logoText1 || "", font: selectedHeaderFontObj.name, size: 18, bold: true })
      ]
    }));
    
    if (headerLayout !== '5-1-6') {
      centerCellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [
          new TextRun({ text: logoText2 || "", font: selectedHeaderFontObj.name, size: 16, bold: true })
        ]
      }));
    }

    const rightCellChildren = [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "ប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examName || "..................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 }),
          new TextRun({ text: "  ", font: selectedHeaderFontObj.name, size: headerFontSize * 2 }),
          new TextRun({ text: "ថ្នាក់ទី៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: gradeNumber || "...............", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "ឈ្មោះ៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: studentName || ".....................................", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "សម័យប្រឡង៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: examSession || "......../......../........", font: selectedHeaderFontObj.name, size: headerFontSize * 2 })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "រយៈពេល៖ ", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true }),
          new TextRun({ text: getDurationDisplay(durationTime) || "................ នាទី", font: selectedHeaderFontObj.name, size: headerFontSize * 2 }),
          new TextRun({ text: getScoreDisplay(totalScore) ? ` (${getScoreDisplay(totalScore)})` : " (...... ពិន្ទុ)", font: selectedHeaderFontObj.name, size: headerFontSize * 2, bold: true })
        ]
      })
    ];

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: pctLeft, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: leftCellChildren,
            }),
            new TableCell({
              width: { size: pctCenter, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: centerCellChildren,
            }),
            new TableCell({
              width: { size: pctRight, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              margins: { left: 200 },
              children: rightCellChildren,
            })
          ]
        })
      ]
    });

    const dividerPara = new Paragraph({
      spacing: { before: 120, after: 120 },
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 24,
          space: 1,
          color: "000000",
        }
      },
      children: []
    });

    const titleParas = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: "សន្លឹកកិច្ចការវិញ្ញាសា",
            font: selectedBodyFontObj.name,
            size: (bodyFontSize + 2) * 2,
            bold: true,
            underline: {},
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: "សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់",
            font: selectedBodyFontObj.name,
            size: 20,
            bold: true,
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 180 },
        children: [
          new TextRun({
            text: "(បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ।)",
            font: selectedBodyFontObj.name,
            size: 16,
            color: "7f1d1d",
            italics: true,
          })
        ]
      })
    ];

    const childrenElements: any[] = [
      headerTable,
      dividerPara,
      ...titleParas
    ];

    questionCards.forEach((card, qIdx) => {
      // Question block
      childrenElements.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          keepNext: true,
          children: [
            new TextRun({
              text: `សំណួរទី ${qIdx + 1}៖ `,
              font: selectedBodyFontObj.name,
              size: bodyFontSize * 2,
              bold: true,
            }),
            ...convertHtmlToTextRuns(card.question.text, selectedBodyFontObj.name, bodyFontSize)
          ]
        })
      );

      // Options block
      if (optionsLayout === 'inline') {
        const rows: TableRow[] = [];
        for (let i = 0; i < card.question.options.length; i += 2) {
          const opt1 = card.question.options[i];
          const opt2 = card.question.options[i + 1];

          const cells = [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: tableBordersNone,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: `${getOptionPrefix(i)}. `,
                      font: selectedBodyFontObj.name,
                      size: bodyFontSize * 2,
                      bold: true,
                    }),
                    ...convertHtmlToTextRuns(opt1, selectedBodyFontObj.name, bodyFontSize)
                  ]
                })
              ]
            })
          ];

          if (opt2 !== undefined) {
            cells.push(
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: tableBordersNone,
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: `${getOptionPrefix(i + 1)}. `,
                        font: selectedBodyFontObj.name,
                        size: bodyFontSize * 2,
                        bold: true,
                      }),
                      ...convertHtmlToTextRuns(opt2, selectedBodyFontObj.name, bodyFontSize)
                    ]
                  })
                ]
              })
            );
          }

          rows.push(new TableRow({ children: cells }));
        }

        childrenElements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBordersNone,
            margins: { left: 450 },
            rows,
          })
        );
      } else {
        card.question.options.forEach((opt: string, oIdx: number) => {
          childrenElements.push(
            new Paragraph({
              indent: { left: 450 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: `${getOptionPrefix(oIdx)}. `,
                  font: selectedBodyFontObj.name,
                  size: bodyFontSize * 2,
                  bold: true,
                }),
                ...convertHtmlToTextRuns(opt, selectedBodyFontObj.name, bodyFontSize)
              ]
            })
          );
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: getDocxPageDimensions(pageSize),
            margin: {
              top: getDocxMargin(marginTop, marginUnit),
              bottom: getDocxMargin(marginBottom, marginUnit),
              left: getDocxMargin(marginLeft, marginUnit),
              right: getDocxMargin(marginRight, marginUnit),
            }
          }
        },
        children: childrenElements,
      }]
    });

    try {
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `វិញ្ញាសា_${activeRoom ? activeRoom.name : 'ប្រឡង'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("docx Packer failed, falling back to legacy format: ", err);
      exportToHtmlDoc();
    }
  };

  const exportToHtmlDoc = () => {
    const selectedHeaderFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0]) };
    const selectedBodyFontObj = { ...(AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0]) };
    selectedHeaderFontObj.name = selectedHeaderFontObj.wordFontName || selectedHeaderFontObj.name;
    selectedBodyFontObj.name = selectedBodyFontObj.wordFontName || selectedBodyFontObj.name;
    const questionCards = cards.filter(c => c.question) as (QuizCard & { question: Question })[];
    const docHtml = generateDocHtml(selectedHeaderFontObj, selectedBodyFontObj, questionCards);

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `វិញ្ញាសា_${activeRoom ? activeRoom.name : 'ប្រឡង'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startRenameChapter = (chapter: QuizChapter) => {
    setEditingChapterId(chapter.id);
    setTempChapterName(chapter.name);
  };

  const saveChapterRenameLocal = (chapterId: string) => {
    if (tempChapterName.trim()) {
      onRenameChapter(chapterId, tempChapterName.trim());
    }
    setEditingChapterId(null);
  };

  const startRenameRoom = (room: QuizRoom) => {
    setEditingRoomId(room.id);
    setTempRoomName(room.name);
  };

  const saveRoomRenameLocal = (roomId: string) => {
    if (tempRoomName.trim()) {
      onRenameRoom(roomId, tempRoomName.trim());
    }
    setEditingRoomId(null);
  };

  const submitCreateChapter = () => {
    const trimmed = newChapterName.trim();
    const finalName = trimmed || `ជំពូកទី${chapters.length + 1}`;
    onCreateChapter(finalName);
    setNewChapterName('');
    setIsCreatingChapter(false);
  };

  const submitCreateRoomForChapter = (chapterId: string) => {
    const trimmed = (newRoomNameMap[chapterId] || '').trim();
    const chapter = chapters.find(ch => ch.id === chapterId);
    const roomsCount = chapter ? chapter.rooms.length : 0;
    const finalName = trimmed || `មេរៀនទី${roomsCount + 1}`;
    onCreateRoom(chapterId, finalName);
    setNewRoomNameMap(prev => ({ ...prev, [chapterId]: '' }));
    setCreatingRoomForChapterId(null);
  };

  const enterManageMode = () => {
    if (containerRef.current) {
      setSavedScrollTop(containerRef.current.scrollTop);
    }
    setViewMode('manage');
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 30);
  };

  const exitManageMode = () => {
    setViewMode('quiz');
  };

  useEffect(() => {
    if (viewMode === 'quiz' && containerRef.current && savedScrollTop > 0) {
      const el = containerRef.current;
      const timer = setTimeout(() => {
        el.scrollTop = savedScrollTop;
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [viewMode, savedScrollTop]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCard && activeCard.status === 'idle' && timeLeft > 0 && !showResult) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(-1); // Timeout
    }
    return () => clearInterval(timer);
  }, [activeCard, timeLeft, showResult]);

  useEffect(() => {
    if (activeCard?.question) {
      const originalOptions = activeCard.question.options;
      const originalCorrect = activeCard.question.correctIndex;
      
      // Map options to pair with correct status
      const items = originalOptions.map((opt, index) => ({
        opt,
        isCorrect: index === originalCorrect
      }));
      
      // Perform a clean Fisher-Yates shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      
      setShuffledOptions(items.map(item => item.opt));
      const newCorrectIdx = items.findIndex(item => item.isCorrect);
      setCorrectIndex(newCorrectIdx >= 0 ? newCorrectIdx : 0);
      
      setTimeLeft(25);
      setShowResult(null);
    }
  }, [activeCard]);

  const handleAnswer = (index: number) => {
    if (!activeCard?.question || showResult) return;

    const isCorrect = index === correctIndex;
    setShowResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
    }
  };

  const handleContinue = () => {
    if (showResult !== null) {
      onAnswer(showResult === 'correct');
    }
  };

  if (activeCard) {
    return (
      <div className="flex-1 flex flex-col p-8 bg-transparent relative transition-colors duration-300 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
                {activeCard.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">សំណួរដែលត្រូវឆ្លើយ</h3>
                <p className="text-xl font-bold text-slate-800 dark:text-white">សន្លឹកប័ណ្ណសំណួរ</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 mb-1 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`}>
                <Timer className="w-5 h-5 text-indigo-500" />
                <span className="text-base font-bold">រយៈពេលនៅសល់៖ <span className="text-xl font-black font-mono">{timeLeft}</span> វិនាទី</span>
              </div>
              <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 25) * 100}%` }}
                  className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Question Content */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white dark:bg-white border-2 border-slate-200 shadow-md rounded-[2rem] p-10 mb-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              <HelpCircle className="absolute -top-12 -right-12 w-48 h-48 text-indigo-500/5 rotate-12" />
              <span className="text-xs uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-4">សំណួរលេខ {activeCard.number}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 text-center leading-relaxed relative z-10 max-w-2xl break-words whitespace-normal word-break-break-word">
                <FormulaRenderer text={activeCard.question?.text || ''} />
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {shuffledOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult !== null}
                  className={`relative p-6 rounded-3xl border-3 text-left transition-all group overflow-hidden cursor-pointer ${
                    showResult === null 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm text-slate-800 dark:text-slate-100 hover:scale-[1.02]'
                      : idx === correctIndex
                        ? 'bg-green-500/15 border-green-500 shadow-xl shadow-green-500/10 text-green-950 dark:text-green-100 scale-[1.01]'
                        : showResult === 'wrong' && idx !== correctIndex
                          ? 'bg-red-500/5 border-red-500/20 opacity-50 text-slate-900 dark:text-slate-100'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-65 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10 w-full">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-all shrink-0 ${
                      idx === correctIndex && showResult !== null
                        ? 'bg-green-600 text-white'
                        : showResult !== null
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          : 'bg-indigo-600 text-white group-hover:bg-indigo-700 animate-in zoom-in-30 duration-200'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={`text-lg sm:text-xl font-bold tracking-tight leading-snug break-words whitespace-normal flex-1 ${
                      idx === correctIndex && showResult !== null
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      <FormulaRenderer text={option} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Result Feedback Overlay */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-3 p-6 rounded-3xl border-4 shadow-xl relative overflow-hidden ${
                  showResult === 'correct' 
                    ? 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400' 
                    : 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {showResult === 'correct' ? <CheckCircle className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
                    <h4 className="text-xl font-bold uppercase tracking-tight">
                      {showResult === 'correct' ? 'អស្ចារ្យណាស់! +៣ ពិន្ទុ' : 'គួរឲ្យសោកស្ដាយ! មិនទាន់ត្រឹមត្រូវទេ'}
                    </h4>
                  </div>
                  {showResult === 'wrong' && (
                    <div className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-500/5 p-3 rounded-xl mt-4 max-w-lg mb-4 border border-red-500/20">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        ចម្លើយត្រឹមត្រូវគឺ៖ <span className="font-bold underline text-slate-800 dark:text-white">{shuffledOptions[correctIndex]}</span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleContinue}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
                      showResult === 'correct' 
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                    }`}
                  >
                    បន្តទៅទៀត
                  </button>
                </div>
                {showResult === 'correct' && (
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="p-4 bg-green-500 text-white rounded-full hidden sm:block shadow-lg shadow-green-500/20"
                  >
                    <Trophy className="w-10 h-10 text-yellow-300" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const selectedHeaderFontObj = AVAILABLE_FONTS.find(f => f.id === headerFont) || AVAILABLE_FONTS[0];
  const selectedBodyFontObj = AVAILABLE_FONTS.find(f => f.id === bodyFont) || AVAILABLE_FONTS[0];

  const getLayoutClasses = (layout: string) => {
    switch (layout) {
      case '4-4-4':
        return {
          left: { className: 'col-span-4', style: {} },
          center: { className: 'col-span-4', style: {} },
          right: { className: 'col-span-4', style: {} }
        };
      case '4-2-6':
        return {
          left: { className: 'col-span-4', style: {} },
          center: { className: 'col-span-2', style: {} },
          right: { className: 'col-span-6', style: {} }
        };
      case '5-1-6':
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-6', style: {} }
        };
      case 'custom':
        return {
          left: { className: '', style: { gridColumn: `span ${customLeftSpan} / span ${customLeftSpan}` } },
          center: { className: '', style: { gridColumn: `span ${customCenterSpan} / span ${customCenterSpan}` } },
          right: { className: '', style: { gridColumn: `span ${customRightSpan} / span ${customRightSpan}` } }
        };
      case '5-1-5':
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-5', style: {} }
        };
      case '5-2-5':
        return {
          left: { className: 'col-span-12 md:col-span-5', style: {} },
          center: { className: 'col-span-12 md:col-span-2', style: {} },
          right: { className: 'col-span-12 md:col-span-5', style: {} }
        };
      default:
        // Set default to 5-1-5 layout
        return {
          left: { className: 'col-span-5', style: {} },
          center: { className: 'col-span-1', style: {} },
          right: { className: 'col-span-5', style: {} }
        };
    }
  };

  const getDurationDisplay = (val: string) => {
    if (!val || val.trim() === '') return '';
    if (val.includes('នាទី') || val.includes('min') || val.includes('mn')) return val;
    return `${val} នាទី`;
  };

  const getScoreDisplay = (val: string) => {
    if (!val || val.trim() === '') return '';
    if (val.includes('ពិន្ទុ') || val.includes('pt') || val.includes('pts')) return val;
    return `${val} ពិន្ទុ`;
  };

  const renderDotField = (value: string, fallbackDots: string) => {
    const actualVal = (value || '').trim() === '' ? fallbackDots : value;
    // Checks if the field is empty or contains purely dots/separators
    const isPureDots = /^[.\s៖\-/_​]*$/.test(actualVal) || actualVal === fallbackDots;

    if (isPureDots) {
      return (
        <span 
          style={{ 
            fontWeight: 300, 
            color: '#64748b', 
            letterSpacing: '1.2px', 
            fontSize: '8.5px',
            fontFamily: 'sans-serif'
          }} 
          className="print-dots inline-block border-b border-dotted border-slate-350 dark:border-slate-700 min-w-[20px] max-w-full"
        >
          {actualVal}
        </span>
      );
    }

    return (
      <span 
        style={{ 
          fontWeight: 'normal', 
          borderBottom: '1px dotted rgba(100, 116, 139, 0.4)' 
        }} 
        className="px-0.5 pb-[0.5px]"
      >
        {actualVal}
      </span>
    );
  };

  const headerInlineStyle = {
    fontFamily: selectedHeaderFontObj.cssValue,
    fontSize: `${headerFontSize}pt`
  };

  const rightColumnInlineStyle = {
    fontFamily: selectedHeaderFontObj.cssValue,
    fontSize: `${headerFontSize}pt`
  };

  const bodyInlineStyle = {
    fontFamily: selectedBodyFontObj.cssValue,
    fontSize: `${bodyFontSize}pt`
  };

  const totalCount = cards.length;
  const remainingCount = cards.filter(c => !c.isRevealed).length;
  const layoutWidths = getLayoutClasses(headerLayout);

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col px-8 pt-8 pb-[500px] bg-transparent overflow-y-auto custom-scrollbar transition-colors duration-300"
    >
      {viewMode === 'quiz' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">ក្ដារសំណួរ</h2>
                {cards.length > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-750 hover:bg-slate-50 rounded-lg transition-all font-bold text-[10px] shadow-sm active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-indigo-500" />
                    ធ្វើម្ដងទៀត
                  </button>
                )}
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                សូមជ្រើសរើសសន្លឹកប័ណ្ណមួយដើម្បីចាប់ផ្ដើម។ នៅសល់ {remainingCount}/{totalCount} សំណួរ។
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cards.filter(c => c.question).length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditQuestionsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>កែសម្រួលសំណួរ & ចម្លើយ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>នាំចេញវិញ្ញាសា (PDF/Word)</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={enterManageMode}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>រៀបចំជំពូក និងមេរៀន</span>
              </button>
            </div>
          </div>

          {/* Active Chapter & Lesson Header */}
          {activeChapter && activeRoom ? (
            <div className="mb-4 px-3 py-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between gap-3 shadow-none min-h-[44px] relative overflow-hidden">
              <div className="flex items-center gap-2.5 relative z-10 min-w-0">
                <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-400/20 shrink-0">
                  <Folder className="w-4 h-4 text-indigo-100" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide bg-indigo-100/50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md shrink-0">
                    {activeChapter.name}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-[10px] font-bold shrink-0">/</span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-indigo-200 truncate pr-1">
                    {activeRoom.name}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-10 select-none shrink-0">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 shadow-sm border border-slate-100 dark:border-slate-800/80 px-2 py-1 rounded-lg">
                  នៅសល់ {remainingCount}/{totalCount} សំណួរ
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 px-3 py-2 rounded-2xl bg-amber-50/65 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-3 shadow-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-amber-800 dark:text-amber-400">មិនទាន់ជ្រើសរើសមេរៀន</h3>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:block truncate">សូមចុចប៊ូតុង "រៀបចំជំពូក និងមេរៀន" ដើម្បីជ្រើសរើសមេរៀន។</p>
                </div>
              </div>
              <button
                type="button"
                onClick={enterManageMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] select-none shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>រៀបចំឥឡូវនេះ</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {!selectedStudent && cards.length > 0 && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="mb-4 flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 rounded-xl font-bold border border-yellow-200 dark:border-yellow-900 shadow-sm shadow-yellow-500/5 animate-pulse"
              >
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <span className="text-[11px]">សូមបង្វិលរកឈ្មោះសិស្សដំបូងសិន មុននឹងជ្រើសរើសសន្លឹកប័ណ្ណសំណួរ!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
            {cards.map((card) => (
              <motion.button
                key={card.id}
                whileHover={selectedStudent && !card.isRevealed ? { y: -5, scale: 1.05 } : {}}
                whileTap={selectedStudent && !card.isRevealed ? { scale: 0.95 } : {}}
                onClick={() => !card.isRevealed && selectedStudent && onCardClick(card)}
                disabled={card.isRevealed || !selectedStudent}
                className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center relative transition-all shadow-md overflow-hidden group border ${
                  card.isRevealed
                    ? card.status === 'correct'
                      ? 'bg-green-500 border-green-500 text-white shadow-green-500/20 cursor-default'
                      : 'bg-red-500 border-red-500 text-white shadow-red-500/20 cursor-default'
                    : selectedStudent
                      ? 'bg-slate-950 border-slate-900 hover:border-indigo-500 hover:ring-4 hover:ring-indigo-500/20 cursor-pointer text-white shadow-lg'
                      : 'bg-[#f8fafc] dark:bg-[#1e293b] text-slate-300 dark:text-slate-600 opacity-40 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800'
                }`}
              >
                {card.isRevealed ? (
                  card.status === 'correct' ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />
                ) : (
                  <span className="text-3xl font-black drop-shadow-sm">{card.number}</span>
                )}
                
                {!selectedStudent && !card.isRevealed && (
                  <div className="absolute inset-0 bg-transparent" />
                )}
              </motion.button>
            ))}
          </div>
          
          {cards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none max-w-sm">
                <Info className="w-16 h-16 text-indigo-300 dark:text-indigo-400 mx-auto mb-6" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">មិនទាន់មានសំណួរនៅឡើយទេ</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 italic leading-relaxed">លោកគ្រូ អ្នកគ្រូ សូមប្រើប្រាស់ឧបករណ៍ AI ដើម្បីបង្កើតសំណួរចេញពីអត្ថបទមេរៀន!</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-250">
          {/* Header of Manage Page */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-205 dark:border-slate-800 pb-4 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exitManageMode}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
              >
                ← ត្រឡប់ទៅក្ដារសំណួរ
              </button>
              <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-505" />
                <h3 className="text-lg font-black tracking-wide text-slate-800 dark:text-slate-205">
                  ការរៀបចំជំពូក និងមេរៀន
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add New Chapter Button */}
              {!isCreatingChapter ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingChapter(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>បង្កើតជំពូកថ្មី</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm animate-in fade-in-25 duration-100 shrink-0">
                  <input
                    type="text"
                    placeholder={`ជំពូកទី${chapters.length + 1}`}
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCreateChapter();
                      if (e.key === 'Escape') setIsCreatingChapter(false);
                    }}
                    autoFocus
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 w-36 sm:w-44"
                  />
                  <button
                    type="button"
                    onClick={submitCreateChapter}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    បង្កើត
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingChapter(false)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    បោះបង់
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/10 border border-indigo-200 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-xs font-bold flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
            <span>សូមជ្រើសរើសមេរៀន (បន្ទប់សំណួរ) ណាមួយខាងក្រោម រួចចុច "ត្រឡប់ទៅក្ដារសំណួរ" ដើម្បីសួរដេញដោលសិស្ស។</span>
          </div>

          {/* Active indicator */}
          {activeChapter && activeRoom && (
            <div className="mb-6 px-4 py-3.5 bg-green-500/5 dark:bg-green-400/5 border border-green-200/30 dark:border-green-900/30 rounded-2xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                <span>មេរៀនសកម្ម៖</span> 
                <span className="text-indigo-600 dark:text-indigo-400 font-black ml-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                  [{activeChapter.name}] ➔ {activeRoom.name}
                </span>
              </span>
              <button
                type="button"
                onClick={exitManageMode}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-black cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-xs"
              >
                ទៅកាន់ក្ដារសំណួរឥឡូវនេះ ➔
              </button>
            </div>
          )}

          {/* Chapters list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chapters.map((chapter) => {
              const hasRooms = chapter.rooms && chapter.rooms.length > 0;
              const activeRoomInThisChapter = chapter.rooms.find(r => r.id === activeRoomId);

              return (
                <div 
                  key={chapter.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm relative overflow-visible"
                >
                  {/* Chapter Title / Header */}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 select-none">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Folder className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                      {editingChapterId === chapter.id ? (
                        <div className="flex items-center gap-1.5 w-full bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-indigo-400" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempChapterName}
                            onChange={(e) => setTempChapterName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveChapterRenameLocal(chapter.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            autoFocus
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-50 font-bold w-full"
                          />
                          <button
                            type="button"
                            onClick={() => saveChapterRenameLocal(chapter.id)}
                            className="p-1 transform active:scale-95 text-green-600 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900 rounded-md transition-all cursor-pointer shrink-0"
                            title="រក្សាទុក"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingChapterId(null)}
                            className="p-1 transform active:scale-95 text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer shrink-0"
                            title="បោះបង់"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide truncate">
                            {chapter.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => startRenameChapter(chapter)}
                            className="p-1 px-2 flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-200 transition-all cursor-pointer shrink-0"
                            title="ប្ដូរឈ្មោះជំពូក"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>ប្ដូរឈ្មោះ</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions for Chapter */}
                    <div className="flex items-center gap-1 shrink-0">
                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteChapter(chapter.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                          title="លុបជំពូកនេះចោល"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lessons list inside Chapter as a DROPDOWN */}
                  <div className="p-4 flex flex-col gap-3 relative overflow-visible">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      បន្ទប់សំណួរមេរៀន៖
                    </span>

                    {hasRooms ? (
                      <div className="relative overflow-visible">
                        {/* Dropdown triggers */}
                        <button 
                          type="button"
                          onClick={() => setOpenChapterDropdownId(openChapterDropdownId === chapter.id ? null : chapter.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-xs font-bold select-none cursor-pointer ${
                            chapter.rooms.some(r => r.id === activeRoomId)
                              ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">
                              {activeRoomInThisChapter 
                                ? `មេរៀនសកម្ម៖ ${activeRoomInThisChapter.name}` 
                                : `ជ្រើសរើសមេរៀនក្នុងជំពូកនេះ (${chapter.rooms.length})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                              {chapter.rooms.some(r => r.id === activeRoomId) ? 'សកម្ម' : 'មិនទាន់រើស'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>

                        {/* Dropdown list popup */}
                        {openChapterDropdownId === chapter.id && (
                          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 max-h-[220px] overflow-y-auto custom-scrollbar">
                            <div className="p-1 flex flex-col gap-1">
                              {chapter.rooms.map((room) => {
                                const isActive = room.id === activeRoomId;
                                return (
                                  <div
                                    key={room.id}
                                    onClick={() => {
                                      if (editingRoomId !== room.id) {
                                        onSelectRoom(room.id);
                                        setOpenChapterDropdownId(null);
                                      }
                                    }}
                                    className={`group/room relative flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold select-none cursor-pointer ${
                                      editingRoomId === room.id
                                        ? 'bg-slate-50 dark:bg-slate-900 border border-indigo-400/80 shadow-inner'
                                        : isActive
                                          ? 'bg-indigo-600 text-white shadow-sm'
                                          : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-grow pr-3 truncate" onClick={(e) => {
                                      if (editingRoomId === room.id || isActive) {
                                        e.stopPropagation();
                                      }
                                    }}>
                                      <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isActive && editingRoomId !== room.id ? 'text-indigo-200' : 'text-slate-400'}`} />
                                      
                                      {editingRoomId === room.id ? (
                                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="text"
                                            value={tempRoomName}
                                            onChange={(e) => setTempRoomName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveRoomRenameLocal(room.id);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingRoomId(null);
                                              }
                                            }}
                                            autoFocus
                                            className="px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-50 font-bold w-full"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => saveRoomRenameLocal(room.id)}
                                            className="p-1 transform active:scale-95 text-green-600 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-905 rounded-md transition-all cursor-pointer shrink-0"
                                            title="រក្សាទុក"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingRoomId(null)}
                                            className="p-1 transform active:scale-95 text-slate-500 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-md transition-all cursor-pointer shrink-0"
                                            title="បោះបង់"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="truncate">{room.name}</span>
                                          <span className={`text-[10px] font-black shrink-0 ${isActive ? 'text-indigo-100 bg-indigo-700' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'} px-1.5 py-0.5 rounded-md`}>
                                            {room.cards ? room.cards.length : 0} សំណួរ
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions for Room (only if not renaming and always visible so user can easily rename) */}
                                    {editingRoomId !== room.id && (
                                      <div className="flex items-center gap-1 opacity-100 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startRenameRoom(room);
                                          }}
                                          className={`p-1.5 px-2 flex items-center justify-center gap-1 rounded-lg transition-all cursor-pointer font-bold text-[10px] ${
                                            isActive
                                              ? 'bg-indigo-700 text-indigo-50 hover:bg-indigo-800 hover:text-white border border-indigo-500'
                                              : 'bg-indigo-50/70 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-indigo-950/45 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
                                          }`}
                                          title="ប្ដូរឈ្មោះមេរៀន"
                                        >
                                          <Edit3 className="w-2.5 h-2.5 shrink-0" />
                                          <span>ប្ដូរឈ្មោះ</span>
                                        </button>
                                        
                                        {chapters.reduce((total, ch) => total + ch.rooms.length, 0) > 1 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteRoom(room.id);
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                              isActive
                                                ? 'hover:bg-rose-700 text-indigo-300 hover:text-white'
                                                : 'hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500'
                                            }`}
                                            title="លុបឈ្មោះមេរៀន"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-4 text-center border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl mb-1">
                        <p className="text-[11px] font-medium text-slate-400 italic">មិនទាន់មានមេរៀននៅឡើយទេ</p>
                      </div>
                    )}

                    {/* Add New Room inside Chapter Form/Button */}
                    <div className="mt-1 text-right">
                      {creatingRoomForChapterId === chapter.id ? (
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl animate-in slide-in-from-bottom-2 duration-150 relative z-10">
                          <input
                            type="text"
                            placeholder={`មេរៀនទី${(chapter.rooms || []).length + 1}`}
                            value={newRoomNameMap[chapter.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewRoomNameMap(prev => ({ ...prev, [chapter.id]: val }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitCreateRoomForChapter(chapter.id);
                              if (e.key === 'Escape') setCreatingRoomForChapterId(null);
                            }}
                            autoFocus
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 flex-1 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => submitCreateRoomForChapter(chapter.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                          >
                            បង្កើត
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatingRoomForChapterId(null)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                          >
                            បោះបង់
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCreatingRoomForChapterId(chapter.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-all font-black text-[11px] cursor-pointer active:scale-95 border border-dashed border-amber-300 dark:border-amber-800"
                        >
                          <Plus className="w-3 h-3" />
                          <span>បង្កើតបន្ទប់មេរៀនថ្មី</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Questions & Answers Modal */}
      <AnimatePresence>
        {isEditQuestionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">កែសម្រួលសំណួរ & ចម្លើយមេរៀន</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">លោកគ្រូ អ្នកគ្រូអាចកែប្រែសំណួរ ជម្រើសចម្លើយ និងជ្រើសរើសចម្លើយត្រឹមត្រូវមុនពេលនាំចេញ ឬសិស្សឆ្លើយ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditQuestionsModalOpen(false)}
                  className="p-1 px-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1 border border-transparent hover:border-slate-200 shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>បិទ</span>
                </button>
              </div>

              {/* Modal Content - Split layout */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
                {/* Left side list of questions */}
                <div className="md:col-span-4 border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col h-full min-h-0">
                  <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddLocalQuestion}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 border-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>បន្ថែមសំណួរថ្មី</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {localEditCards.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        onClick={() => setSelectedEditIndex(idx)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                          idx === selectedEditIndex
                            ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm font-bold'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 select-none ${
                            idx === selectedEditIndex
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-805 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold truncate pr-1">
                            {card.question?.text || '(គ្មានសំណួរ)'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocalQuestion(idx);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shrink-0 cursor-pointer border-none"
                          title="លុបសំណួរ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {localEditCards.length === 0 && (
                      <div className="text-center py-12 text-xs italic text-slate-400 dark:text-slate-500">
                        មិនទាន់មានសំណួរនៅឡើយទេ
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side editing form workspace */}
                <div className="md:col-span-8 flex flex-col h-full overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar min-h-0">
                  {localEditCards[selectedEditIndex] ? (
                    <div className="space-y-6">
                      {/* Form Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-655 text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                          កែសម្រួលសំណួរទី {selectedEditIndex + 1}
                        </span>
                      </div>

                      {/* Question text */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ខ្លឹមសារសំណួរ៖
                        </label>
                        <textarea
                          rows={3}
                          value={localEditCards[selectedEditIndex].question?.text || ''}
                          onChange={(e) => handleUpdateLocalQuestionText(e.target.value)}
                          placeholder="បញ្ចូលខ្លឹមសារសំណួរ..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                        />
                      </div>

                      {/* Option Inputs */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          ជម្រើសចម្លើយ និងជម្រើសចម្លើយត្រឹមត្រូវ៖
                        </label>
                        {Array.from({ length: 4 }).map((_, oIdx) => {
                          const prefix = getOptionPrefix(oIdx);
                          const isCorrect = localEditCards[selectedEditIndex].question?.correctIndex === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`flex items-center gap-3 p-2 rounded-2xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-600'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateLocalCorrectIndex(oIdx)}
                                className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-all select-none cursor-pointer border-none ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                                title="កំណត់ជាចម្លើយត្រឹមត្រូវ"
                              >
                                {prefix}
                              </button>

                              <input
                                type="text"
                                value={localEditCards[selectedEditIndex].question?.options[oIdx] || ''}
                                onChange={(e) => handleUpdateLocalOption(oIdx, e.target.value)}
                                placeholder={`បញ្ចូលជម្រើសចម្លើយ (${prefix})...`}
                                className="flex-1 bg-transparent border-none text-slate-805 text-slate-800 dark:text-slate-200 focus:outline-none text-sm font-semibold select-all"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateLocalCorrectIndex(oIdx)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer border-none ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200/50 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {isCorrect ? '✅ ត្រឹមត្រូវ' : 'កំណត់ត្រូវ'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
                      <HelpCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4 animate-bounce" />
                      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">មិនទាន់មានសំណួរជ្រើសរើសទេ</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">សូមចុច "+ បន្ថែមសំណួរថ្មី" នៅផ្នែកខាងឆ្វេងដើម្បីបង្កើតសំណួរថ្មី។</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold italic">
                  * ការកែប្រែនឹងត្រូវរក្សាទុកទៅក្នុងប្រព័ន្ធផ្ទុកទិន្នន័យ (Cloud/Local Cache) ស្វ័យប្រវត្តិ។
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditQuestionsModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCards?.(localEditCards);
                      setIsEditQuestionsModalOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all border-none"
                  >
                    <Check className="w-4 h-4" />
                    <span>រក្សាទុកទាំងអស់</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export & Print Preview Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">នាំចេញនិងបោះពុម្ពវិញ្ញាសាប្រឡង</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">បង្កើតសន្លឹកកិច្ចការជាទម្រង់ PDF សម្រាប់ព្រីន ឬ Word .doc សម្រាប់យកទៅកែសម្រួល</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1 px-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1 border border-transparent hover:border-slate-200 shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>បិទ</span>
                </button>
              </div>

              {/* Modal Content - Two splits */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-950/20">
                
                {/* Left controls panel */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Settings className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">ព័ត៌មានក្បាលសន្លឹក (Header Settings)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Left col fields */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">ផ្នែកខាងឆ្វេង</span>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">មណ្ឌលប្រឡង</label>
                          <input
                            type="text"
                            value={examCenter}
                            onChange={(e) => setExamCenter(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">លេខបន្ទប់</label>
                          <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">វិញ្ញាសា</label>
                          <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">លេខតុ</label>
                          <input
                            type="text"
                            value={deskNumber}
                            onChange={(e) => setDeskNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Right col fields */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">ផ្នែកខាងស្ដាំ</span>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">ប្រឡង</label>
                          <input
                            type="text"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">ថ្នាក់ទី</label>
                          <input
                            type="text"
                            value={gradeNumber}
                            onChange={(e) => setGradeNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">សម័យប្រឡង</label>
                          <input
                            type="text"
                            value={examSession}
                            onChange={(e) => setExamSession(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">រយៈពេល & ពិន្ទុ</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={durationTime}
                              onChange={(e) => setDurationTime(e.target.value)}
                              placeholder="រយៈពេល"
                              className="w-1/2 px-2 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                            <input
                              type="text"
                              value={totalScore}
                              onChange={(e) => setTotalScore(e.target.value)}
                              placeholder="ពិន្ទុ"
                              className="w-1/2 px-2 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">ឈ្មោះសិស្ស</label>
                          <input
                            type="text"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            placeholder="ឈ្មោះ..."
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo Config fields */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">ព័ត៌មានសាលារៀន & ឡូហ្គោ (School Info & Logo)</span>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">ឈ្មោះសាលា</label>
                          <input
                            type="text"
                            value={logoText1}
                            onChange={(e) => setLogoText1(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">សាខា/អក្សរជួរទីពីរ</label>
                          <input
                            type="text"
                            value={logoText2}
                            onChange={(e) => setLogoText2(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Logo File Selector and management block */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">រូបសញ្ញាសាលារៀន (School Logo PNG/JPG)</label>
                        <div className="flex items-center gap-3">
                          {customLogo ? (
                            <div className="relative w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center p-1 overflow-hidden group shrink-0">
                              <img src={customLogo} alt="Custom School Logo Preview" className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomLogo(null);
                                  localStorage.removeItem('teacher_custom_logo');
                                }}
                                className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                                title="លុបឡូហ្គោចេញ"
                              >
                                លុបចេញ
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-[9px] font-black uppercase shrink-0">
                              គ្មាន
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/gif"
                              id="custom-logo-uploader"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setCustomLogo(base64);
                                    localStorage.setItem('teacher_custom_logo', base64);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="custom-logo-uploader"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border border-indigo-150 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg cursor-pointer transition-all active:scale-95 uppercase tracking-wide"
                            >
                              📂 បញ្ចូល Logo (PNG)
                            </label>
                            <p className="text-[9px] text-slate-400 mt-1">ទោះបញ្ចូលក៏បាន អត់បញ្ចូលក៏បាន (ឡូហ្គោខុសៗគ្នាតាមគ្រូ)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layout & answer style configurations */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">ជម្រើសទម្រង់សន្លឹកកិច្ចការ</span>
                    </div>

                    <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {/* Option styles toggle */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold">ប្រភេទលេខចម្លើយ (Labels)៖</span>
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                          <button
                            type="button"
                            onClick={() => setOptionStyle('khmer')}
                            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                              optionStyle === 'khmer'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            ក, ខ, គ, ឃ
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptionStyle('latin')}
                            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                              optionStyle === 'latin'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            A, B, C, D
                          </button>
                        </div>
                      </div>

                      {/* Options breakdown toggle */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold">របៀបតម្រៀបចម្លើយ៖</span>
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                          <button
                            type="button"
                            onClick={() => setOptionsLayout('inline')}
                            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                              optionsLayout === 'inline'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            ជាជួរដេក (២ក្នុងមួយជួរ)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptionsLayout('stacked')}
                            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                              optionsLayout === 'stacked'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            ចុះជួរថ្មី (១ក្នុងមួយជួរ)
                          </button>
                        </div>
                      </div>

                      {/* Highlight key for teachers checklist */}
                      <label className="flex items-center gap-3.5 p-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer select-none transition-all w-full">
                        <input
                          type="checkbox"
                          checked={highlightKey}
                          onChange={(e) => setHighlightKey(e.target.checked)}
                          className="w-4.5 h-4.5 text-emerald-600 bg-white dark:bg-slate-900 border-slate-300 rounded focus:ring-emerald-500 focus:ring-1 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-black text-emerald-800 dark:text-emerald-400">បង្ហាញគំរូចម្លើយ (Answer Key)</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">គូសចំណាំពណ៌បៃតងលើចម្លើយត្រឹមត្រូវ (សម្រាប់លោកគ្រូ អ្នកគ្រូកែ)</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Page Size & Margins Settings Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">ការរៀបចំទំព័រ និងគែមក្រដាស (Page & Margins)</span>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Paper Size & Margins Settings Card */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="font-bold text-slate-700 dark:text-slate-300">ទំហំក្រដាស (Paper Size)៖</label>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="A4" className="bg-white text-black dark:bg-slate-900 dark:text-white">A4 (ធម្មតា)</option>
                            <option value="A3" className="bg-white text-black dark:bg-slate-900 dark:text-white">A3 (ធំ)</option>
                            <option value="B4" className="bg-white text-black dark:bg-slate-900 dark:text-white">B4 (មធ្យមធំ)</option>
                            <option value="B5" className="bg-white text-black dark:bg-slate-900 dark:text-white">B5 (តូចបង្គួរ)</option>
                            <option value="Letter" className="bg-white text-black dark:bg-slate-900 dark:text-white">Letter (កាត់តម្រឹម)</option>
                          </select>
                        </div>

                        {/* Margin Unit selector */}
                        <div className="space-y-2">
                          <label className="font-bold text-slate-700 dark:text-slate-300">ខ្នាតរង្វាស់ (Unit)៖</label>
                          <select
                            value={marginUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setMarginUnit(newUnit);
                              if (newUnit === 'in') {
                                setMarginTop(0.60);
                                setMarginBottom(0.60);
                                setMarginLeft(0.80);
                                setMarginRight(0.60);
                              } else {
                                setMarginTop(1.5);
                                setMarginBottom(1.5);
                                setMarginLeft(2.0);
                                setMarginRight(1.5);
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="cm" className="bg-white text-black dark:bg-slate-900 dark:text-white">សង់ទីម៉ែត្រ (cm)</option>
                            <option value="in" className="bg-white text-black dark:bg-slate-900 dark:text-white">អ៊ីញ (inches)</option>
                          </select>
                        </div>

                        {/* Header Layout type selector */}
                        <div className="space-y-2 col-span-2">
                          <label className="font-bold text-slate-700 dark:text-slate-300">ប្លង់ក្បាលសន្លឹកកិច្ចការ (Header Layout)៖</label>
                          <select
                            value={headerLayout}
                            onChange={(e) => setHeaderLayout(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="5-1-5" className="bg-white text-black dark:bg-slate-900 dark:text-white">ប្លង់ 5:1:5 (ឡូហ្គោតូច / សង្ខាងធំ - លំនាំដើម)</option>
                            <option value="5-2-5" className="bg-white text-black dark:bg-slate-900 dark:text-white">ប្លង់ 5:2:5 (ឡូហ្គោល្មម / សង្ខាងធំ)</option>
                            <option value="4-4-4" className="bg-white text-black dark:bg-slate-900 dark:text-white">ប្លង់ 4:4:4 (ឡូហ្គោធំ / ស្មើគ្នា)</option>
                            <option value="4-2-6" className="bg-white text-black dark:bg-slate-900 dark:text-white">ប្លង់ 4:2:6 (ឡូហ្គោតូច / ស្ដាំធំ)</option>
                            <option value="5-1-6" className="bg-white text-black dark:bg-slate-900 dark:text-white">ប្លង់ 5:1:6 (ឡូហ្គោតូចបំផុត / ស្ដាំធំ)</option>
                            <option value="custom" className="bg-white text-black dark:bg-slate-900 dark:text-white">កំណត់ដោយខ្លួនឯង (Custom Layout)</option>
                          </select>
                        </div>

                        {/* Custom layout configuration inputs displayed when "custom" is active */}
                        {headerLayout === 'custom' && (
                          <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 mt-1">
                            <span className="font-bold block text-[11px] text-slate-600 dark:text-slate-400">សមាមាត្រកម្រាស់ជួរឈរ (Grid Column Spans out of 12)៖</span>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-semibold text-center">ឆ្វេង (Left)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={customLeftSpan}
                                  onChange={(e) => setCustomLeftSpan(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                  className="w-full text-center px-1.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-550 mb-1 font-semibold text-center">ឡូហ្គោ (Center)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={customCenterSpan}
                                  onChange={(e) => setCustomCenterSpan(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                  className="w-full text-center px-1.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-550 mb-1 font-semibold text-center">ស្ដាំ (Right)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={customRightSpan}
                                  onChange={(e) => setCustomRightSpan(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                  className="w-full text-center px-1.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-400 dark:text-slate-550 text-center select-none pt-1">
                              *ផលបូកសរុបគួរតែស្មើនឹង ១២ (ឧទាហរណ៍ ៥ + ២ + ៥) ដើម្បីឱ្យស៊ីគ្នាល្អ
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Margins Inputs */}
                      <div className="space-y-2">
                        <span className="font-bold block text-slate-755 dark:text-slate-300">គម្លាតគែមក្រដាស (Margins)៖</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-550 text-center mb-1">ឆ្វេង (Left)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={marginLeft}
                              onChange={(e) => setMarginLeft(parseFloat(e.target.value) || 0)}
                              className="w-full text-center px-1 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-550 text-center mb-1">ស្ដាំ (Right)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={marginRight}
                              onChange={(e) => setMarginRight(parseFloat(e.target.value) || 0)}
                              className="w-full text-center px-1 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-550 text-center mb-1">លើ (Top)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={marginTop}
                              onChange={(e) => setMarginTop(parseFloat(e.target.value) || 0)}
                              className="w-full text-center px-1 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-550 text-center mb-1">ក្រោម (Bottom)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={marginBottom}
                              onChange={(e) => setMarginBottom(parseFloat(e.target.value) || 0)}
                              className="w-full text-center px-1 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Font & Font Size Configurations */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">កំណត់ពុម្ពអក្សរ និងទំហំ (Typography)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {/* Header Font and Size */}
                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300">ពុម្ពអក្សរក្បាលលើ (Header Font)៖</label>
                        <select
                          value={headerFont}
                          onChange={(e) => setHeaderFont(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.id} value={f.id} className="bg-white text-black dark:bg-slate-900 dark:text-white">{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300">ទំហំក្បាលលើ (Header Size)៖</label>
                        <select
                          value={headerFontSize}
                          onChange={(e) => setHeaderFontSize(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {FONT_SIZES.map(sz => (
                            <option key={sz} value={sz} className="bg-white text-black dark:bg-slate-900 dark:text-white">{sz} pt</option>
                          ))}
                        </select>
                      </div>

                      {/* Body Font and Size */}
                      <div className="space-y-2 col-span-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">ពុម្ពអក្សរវិញ្ញាសា (Exam Body Font)៖</label>
                        <select
                          value={bodyFont}
                          onChange={(e) => setBodyFont(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.id} value={f.id} className="bg-white text-black dark:bg-slate-900 dark:text-white">{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">ទំហំអក្សរវិញ្ញាសា (Body Size)៖</label>
                        <select
                          value={bodyFontSize}
                          onChange={(e) => setBodyFontSize(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {FONT_SIZES.map(sz => (
                            <option key={sz} value={sz} className="bg-white text-black dark:bg-slate-900 dark:text-white">{sz} pt</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Right page visual preview panel */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-black text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-slate-450" />
                      <span>ផ្ទាំងឯកសារមើលជាមុន (A4 Print Layout Preview)</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">សន្លឹកកិច្ចការនឹងព្រីនចេញទម្រង់ដូចគ្នាទាំងស្រុងនេះ</span>
                  </div>

                  {/* Standard A4 Styled Document Mock Card */}
                  <div 
                    style={{
                      paddingTop: `${marginTop}${marginUnit}`,
                      paddingBottom: `${marginBottom}${marginUnit}`,
                      paddingLeft: `${marginLeft}${marginUnit}`,
                      paddingRight: `${marginRight}${marginUnit}`,
                    }}
                    className="bg-white text-black rounded-2xl border border-slate-200 shadow-lg min-h-[500px] overflow-y-auto max-h-[60vh] custom-scrollbar text-[11px] sm:text-[12px] leading-relaxed select-text font-serif"
                  >
                    {/* Live preview header columns identical to actual layout */}
                    <div className="grid grid-cols-12 gap-1 pb-4">
                      {/* Left Block */}
                      <div className={`${layoutWidths.left.className} flex flex-col gap-1.5 text-left font-black text-slate-950 font-sans leading-snug`} style={{ ...headerInlineStyle, ...layoutWidths.left.style }}>
                        <div className="truncate">មណ្ឌលប្រឡង៖ {renderDotField(examCenter, '.....................................................')}</div>
                        <div className="truncate">លេខបន្ទប់៖ {renderDotField(roomNumber, '..................')}</div>
                        <div className="truncate">វិញ្ញាសា៖ {renderDotField(subjectName, '.....................................')}</div>
                        <div className="truncate">លេខតុ៖ {renderDotField(deskNumber, '..................')}</div>
                      </div>

                      {/* Middle Logo block */}
                      <div className={`${layoutWidths.center.className} flex flex-col items-center justify-start text-center`} style={{ ...headerInlineStyle, ...layoutWidths.center.style }}>
                        <div className="w-12 h-12 mb-1 flex items-center justify-center">
                          {customLogo ? (
                            <img
                              src={customLogo}
                              alt="Custom Logo"
                              className="w-12 h-12 object-contain pointer-events-none mx-auto"
                            />
                          ) : imageFailed ? (
                            <SovannaphumiLogoSVG />
                          ) : (
                            <img
                              src={imgSrc}
                              alt="Sovannphomi Logo"
                              className="w-12 h-12 object-contain pointer-events-none mx-auto"
                              onError={() => {
                                if (imgSrc === '/Sovannphomi.png') {
                                  setImgSrc('/sovannaphumi.png');
                                } else {
                                  setImageFailed(true);
                                }
                              }}
                            />
                          )}
                        </div>
                        <div className="font-black text-[9px] text-slate-900 leading-tight font-sans tracking-wide truncate max-w-full">{logoText1}</div>
                        {headerLayout !== '5-1-6' && (
                          <div className="text-[8px] font-semibold text-slate-800 leading-tight tracking-tight mt-0.5 truncate max-w-full">{logoText2}</div>
                        )}
                      </div>

                      {/* Right Block */}
                      <div className={`${layoutWidths.right.className} flex flex-col gap-1.5 text-left font-black text-slate-950 pl-2 leading-snug font-sans`} style={{ ...rightColumnInlineStyle, ...layoutWidths.right.style }}>
                        <div className="flex justify-between items-center w-full truncate">
                          <span>ប្រឡង៖ {renderDotField(examName, '..................')}</span>
                          <span>ថ្នាក់ទី៖ {renderDotField(gradeNumber, '...............')}</span>
                        </div>
                        <div className="truncate">ឈ្មោះ៖ {renderDotField(studentName, '.....................................')}</div>
                        <div className="truncate">សម័យប្រឡង៖ {renderDotField(examSession, '......../......../........')}</div>
                        <div className="truncate">រយៈពេល៖ {renderDotField(getDurationDisplay(durationTime), '................ នាទី')} <span className="font-black text-[9px]">({getScoreDisplay(totalScore) || '...... ពិន្ទុ'})</span></div>
                      </div>
                    </div>

                    {/* Separator exact border double black line */}
                    <div className="border-b-4 border-double border-black my-2"></div>

                    {/* Visual Preview Header title */}
                    <div className="text-center mb-4" style={bodyInlineStyle}>
                      <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] sm:text-xs font-sans">
                        សន្លឹកកិច្ចការវិញ្ញាសា
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] font-black text-slate-700 dark:text-slate-300 mt-1">
                        សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់
                      </div>
                      <div className="text-[8.5px] sm:text-[9px] text-red-700 dark:text-red-400 font-medium leading-relaxed text-center italic mt-1.5 block">
                        (បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ។)
                      </div>
                    </div>

                    {/* Preview list of questions */}
                    <div className="space-y-4 text-slate-900 mt-2 font-sans text-black" style={bodyInlineStyle}>
                      {cards.filter(c => c.question).map((card, qIdx) => (
                        <div key={card.id}>
                          <div className="font-bold text-slate-800 flex items-start gap-1">
                            <span className="shrink-0 font-black">សំណួរទី {qIdx + 1}៖</span>
                            <span><FormulaRenderer text={card.question?.text || ''} /></span>
                          </div>
                          
                          <div className={`mt-2 pl-4 grid gap-x-4 gap-y-1 ${optionsLayout === 'inline' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {card.question?.options.map((opt, oIdx) => {
                              const isCorrectIdx = oIdx === card.question?.correctIndex;
                              return (
                                <div 
                                  key={oIdx} 
                                  className={`flex items-start gap-1.5 py-0.5 px-1.5 rounded-md ${
                                    highlightKey && isCorrectIdx 
                                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/40' 
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span className="font-black shrink-0">{getOptionPrefix(oIdx)}.</span>
                                  <span><FormulaRenderer text={opt} /></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {cards.filter(c => c.question).length === 0 && (
                        <div className="text-center py-8 italic text-slate-400">
                          មិនទាន់បង្កើតសំណួរក្នុងមេរៀនសកម្មនេះនៅឡើយទេ
                        </div>
                      )}
                    </div>

                    {/* Helpful tip box for print output */}
                    {cards.filter(c => c.question).length > 0 && (
                      <div className="mt-6 p-3.5 bg-amber-50/70 dark:bg-amber-950/25 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-2 text-[10.5px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                        <span className="text-xs shrink-0 select-none">💡</span>
                        <div>
                          <strong className="font-bold text-amber-900 dark:text-amber-200">គន្លឹះបោះពុម្ពជា PDF៖</strong> ដើម្បីលុបអាសយដ្ឋានក្បាល/បាតគេហទំព័រ និងកាលបរិច្ឆេទដែលកម្មវិធីរុករក (Browser) បន្ថែមដោយស្វ័យប្រវត្តិចេញ សូមដោះធីក (Uncheck) <span className="font-extrabold underline decoration-amber-400">"Headers and footers"</span> នៅក្នុងផ្នែក More Settings នៃផ្ទាំង Print Window របស់លោកអ្នក។
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 pr-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>សំណួរសរុប៖ {cards.filter(c => c.question).length} សំណួរ</span>
                </span>
                
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    បោះបង់
                  </button>
                  
                  <button
                    type="button"
                    onClick={exportToWord}
                    disabled={cards.filter(c => c.question).length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយកជា Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportToHtmlDoc}
                    disabled={cards.filter(c => c.question).length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយកជា Word (HTML .doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerPrint}
                    disabled={cards.filter(c => c.question).length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>បោះពុម្ព ឬរក្សាទុកជា PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden layout rendered only at print-time */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize};
            margin: ${marginTop}${marginUnit} ${marginRight}${marginUnit} ${marginBottom}${marginUnit} ${marginLeft}${marginUnit} !important;
          }
        }
      `}</style>
      <div className="hidden print:block printable-sheet bg-white text-black p-0 font-sans w-full max-w-4xl mx-auto min-h-screen text-[12px] sm:text-[13px] leading-relaxed select-text">
        <div className="grid grid-cols-12 gap-2 w-full text-black">
          {/* Left Column */}
          <div className={`${layoutWidths.left.className} flex flex-col justify-start text-left font-black gap-2 mt-2`} style={{ ...headerInlineStyle, ...layoutWidths.left.style }}>
            <div>មណ្ឌលប្រឡង៖ {renderDotField(examCenter, '.....................................................')}</div>
            <div>លេខបន្ទប់៖ {renderDotField(roomNumber, '..................')}</div>
            <div>វិញ្ញាសា៖ {renderDotField(subjectName, '.....................................')}</div>
            <div>លេខតុ៖ {renderDotField(deskNumber, '..................')}</div>
          </div>
          
          {/* Middle Column (Logo and school titles) */}
          <div className={`${layoutWidths.center.className} flex flex-col items-center text-center justify-start`} style={{ ...headerInlineStyle, ...layoutWidths.center.style }}>
            <div className="mb-2">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="Custom Logo" 
                  className="w-16 h-16 object-contain pointer-events-none mx-auto"
                />
              ) : imageFailed ? (
                <SovannaphumiLogoSVG />
              ) : (
                <img 
                  src={imgSrc} 
                  alt="Sovannphomi Logo" 
                  className="w-16 h-16 object-contain pointer-events-none mx-auto"
                  onError={() => {
                    if (imgSrc === '/Sovannphomi.png') {
                      setImgSrc('/sovannaphumi.png');
                    } else {
                      setImageFailed(true);
                    }
                  }}
                />
              )}
            </div>
            <div className="font-black text-xs text-slate-900 leading-tight tracking-wide font-sans truncate max-w-full">{logoText1}</div>
            {headerLayout !== '5-1-6' && (
              <div className="text-[10px] font-medium text-slate-800 leading-tight mt-0.5 truncate max-w-full">{logoText2}</div>
            )}
          </div>
          
          {/* Right Column */}
          <div className={`${layoutWidths.right.className} flex flex-col justify-start text-left font-black gap-2 mt-[6px] pl-4 font-sans`} style={{ ...rightColumnInlineStyle, ...layoutWidths.right.style }}>
            <div className="flex justify-between items-center w-full">
              <span>ប្រឡង៖ {renderDotField(examName, '..................')}</span>
              <span>ថ្នាក់ទី៖ {renderDotField(gradeNumber, '...............')}</span>
            </div>
            <div className="truncate">ឈ្មោះ៖ {renderDotField(studentName, '.....................................')}</div>
            <div className="truncate">សម័យប្រឡង៖ {renderDotField(examSession, '......../......../........')}</div>
            <div className="truncate">រយៈពេល៖ {renderDotField(getDurationDisplay(durationTime), '................ នាទី')} <span className="font-medium">({getScoreDisplay(totalScore) || '...... ពិន្ទុ'})</span></div>
          </div>
        </div>
        
        {/* Horizontal separator */}
        <div className="border-b-4 border-double border-black my-4 w-full"></div>
        
        {/* Document Body */}
        <div className="text-center mb-6" style={bodyInlineStyle}>
          <div className="font-black text-[13px] tracking-wider uppercase text-slate-900">
            សន្លឹកកិច្ចការវិញ្ញាសា
          </div>
          <div className="text-[11.5px] font-black text-slate-800 mt-1.5">
            សេចក្តីណែនាំ៖ ចូរគូសរង្វង់លើចម្លើយត្រឹមត្រូវតែមួយគត់
          </div>
          <div className="text-[9.5px] text-red-800 font-medium leading-relaxed text-center italic mt-2 block">
            (បម្រាម៖ បេក្ខជនណាមើលសំណៅឯកសារ ចម្លងគ្នា មើលគ្នា មិនធ្វើតាមបទបញ្ជាផ្ទៃក្នុងអនុរក្សនឹងត្រូវបានពិន្ទុសូន្យ។)
          </div>
        </div>
        
        <div className="space-y-6 text-black mt-4" style={bodyInlineStyle}>
          {cards.filter(c => c.question).map((card, qIdx) => (
            <div key={card.id} className="break-inside-avoid">
              <div className="font-black text-slate-950 flex items-start gap-1">
                <span className="shrink-0">សំណួរទី {qIdx + 1}៖</span>
                <span className="leading-relaxed"><FormulaRenderer text={card.question?.text || ''} /></span>
              </div>
              
              <div className={`mt-3 pl-4 ${optionsLayout === 'inline' ? 'grid grid-cols-2 gap-x-6 gap-y-2' : 'space-y-2'}`}>
                {card.question?.options.map((opt, oIdx) => {
                  const isCorrectIdx = oIdx === card.question?.correctIndex;
                  return (
                    <div 
                      key={oIdx} 
                      className={`flex items-start gap-2.5 py-1 px-2 rounded-md ${
                        highlightKey && isCorrectIdx 
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/50' 
                          : ''
                      }`}
                    >
                      <span className="font-black shrink-0">{getOptionPrefix(oIdx)}.</span>
                      <span className="leading-relaxed"><FormulaRenderer text={opt} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
