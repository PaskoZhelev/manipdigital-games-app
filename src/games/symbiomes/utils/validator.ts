import type { GameLevel, AnimalPlacement, Position } from '../types/game';

export interface ValidationResult {
  isCorrect: boolean;
  incorrectPlacements: string[];
  missingPlacements: string[];
}

export const validateSolution = (
  placements: AnimalPlacement,
  solution: GameLevel['solution']
): ValidationResult => {
  const incorrectPlacements: string[] = [];
  const missingPlacements: string[] = [];

  Object.entries(solution).forEach(([animal, correctPos]) => {
    const userPos = placements[animal];

    if (!userPos) {
      missingPlacements.push(animal);
    } else if (
      userPos.row !== correctPos.row ||
      userPos.column !== correctPos.column
    ) {
      incorrectPlacements.push(animal);
    }
  });

  return {
    isCorrect: incorrectPlacements.length === 0 && missingPlacements.length === 0,
    incorrectPlacements,
    missingPlacements,
  };
};

export const positionToString = (pos: Position): string => {
  return `${pos.row}${pos.column}`;
};

export const isPositionOccupied = (
  placements: AnimalPlacement,
  position: Position,
  excludeAnimal?: string
): boolean => {
  return Object.entries(placements).some(
    ([animal, pos]) =>
      animal !== excludeAnimal &&
      pos &&
      pos.row === position.row &&
      pos.column === position.column
  );
};