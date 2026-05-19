/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'ប្រុស' | 'ស្រី';

export type StudentLevel = 'ឆ្នើម' | 'សកម្ម' | 'អភិវឌ្ឍ' | 'កំពុងរីកចម្រើន';

export type StudentClassName = 'ថ្នាក់ទី៧ក' | 'ថ្នាក់ទី៨ក' | 'ថ្នាក់ទី៩ក';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  level: StudentLevel;
  className: StudentClassName;
}

export interface Group {
  id: number;
  members: Student[];
}
