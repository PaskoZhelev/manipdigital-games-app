export type CodeLength = 3 | 4;

export interface NeonClue {
  id: string;
  description: string;
}

export interface NeonLevel {
  id?: string;
  date?: string;
  mode: 'standard' | 'glitched';
  codeLength: CodeLength;
  solution: number[];
  clues: NeonClue[];
}

export interface SavedNeonProgress {
  // A grid of boolean flags: [positionIndex][numberValue 1-5]
  // true = eliminated (crossed out), false = possible
  eliminations: boolean[][]; 
  currentGuess: (number | null)[];
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
  usedClues: string[]; // IDs of crossed-out clues
  lastPlayed: number;
}