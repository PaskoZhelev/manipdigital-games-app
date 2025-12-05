import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameLevel, AnimalPlacement, GameStats, Animal, Position } from '../types/game';

// Define the interface for the saved state coming from LocalStorage
// (This must match the interface used in SymbiomesGame.tsx)
interface SavedGameState {
  placements: Record<string, Position>;
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
}

export const useGameState = (
  level: GameLevel | null, 
  savedState?: SavedGameState | null
) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [placements, setPlacements] = useState<AnimalPlacement>({});
  
  // Timer State
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  
  const [stats, setStats] = useState<GameStats>({
    timeSpent: 0,
    errors: 0,
    hintsUsed: 0,
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZATION & RESTORATION LOGIC ---
  useEffect(() => {
    if (!level) return;

    if (savedState) {
      // 1. RESTORE FROM SAVE
      setPlacements(savedState.placements);
      
      setStats({
        timeSpent: savedState.timeSpent,
        errors: savedState.errors,
        hintsUsed: 0 
      });

      // If the level was already completed, we DO NOT start the game.
      // We essentially put the hook into "View Mode".
      if (savedState.isCompleted) {
        setGameStarted(false);
        setIsPaused(true); // Pause effectively disables timer logic
        setStartTime(null);
      } else {
        // If it was in progress, we auto-start the game and restore the timer.
        setGameStarted(true);
        setIsPaused(false);
        setPausedTime(0);
        // Back-calculate start time so the timer continues smoothly from saved time
        setStartTime(Date.now() - (savedState.timeSpent * 1000));
      }
    } else {
      // 2. NEW GAME / RESET
      // Only reset if we are not currently in a started session for this specific level
      const initialPlacements: AnimalPlacement = {};
      level.animals.forEach((animal) => {
        initialPlacements[animal] = null;
      });
      setPlacements(initialPlacements);
      setGameStarted(false);
      setStartTime(null);
      setStats({ timeSpent: 0, errors: 0, hintsUsed: 0 });
      setIsPaused(false);
      setPausedTime(0);
    }
  }, [level, savedState]); // Re-run whenever the Level or the Saved Data changes

  // --- TIMER MANAGEMENT (Unchanged Logic) ---
  useEffect(() => {
    if (gameStarted && startTime && !isPaused) {
      timerRef.current = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          timeSpent: Math.floor((Date.now() - startTime - pausedTime) / 1000),
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, startTime, isPaused, pausedTime]);

  // --- ACTIONS ---

  const startGame = useCallback(() => {
    console.log('startGame');
    console.log(savedState);
    console.log(savedState?.isCompleted);
    // CRITICAL FIX: 
    // If the saved state indicates the level is already completed, 
    // strictly IGNORE any request to start/reset the game.
    // This prevents overwriting the completed 'stats' with 0s.
    if (savedState && savedState.isCompleted) {
      console.warn("Attempted to start a completed level. Action blocked to preserve save file.");
      return; 
    }

    setGameStarted(true);
    setStartTime(Date.now());
    setPausedTime(0);
    setStats({ timeSpent: 0, errors: 0, hintsUsed: 0 });
    setIsPaused(false);
  }, [savedState]); // dependency on savedState is important here

  const pauseTimer = useCallback(() => {
    if (!isPaused && startTime) {
      setIsPaused(true);
      setPausedTime((prev) => prev + (Date.now() - startTime - prev));
    }
  }, [isPaused, startTime]);

  const resumeTimer = useCallback(() => {
    if (isPaused && startTime) {
      setIsPaused(false);
      const now = Date.now();
      setStartTime(now - pausedTime);
      setPausedTime(0);
    }
  }, [isPaused, startTime, pausedTime]);

  const stopTimer = useCallback(() => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const placeAnimal = useCallback((animal: Animal, position: Position | null) => {
    // Optional: Prevent placement if completed (though UI should handle this)
    if (savedState?.isCompleted) return;

    setPlacements((prev) => ({
      ...prev,
      [animal]: position,
    }));
  }, [savedState]);

  const removeAnimal = useCallback((animal: Animal) => {
    if (savedState?.isCompleted) return;

    setPlacements((prev) => ({
      ...prev,
      [animal]: null,
    }));
  }, [savedState]);

  const resetGame = useCallback(() => {
    // Prevent resetting if level is completed
    if (savedState?.isCompleted) return;

    if (level) {
      const initialPlacements: AnimalPlacement = {};
      level.animals.forEach((animal) => {
        initialPlacements[animal] = null;
      });
      setPlacements(initialPlacements);
      
      // Reset Stats
      setIsPaused(false);
      setGameStarted(true); 
    }
  }, [level, savedState]);

  const incrementErrors = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      errors: prev.errors + 1,
    }));
  }, []);

  const quitGame = useCallback(() => {
    setGameStarted(false);
    setIsPaused(false);
    setStartTime(null);
  }, []);

  return {
    gameStarted,
    placements,
    stats,
    startGame,
    placeAnimal,
    removeAnimal,
    resetGame,
    incrementErrors,
    pauseTimer,
    resumeTimer,
    stopTimer,
    quitGame,
  };
};