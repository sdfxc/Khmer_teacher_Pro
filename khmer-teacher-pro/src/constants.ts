/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentLevel, StudentClassName, Gender } from './types';

export const LEVELS: StudentLevel[] = ['ឆ្នើម', 'សកម្ម', 'អភិវឌ្ឍ', 'កំពុងរីកចម្រើន'];

export const CLASSES: StudentClassName[] = ['ថ្នាក់ទី៧ក', 'ថ្នាក់ទី៨ក', 'ថ្នាក់ទី៩ក'];

export const GENDERS: Gender[] = ['ប្រុស', 'ស្រី'];

export const LEVEL_COLORS: Record<StudentLevel, string> = {
  'ឆ្នើម': '#10b981', // emerald
  'សកម្ម': '#3b82f6', // blue
  'អភិវឌ្ឍ': '#f59e0b', // amber
  'កំពុងរីកចម្រើន': '#8b5cf6' // violet
};
