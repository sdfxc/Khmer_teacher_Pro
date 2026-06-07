/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import TeacherDashboard from './components/TeacherDashboard';
import QuizCreator from './components/QuizCreator';
import GameHost from './components/GameHost';
import GamePlayer from './components/GamePlayer';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/register" element={<LandingPage />} />
          <Route path="/student" element={<LandingPage />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/creator" element={<QuizCreator />} />
          <Route path="/host/:id" element={<GameHost />} />
          <Route path="/game/:id" element={<GamePlayer />} />
          
          {/* Helper routes for joining games dynamically */}
          <Route path="/join/:gameCode" element={<LandingPage />} />
          <Route path="/join" element={<LandingPage />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
