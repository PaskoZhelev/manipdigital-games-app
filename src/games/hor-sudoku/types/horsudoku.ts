export interface HorSudokuCell {
  // Clues (null if hidden)
  number: number | null; 
  color: string | null; 
  // The Answer Key
  solutionNumber: number; 
  solutionColor: string; 
}

export interface HorSudokuLevel {
  size: number;
  grid: HorSudokuCell[][];
}

export interface SavedHorSudokuProgress {
  // User's current state of the grid
  // We store what the user has entered. 
  // If a value is fixed in the level, it remains fixed here.
  userGrid: { 
    number: number | null; 
    color: string | null; 
    // Flags for validation feedback
    isError?: boolean;
    isLockedNumber?: boolean;
    isLockedColor?: boolean;
  }[][];
  
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
  lastPlayed: number; // Timestamp
}