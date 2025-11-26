export type Terrain = 'grass' | 'water' | 'sand' | 'mud';
export type StaticObject = 'none' | 'tree' | 'rock' | 'ruin';
export type Animal = 'fox' | 'monkey' | 'frog' | 'rabbit' | 'elephant' | 'panda';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
  row: number;
  column: string;
}

export interface Cell {
  terrain: Terrain;
  object: StaticObject;
}

export interface Clue {
  id: number;
  description: string;
  complexity: number;
}

export interface GameLevel {
  difficulty: Difficulty;
  grid: Cell[][];
  animals: Animal[];
  clues: Clue[];
  solution: Record<Animal, Position>;
}

export interface GameStats {
  timeSpent: number; // in seconds
  errors: number;
  hintsUsed: number;
}

export type AnimalPlacement = Record<Animal, Position | null>;