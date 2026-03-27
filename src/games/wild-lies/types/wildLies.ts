export interface LevelSetup {
  difficultyId?: string;
  suspectsPlaying: string[];
  exactNumberOfCulprits: number;
  possibleNumberOfLiars: number[];
}

export interface WildLiesLevel {
  levelSetup: LevelSetup;
  puzzle: Record<string, string>;
  solution: {
    culprits: string[];
    liars: string[];
  };
}

export interface PlayerGuesses {
  [animalName: string]: {
    isCulprit: boolean;
    isLiar: boolean;
  };
}