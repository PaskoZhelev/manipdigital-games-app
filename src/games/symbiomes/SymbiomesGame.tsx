import React, { useState, useEffect, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { validateSolution } from './utils/validator';
import type { GameLevel, Animal, Position } from './types/game';
import './SymbiomesGame.css';

// --- TYPES ---
interface SavedDailyProgress {
  placements: Record<string, Position>;
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
  usedClues: number[];
  lastPlayed: number;
}

// --- CONSTANTS ---
const STORAGE_KEY = 'symbiomes_daily_progress';
const EMPTY_LEVEL: GameLevel = {
  difficulty: 'easy',
  grid: [],
  animals: [],
  clues: [],
  solution: {}
};
const EARLIEST_ARCHIVE_DATE = '2025-11-01'; 

// --- HELPERS ---
const getFilenameFromDate = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/symbiomes/levels/${dd}.${mm}.${yyyy}.json`;
};

const formatDateForInput = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const getAllProgress = (): Record<string, SavedDailyProgress> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to parse game progress", e);
    return {};
  }
};

// --- SUB-COMPONENT: CUSTOM CALENDAR ---
const CustomCalendar: React.FC<{
  currentDate: Date;
  minDateStr: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
  completedDates: Set<string>; 
}> = ({ currentDate, minDateStr, onSelect, onClose, completedDates }) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate));

  // Boundaries
  const minDate = new Date(minDateStr);
  minDate.setHours(0, 0, 0, 0); 
  
  const maxDate = new Date(); 
  maxDate.setHours(23, 59, 59, 999); 

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); // 0 = Sun
  
  // Adjust so Monday is first day
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1); 

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelect(selected);
    onClose();
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={e => e.stopPropagation()}>
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>
        
        <div className="calendar-grid">
          {['M','T','W','T','F','S','S'].map((d,i) => (
            <div key={i} className="calendar-day-header">{d}</div>
          ))}
          
          {Array.from({length: startOffset}).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}

          {Array.from({length: daysInMonth}).map((_, i) => {
            const day = i + 1;
            const thisDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            thisDate.setHours(12, 0, 0, 0); 
            
            const dateStr = formatDateForInput(thisDate);
            const isSolved = completedDates.has(dateStr);
            const isSelected = dateStr === formatDateForInput(currentDate);
            
            const isDisabled = thisDate < minDate || thisDate > maxDate;

            return (
              <div 
                key={day} 
                className={`calendar-day ${isDisabled ? 'disabled' : ''} ${isSolved ? 'solved' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={isDisabled ? undefined : () => handleDayClick(day)}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SymbiomesGame: React.FC = () => {
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Persistence State
  const dateKey = useMemo(() => formatDateForInput(targetDate), [targetDate]);
  const [savedProgress, setSavedProgress] = useState<SavedDailyProgress | null>(null);
  const [usingDefaultLevel, setUsingDefaultLevel] = useState(false);

  // UI State
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [draggedAnimal, setDraggedAnimal] = useState<Animal | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateSolution> | null>(null);
  const [usedClues, setUsedClues] = useState<Set<number>>(new Set());
  const [showClueImages, setShowClueImages] = useState(true);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; animal: Animal } | null>(null);

  // --- CALENDAR STATE ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  // --- 1. LOAD LEVEL & SAVED STATE ---
  useEffect(() => {
    document.title = "Symbiomes";
    const fetchLevelAndState = async () => {
      setIsLoading(true);
      setLoadError(null);
      setShowResult(false);
      setValidationResult(null);
      
      const allProgress = getAllProgress();
      const currentProgress = allProgress[dateKey];

      if (currentProgress) {
        setSavedProgress(currentProgress);
        setIsLevelCompleted(currentProgress.isCompleted);
        setUsedClues(new Set(currentProgress.usedClues));
      } else {
        setSavedProgress(null);
        setIsLevelCompleted(false);
        setUsedClues(new Set());
      }

      try {
        const targetFilename = getFilenameFromDate(targetDate);
        const defaultFile = import.meta.env.BASE_URL + '/assets/symbiomes/levels/default-level.json';
        
        const safeFetch = async (url: string) => {
          const res = await fetch(url);
          const contentType = res.headers.get("content-type");
          if (res.ok && contentType && contentType.includes("application/json")) {
            return await res.json();
          }
          throw new Error(`Invalid or missing file at ${url}`);
        };

        let data;
        try {
          data = await safeFetch(targetFilename);
          setUsingDefaultLevel(false);
        } catch (e) {
          console.warn(`Level for ${targetFilename} not found, trying default.`);
          try {
            data = await safeFetch(defaultFile);
            setUsingDefaultLevel(true);
          } catch (defaultError) {
             throw new Error("Could not load selected level OR default level.");
          }
        }
        setLevel(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load level');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevelAndState();
  }, [dateKey, targetDate]); 

  // --- 2. INITIALIZE GAME HOOK ---
  const {
    gameStarted,
    placements,
    stats,
    startGame, 
    placeAnimal,
    removeAnimal,
    resetGame,
    quitGame,
    incrementErrors,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useGameState(level || EMPTY_LEVEL, savedProgress); 

  // --- 3. AUTO-SAVE & UPDATE CALENDAR ---
  useEffect(() => {
    // Update completed dates list whenever game state changes significantly
    const all = getAllProgress();
    const solvedSet = new Set<string>();
    Object.keys(all).forEach(key => {
      if (all[key].isCompleted) solvedSet.add(key);
    });
    setCompletedDates(solvedSet);

    if (!level || isLoading) return;
    if (!gameStarted && !savedProgress) return;

    const stateToSave: SavedDailyProgress = {
      placements: placements,
      timeSpent: stats.timeSpent,
      errors: stats.errors,
      isCompleted: isLevelCompleted,
      usedClues: Array.from(usedClues),
      lastPlayed: Date.now()
    };

    all[dateKey] = stateToSave;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  }, [placements, stats, isLevelCompleted, usedClues, dateKey, gameStarted, level, isLoading]);

  // --- HANDLERS ---
  const handleDragStart = (animal: Animal, e: React.DragEvent) => {
    if (isLevelCompleted) { e.preventDefault(); return; } 
    setDraggedAnimal(animal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedAnimal(null);

  const handleTouchStart = (e: React.TouchEvent, animal: Animal) => {
    if (isLevelCompleted) return;
    const touch = e.touches[0];
    setDraggedAnimal(animal);
    setDragPreview({ x: touch.clientX, y: touch.clientY, animal });
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedAnimal) {
      const touch = e.touches[0];
      setDragPreview({ x: touch.clientX, y: touch.clientY, animal: draggedAnimal });
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedAnimal) return;
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const gridCell = element?.closest('.grid-cell');
    const paletteZone = element?.closest('.animals-drop-zone');

    if (gridCell) {
      const row = parseInt(gridCell.getAttribute('data-row') || '0');
      const column = gridCell.getAttribute('data-col') || '';
      if (row && column) handleDrop(row, column);
    } else if (paletteZone) {
      removeAnimal(draggedAnimal);
    }
    setDraggedAnimal(null);
    setDragPreview(null);
  };

  const handleDrop = (row: number, column: string) => {
    if (!draggedAnimal || isLevelCompleted) return;
    const position: Position = { row, column };
    const animalAtPosition = getAnimalAtPosition(row, column);

    if (animalAtPosition === draggedAnimal) {
      setDraggedAnimal(null);
      return;
    }

    if (animalAtPosition) {
      const draggedAnimalCurrentPos = placements[draggedAnimal];
      removeAnimal(animalAtPosition);
      placeAnimal(draggedAnimal, position);
      if (draggedAnimalCurrentPos) {
        placeAnimal(animalAtPosition, draggedAnimalCurrentPos);
      }
    } else {
      placeAnimal(draggedAnimal, position);
    }
    setDraggedAnimal(null);
  };

  const handleDropToPalette = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedAnimal && !isLevelCompleted) {
      removeAnimal(draggedAnimal);
      setDraggedAnimal(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const toggleClueUsed = (clueId: number) => {
    if (isLevelCompleted) return; 
    setUsedClues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clueId)) newSet.delete(clueId);
      else newSet.add(clueId);
      return newSet;
    });
  };

  const handleFinishLevel = () => {
    if (!level) return;
    const result = validateSolution(placements, level.solution);
    setValidationResult(result);
    
    if (!result.isCorrect) {
      incrementErrors();
      pauseTimer();
      setShowResult(true);
    } else {
      setIsLevelCompleted(true); 
      stopTimer();
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    if (isLevelCompleted) return;
      resetGame();
      setShowResult(false);
      setValidationResult(null);
      setUsedClues(new Set());
      setIsLevelCompleted(false);
  };

  const handleCloseFailureModal = () => {
    setShowResult(false);
    setValidationResult(null);
    resumeTimer();
  };

  const handleStartRequest = () => {
    const allProgress = getAllProgress();
    const existingSave = allProgress[dateKey];

    if (existingSave) {
      setSavedProgress(existingSave);
      setUsedClues(new Set(existingSave.usedClues));
      if (existingSave.isCompleted) {
        setIsLevelCompleted(true);
      } else {
        startGame(); 
      }
    } else {
      startGame();
    }
  };

  const handleBackToMenu = () => {
    setIsLevelCompleted(false);
    setSavedProgress(null);
    setShowResult(false);
    quitGame();
  };

  const handleShare = async () => {
    const dateStr = targetDate.toDateString();
    const minutes = Math.floor(stats.timeSpent / 60);
    const seconds = (stats.timeSpent % 60).toString().padStart(2, '0');
    const summary = `Daily Symbiomes 🌿\n📅 ${dateStr}\n✅ Completed Level in ${minutes}:${seconds}\n Failed Attempts: ${stats.errors}`;

    try {
      await navigator.clipboard.writeText(summary);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getAnimalAtPosition = (row: number, column: string): Animal | null => {
    const entry = Object.entries(placements).find(
      ([_, pos]) => pos && pos.row === row && pos.column === column
    );
    return entry ? (entry[0] as Animal) : null;
  };

  const getUnplacedAnimals = (): Animal[] => {
    if (!level) return [];
    return level.animals.filter((animal) => !placements[animal]);
  };

  const makeBoldKeywords = (text: string): string => {
    let processed = text.replace(/\bRow (\d+)\b/g, '<strong>Row $1</strong>');
    processed = processed.replace(/\bColumn ([A-C])\b/g, '<strong>Column $1</strong>');
    processed = processed.replace(/\bexactly (\d+)\b/gi, '<strong>exactly $1</strong>');
    return processed;
  };

  const renderClueWithImages = (description: string) => {
    if (!showClueImages || !level) return makeBoldKeywords(description);
    let processedDescription = description;

    level.animals.forEach((animal) => {
      const animalCapitalized = animal.charAt(0).toUpperCase() + animal.slice(1);
      const regex = new RegExp(`\\b${animalCapitalized}\\b`, 'g');
      processedDescription = processedDescription.replace(
        regex,
        `<img src="${import.meta.env.BASE_URL}assets/symbiomes/animals/${animal}.png" alt="${animal}" class="clue-animal-icon" title="${animalCapitalized}" />`
      );
    });

    ['GRASS', 'WATER', 'SAND', 'MUD'].forEach((terrain) => {
      const regex = new RegExp(`\\b${terrain}\\b`, 'g');
      processedDescription = processedDescription.replace(
        regex,
        `<img src="${import.meta.env.BASE_URL}assets/symbiomes/terrains/${terrain.toLowerCase()}.png" alt="${terrain}" class="clue-terrain-icon" title="${terrain}" />`
      );
    });

    ['TREE', 'ROCK', 'RUIN'].forEach((obj) => {
      const regex = new RegExp(`\\b${obj}\\b`, 'g');
      processedDescription = processedDescription.replace(
        regex,
        `<img src="${import.meta.env.BASE_URL}assets/symbiomes/objects/${obj.toLowerCase()}.png" alt="${obj}" class="clue-object-icon" title="${obj}" />`
      );
    });

    return makeBoldKeywords(processedDescription);
  };

  const getDisplayDate = () => {
    const dateToShow = usingDefaultLevel ? new Date() : targetDate;
    return dateToShow.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loadError) return <div className="error-screen"><h2>Error</h2><p>{loadError}</p></div>;

  return (
    <div 
      className="game-container"
      onDragOver={handleDragOver}
      onDrop={handleDropToPalette}
    >
      {dragPreview && (
        <div className="drag-preview" style={{ left: `${dragPreview.x}px`, top: `${dragPreview.y}px` }}>
          <img src={`${import.meta.env.BASE_URL}assets/symbiomes/animals/${dragPreview.animal}.png`} alt={dragPreview.animal} />
        </div>
      )}

      <div className="game-main-content">
        
        {/* BOARD SECTION */}
        <div className="board-section relative-wrapper">
          {(gameStarted || isLevelCompleted) && (
            <div className="level-date-footer">
              📅 {getDisplayDate()}
            </div>
          )}

          {/* OVERLAY LOGIC */}
          {!gameStarted && !isLevelCompleted && !savedProgress && (
            <div className="game-start-overlay">
              <h1>Daily Symbiomes</h1>
              <div className="date-selector-container">
                  <label>Select Date:</label>
                  
                  {/* NEW CUSTOM TRIGGER */}
                  <button 
                      className="custom-date-trigger" 
                      onClick={() => setShowCalendar(true)}
                  >
                      📅 {targetDate.toLocaleDateString()}
                  </button>
              </div>

              {/* CALENDAR MODAL */}
              {showCalendar && (
                <CustomCalendar 
                    currentDate={targetDate} 
                    minDateStr={EARLIEST_ARCHIVE_DATE}
                    onSelect={setTargetDate} 
                    onClose={() => setShowCalendar(false)} 
                    completedDates={completedDates}
                />
              )}

              {isLoading ? (
                  <p className="loading-text">Loading Puzzle...</p>
              ) : (
                  <>
                    <p className="level-date-display">Playing: {targetDate.toLocaleDateString()}</p>
                    <button className="btn-primary start-btn" onClick={handleStartRequest}>Start Game</button>
                  </>
              )}
            </div>
          )}
          
          {/* ... Rest of the board content ... */}
          <div className={`board-container ${(!gameStarted && !isLevelCompleted && !savedProgress) ? 'blurred-content' : ''}`}>
            <div className="animals-palette animals-drop-zone" onDragOver={handleDragOver} onDrop={handleDropToPalette}>
              {(gameStarted || isLevelCompleted) && getUnplacedAnimals().map((animal) => (
                <div 
                  key={animal} 
                  className={`animal-item ${isLevelCompleted ? 'locked' : ''}`} 
                  draggable={!isLevelCompleted}
                  onDragStart={(e) => handleDragStart(animal, e)} 
                  onDragEnd={handleDragEnd} 
                  onTouchStart={(e) => handleTouchStart(e, animal)} 
                  onTouchMove={handleTouchMove} 
                  onTouchEnd={handleTouchEnd}
                >
                  <img src={`${import.meta.env.BASE_URL}assets/symbiomes/animals/${animal}.png`} alt={animal} className="animal-palette-image" />
                  <span className="animal-name">{animal}</span>
                </div>
              ))}
            </div>

            <div className="grid">
              {(level || EMPTY_LEVEL).grid.map((row, rowIndex) => (
                <div key={rowIndex} className="grid-row">
                  {row.map((cell, colIndex) => {
                    const column = String.fromCharCode(65 + colIndex);
                    const animalAtPosition = getAnimalAtPosition(rowIndex + 1, column);
                    const isInteractable = gameStarted || isLevelCompleted;
                    return (
                      <div key={colIndex} 
                           className={`grid-cell ${isInteractable ? `terrain-${cell.terrain}` : 'terrain-hidden'} ${draggedAnimal ? 'dragging-active' : ''}`} 
                           data-row={rowIndex + 1} 
                           data-col={column} 
                           onDrop={(e) => { e.stopPropagation(); handleDrop(rowIndex + 1, column); }} 
                           onDragOver={handleDragOver}>
                        {isInteractable && (
                          <>
                            <div className="cell-background"><img src={`${import.meta.env.BASE_URL}assets/symbiomes/terrains/${cell.terrain}.png`} alt={cell.terrain} className="terrain-image" /></div>
                            {cell.object !== 'none' && <div className="cell-object"><img src={`${import.meta.env.BASE_URL}assets/symbiomes/objects/${cell.object}.png`} alt={cell.object} className="object-image" /></div>}
                            {animalAtPosition && (
                                <div className="cell-animal" 
                                     draggable={!isLevelCompleted}
                                     onDragStart={(e) => handleDragStart(animalAtPosition, e)} 
                                     onDragEnd={handleDragEnd} 
                                     onTouchStart={(e) => handleTouchStart(e, animalAtPosition)} 
                                     onTouchMove={handleTouchMove} 
                                     onTouchEnd={handleTouchEnd} 
                                     onClick={() => !isLevelCompleted && removeAnimal(animalAtPosition)}>
                                    <img src={`${import.meta.env.BASE_URL}assets/symbiomes/animals/${animalAtPosition}.png`} alt={animalAtPosition} className="animal-image" />
                                </div>
                            )}
                          </>
                        )}
                        <span className="cell-label">{rowIndex + 1}{column}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CLUES SECTION */}
        <div className="clues-section relative-wrapper">
            {(!gameStarted && !isLevelCompleted && !savedProgress) ? (
                 <div className="clues-placeholder"><p>Select a date and Start Game to see clues</p></div>
            ) : (
                <>
                <div className="clues-grid">
                    {(level || EMPTY_LEVEL).clues.map((clue) => (
                    <div key={clue.id} className={`clue-item ${usedClues.has(clue.id) ? 'clue-used' : ''}`} onClick={() => toggleClueUsed(clue.id)}>
                        <span className="clue-number">{clue.id}.</span>
                        <span className="clue-text" dangerouslySetInnerHTML={{ __html: renderClueWithImages(clue.description) }} />
                    </div>
                    ))}
                </div>
                <button className="toggle-images-btn-bottom" onClick={() => setShowClueImages(!showClueImages)}>{showClueImages ? '🖼️ Switch to Text' : '📝 Switch to Images'}</button>
                </>
            )}
        </div>
      </div>

      {/* GAME ACTIONS */}
      {(gameStarted || isLevelCompleted) && ( 
        <div className="game-controls-container">
            {isLevelCompleted && (
                <div className="completion-banner">
                    <h3>🏆 Level Completed!</h3>
                    <div className="completion-stats">
                        <span>⏱️ {Math.floor(stats.timeSpent / 60)}:{(stats.timeSpent % 60).toString().padStart(2, '0')}</span>
                        <span>❌ {stats.errors} Errors</span>
                    </div>
                </div>
            )}
            
            <div className="game-actions">
                {isLevelCompleted ? (
                    <>
                         <button 
                            className="btn-secondary" 
                            onClick={handleBackToMenu} 
                        >
                            📅 Pick Another Date
                        </button>
                        <button 
                            className={`btn-primary btn-share-completed ${copyFeedback ? 'copied' : ''}`} 
                            onClick={handleShare} 
                        >
                            {copyFeedback ? '✅ Copied!' : '📋 Copy Summary'}
                        </button>
                    </>
                ) : (
                    <>
                        <button 
                          className="btn-secondary" 
                          onClick={handleRestart}
                          disabled={isLevelCompleted}
                          style={isLevelCompleted ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          Restart
                        </button>
                        
                        <button 
                        className="btn-primary" 
                        onClick={handleFinishLevel}
                        disabled={getUnplacedAnimals().length > 0 || isLevelCompleted} 
                        >
                        Finish Level
                        </button>
                    </>
                )}
            </div>
        </div>
      )}

      {/* RULES AND INSTRUCTIONS */}
      <div className="game-info">
        <div className="info-section">
          <h3>📖 How to Play</h3>
          <ul>
            <li><strong>Read the clues</strong> carefully. Each clue gives you information about where animals should be placed.</li>
            <li><strong>Drag animals</strong> from the left side of the board onto the 3×3 grid.</li>
            <li><strong>Drag an animal back</strong> to the **Animals Palette** on the left, or drag it outside the grid completely, to remove it from the board.</li>
            <li>If you drag an animal to a cell already occupied by another animal, the two animals will be **swapped**.</li>
            <li><strong>Click on a clue</strong> to mark it as "used" (it will appear crossed out). This helps you track which clues you've already applied.</li>
            <li><strong>Click on an animal</strong> that's already placed on the grid to remove it and place it elsewhere (desktop fallback).</li>
            <li>Use the button at the bottom of clues to toggle between showing clues with images or text only.</li>
            <li>When you think you've placed all animals correctly, click **"Finish Level"** to check your solution.</li>
            <li>If you're stuck, click **"Restart"** to clear the board and try again.</li>
            <li><strong>Progress is saved automatically!</strong> You can leave and come back later. Completed levels cannot be replayed.</li>
          </ul>
        </div>
        <div className="info-section">
          <h3>📋 Rules</h3>
          <ul>
            <li><strong>Grid coordinates:</strong> Each cell has a coordinate like "1A" (Row 1, Column A). Top-left is <strong>1A</strong>, bottom-right is <strong>3C</strong>.</li>
            <li><strong>Adjacent means orthogonal only:</strong> Two cells are "adjacent" if they share an edge (UP, DOWN, LEFT, or RIGHT). <strong>Diagonal neighbors are NOT adjacent!</strong></li>
            <li><strong>Animals and objects:</strong> Animals CAN be placed on cells with Objects like trees, rocks, or ruins. Objects don't block placement.</li>
            <li><strong>One animal per cell:</strong> Each cell can hold <strong>only ONE animal</strong>, but you can see both the animal and any object in that cell.</li>
            <li><strong>Corner cells:</strong> The four corner cells are 1A, 1C, 3A, and 3C.</li>
            <li><strong>Terrain types:</strong> Each cell has a terrain (Grass, Water, Sand, or Mud) which is visible as the background.</li>
          </ul>
        </div>
      </div>

      {/* MODALS */}
      {showResult && validationResult && (
        <div className="modal-overlay">
             <div className="modal-content">
                  {validationResult.isCorrect ? (
                      <>
                        <h2>🎉 Correct!</h2>
                        <div className="stats-display">
                          <div className="stat-item">
                            <span className="stat-label">Time</span>
                            <span className="stat-value">
                              {Math.floor(stats.timeSpent / 60)}:{(stats.timeSpent % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Errors</span>
                            <span className="stat-value">{stats.errors}</span>
                          </div>
                        </div>
                        <div className="modal-actions">
                             <button 
                                className={`btn-secondary btn-share ${copyFeedback ? 'copied' : ''}`} 
                                onClick={handleShare}
                             >
                                {copyFeedback ? '✅ Copied!' : '📤 Share Summary'}
                             </button>

                             <button className="btn-primary" onClick={() => setShowResult(false)}>Okay</button>
                        </div>
                      </>
                  ) : (
                    <>
                        <h2>❌ Incorrect</h2>
                        <div className="stats-display">
                           <div className="stat-item">
                            <span className="stat-label">Time</span>
                            <span className="stat-value">
                              {Math.floor(stats.timeSpent / 60)}:{(stats.timeSpent % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Errors</span>
                            <span className="stat-value">{stats.errors}</span>
                          </div>
                        </div>
                        <p className="incorrect-message">
                            Some animals are not in the correct positions.
                        </p>
                        <div className="modal-actions">
                             <button className="btn-secondary" onClick={handleCloseFailureModal}>Close</button>
                        </div>
                    </>
                  )}
             </div>
        </div>
      )}
    </div>
  );
};