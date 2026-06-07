/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer';

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timer: number; // in seconds
  points: number;
  order: number;
  options?: string[]; // for multiple_choice
  correctAnswer: string; // for MC (index/text), TF ("true" or "false"), blank (regex/string), matching (serialized pairs), short answer
  matchingPairs?: { [key: string]: string }; // left to right matching
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  questionCount: number;
  createdAt: any;
  updatedAt: any;
}

export type GameStatus = 'lobby' | 'playing' | 'question_done' | 'leaderboard' | 'finished';

export type GameMode = 'classic' | 'speed' | 'survival' | 'physics_challenge' | 'math_battle';

export interface Game {
  id: string;
  gameCode: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  status: GameStatus;
  gameMode: GameMode;
  currentQuestionIndex: number;
  questionStatus: 'showing' | 'counting_down' | 'times_up';
  currentQuestionStartedAt?: any;
  createdAt: any;
}

export interface PlayerAnswer {
  questionIndex: number;
  answerSubmitted: string;
  isCorrect: boolean;
  scoreGained: number;
  answeredAtMs: number;
  timeTakenSec: number;
}

export interface Player {
  id: string;
  gameId: string;
  nickname: string;
  score: number;
  streak: number;
  correctCount: number;
  joinedAt: any;
  lastAnsweredQuestionIndex: number;
  lastAnswerCorrect?: boolean;
  answers: { [qIndex: string]: PlayerAnswer };
  avatarSeed?: string; // For Blooket-like blook avatar
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  conditionType: 'played' | 'hosted' | 'win' | 'streak_5' | 'perfect_score';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  xp: number;
  level: number;
  badges: string[];
  streak: number;
  gamesPlayedCount: number;
  gamesHostedCount: number;
  createdAt: any;
}
