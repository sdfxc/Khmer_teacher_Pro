export interface Student {
  id: string;
  name: string;
  score: number;
  emoji?: string;
  gender?: 'ប្រុស' | 'ស្រី';
  status?: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ';
  classId?: string; // To keep track if queried overall
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuizCard {
  id: string;
  number: number;
  question?: Question;
  isRevealed: boolean;
  status: 'idle' | 'correct' | 'wrong';
}

export interface QuizRoom {
  id: string;
  name: string;
  cards: QuizCard[];
  pickedIds: string[];
  createdAt: number;
}

export interface QuizChapter {
  id: string;
  name: string;
  rooms: QuizRoom[];
  createdAt: number;
}

export interface ClassInfo {
  id: string;
  name: string;
}

export interface TeacherAccount {
  id: string;
  name: string;
  schoolName: string;
  subjects?: string;
  username: string;
  password?: string;
}
