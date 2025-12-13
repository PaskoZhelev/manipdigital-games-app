import React, { useState, useEffect, useMemo } from 'react';
import type { NeonLevel, SavedNeonProgress, NeonClue } from './types/neon';
import '../symbiomes/SymbiomesGame.css'; 
import './NeonProtocol.css'; 

// --- CONSTANTS ---
const STORAGE_KEY = 'neon_protocol_daily';
const EARLIEST_ARCHIVE_DATE = '2025-11-01';

// UPDATED: Added color for E
const LETTER_COLORS: Record<string, string> = {
  'A': 'var(--neon-col-A)',
  'B': 'var(--neon-col-B)',
  'C': 'var(--neon-col-C)',
  'D': 'var(--neon-col-D)',
  'E': 'var(--neon-col-E)', 
};

// --- HELPERS ---
const getFilenameFromDate = (date: Date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/neon-protocol/levels/${mm}.${yyyy}.json`;
};

const formatDateForInput = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const getAllProgress = (): Record<string, SavedNeonProgress> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
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

export const NeonProtocol: React.FC = () => {
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [level, setLevel] = useState<NeonLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const dateKey = useMemo(() => formatDateForInput(targetDate), [targetDate]);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  // Completed Dates logic
  useEffect(() => {
    const all = getAllProgress();
    const solvedSet = new Set<string>();
    Object.keys(all).forEach(key => {
      if (all[key].isCompleted) solvedSet.add(key);
    });
    setCompletedDates(solvedSet);
  }, [gameStarted]); 

  // Game State
  const [eliminations, setEliminations] = useState<boolean[][]>([]); 
  const [currentGuess, setCurrentGuess] = useState<(number | null)[]>([]);
  const [usedClues, setUsedClues] = useState<Set<string>>(new Set());
  
  const [timeSpent, setTimeSpent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  
  const [showResult, setShowResult] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [validationResult, setValidationResult] = useState<'CORRECT' | 'WRONG' | null>(null);

  // --- TIMER ---
  useEffect(() => {
    let interval: number;
    if (timerActive && !isLevelCompleted) {
      interval = window.setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isLevelCompleted]);

  // --- LOAD LEVEL ---
  useEffect(() => {
    document.title = "Neon Protocol";
    const fetchLevel = async () => {
      setIsLoading(true);
      setLoadError(null);

      const filename = getFilenameFromDate(targetDate);
      const dayKey = String(targetDate.getDate());

      try {
        const res = await fetch(filename).catch(() => fetch(`${import.meta.env.BASE_URL}assets/neon-protocol/levels/default.json`));
        if (!res.ok) throw new Error("Load failed");
        const monthlyLevels = await res.json();
        const rawData = monthlyLevels[dayKey];

        const normalizedClues = rawData.clues.map((clue: string | NeonClue, index: number) => {
            if (typeof clue === 'string') {
                return { id: `clue-${index}`, description: clue };
            }
            return clue;
        });

        // Use codeLength from JSON, default to 3
        const validCodeLength = rawData.codeLength || rawData.solution?.length || 3;

        const data: NeonLevel = {
            ...rawData,
            clues: normalizedClues,
            codeLength: validCodeLength,
            mode: rawData.mode ? rawData.mode.toUpperCase() : 'STANDARD'
        };

        setLevel(data);

        const allProgress = getAllProgress();
        const saved = allProgress[dateKey];

        if (saved) {
          setEliminations(saved.eliminations);
          setCurrentGuess(saved.currentGuess);
          setTimeSpent(saved.timeSpent);
          setErrors(saved.errors);
          setUsedClues(new Set(saved.usedClues));
          
          setIsLevelCompleted(saved.isCompleted); 
          setGameStarted(true); 
          
          if (saved.isCompleted) {
             setValidationResult('CORRECT');
          } else {
             setValidationResult(null);
          }
        } else {
          // Dynamic initialization based on codeLength
          const cols = data.codeLength;
          const emptyElims = Array(cols).fill(null).map(() => Array(6).fill(false));
          setEliminations(emptyElims);
          setCurrentGuess(Array(cols).fill(null));
          setErrors(0);
          setTimeSpent(0);
          setUsedClues(new Set());
          setIsLevelCompleted(false);
          setValidationResult(null);
          setGameStarted(false); 
        }

      } catch (err) {
        console.error("Critical Error:", err);
        setLoadError("Could not load level data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLevel();
  }, [dateKey]); 

  // --- AUTO SAVE ---
  useEffect(() => {
    if (!gameStarted || !level) return;
    const allProgress = getAllProgress();
    allProgress[dateKey] = {
      eliminations,
      currentGuess,
      timeSpent,
      errors,
      isCompleted: isLevelCompleted,
      usedClues: Array.from(usedClues),
      lastPlayed: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  }, [eliminations, currentGuess, timeSpent, errors, isLevelCompleted, usedClues, gameStarted]);

  // --- HANDLERS ---
  const handleStartGame = () => {
    const allProgress = getAllProgress();
    const saved = allProgress[dateKey];
    if (saved && saved.isCompleted) {
        setIsLevelCompleted(true);
        setValidationResult('CORRECT');
        setTimerActive(false); 
    } else {
        setTimerActive(true);
    }
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setIsLevelCompleted(false);
    setShowResult(false);
  };

  const toggleElimination = (colIndex: number, val: number) => {
    if (isLevelCompleted || !gameStarted) return;

    setEliminations(prev => {
      // 1. Calculate the next elimination state
      const next = prev.map(col => [...col]);
      next[colIndex][val] = !next[colIndex][val];

      // 2. Check the column to see how many numbers are left uncrossed
      const colData = next[colIndex];
      const uncrossed: number[] = [];
      // Indices 1 to 5 represent numbers 1 to 5
      for (let i = 1; i <= 5; i++) {
        if (!colData[i]) {
          uncrossed.push(i);
        }
      }

      // 3. Auto-fill or Reset the guess for this column
      if (uncrossed.length === 1) {
         // EXACTLY ONE OPTION LEFT: Auto-fill
         setCurrentGuess(prevGuess => {
            const nextGuess = [...prevGuess];
            // Only update if it's different to avoid redundant updates
            if (nextGuess[colIndex] !== uncrossed[0]) {
               nextGuess[colIndex] = uncrossed[0];
            }
            return nextGuess;
         });
      } else if (uncrossed.length > 1) {
         // MORE THAN ONE OPTION: Reset to empty if currently filled
         setCurrentGuess(prevGuess => {
            if (prevGuess[colIndex] !== null) {
               const nextGuess = [...prevGuess];
               nextGuess[colIndex] = null;
               return nextGuess;
            }
            return prevGuess;
         });
      }

      return next;
    });
  };

  const handleGuessChange = (colIndex: number, valStr: string) => {
    if (isLevelCompleted) return;
    const val = valStr === "" ? null : parseInt(valStr, 10);
    setCurrentGuess(prev => {
      const next = [...prev];
      next[colIndex] = val;
      return next;
    });
  };

  const toggleClue = (id: string) => {
    if (isLevelCompleted) return;
    setUsedClues(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!level) return;
    if (currentGuess.includes(null)) {
        alert("Please fill in all code digits before submitting.");
        return;
    }

    const isCorrect = level.solution.every((val, idx) => val === currentGuess[idx]);

    if (isCorrect) {
      setIsLevelCompleted(true);
      setTimerActive(false);
      setValidationResult('CORRECT');
      setShowResult(true);
    } else {
      setErrors(prev => prev + 1);
      setTimerActive(false);
      setValidationResult('WRONG');
      setShowResult(true);
    }
  };

  const handleRestart = () => {
     if (!level || isLevelCompleted) return;
        const cols = level.codeLength;
        setEliminations(Array(cols).fill(null).map(() => Array(6).fill(false)));
        setCurrentGuess(Array(cols).fill(null));
        setUsedClues(new Set());
        setTimerActive(true);
  };

  const handleShare = async () => {
    const minutes = Math.floor(timeSpent / 60);
    const seconds = (timeSpent % 60).toString().padStart(2, '0');
    const summary = `Neon Protocol 🤖\n📅 ${targetDate.toLocaleDateString()}\nMode: ${level?.mode}\n✅ Cracked in ${minutes}:${seconds}\n🛑 Errors: ${errors}`;
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) { console.error(e); }
  };

  const getColLabel = (idx: number) => String.fromCharCode(65 + idx);

  // UPDATED: Regex now matches [A-E]
  const formatClueText = (text: string) => {
    let formatted = text.replace(/\b([A-E])\b/g, (match) => {
        return `<strong style="color: ${LETTER_COLORS[match]}">${match}</strong>`;
    });
    formatted = formatted.replace(/\b(NOT|OR|AND|EITHER)\b/g, '<strong style="color:#ff6b6b">$1</strong>');
    return formatted;
  };

  if (loadError) return <div className="error-screen"><h2>Error</h2><p>{loadError}</p></div>;

  const isGlitched = level?.mode === 'GLITCHED';

  return (
    <div className="game-container neon-container">

      {!gameStarted && !isLevelCompleted && (
        <div className="game-start-overlay">
          <h1 className="game-title-neon">NEON PROTOCOL</h1>
          
          <div className="date-selector-container">
            <label>Date:</label>
            <button 
                className="custom-date-trigger" 
                onClick={() => setShowCalendar(true)}
            >
                📅 {targetDate.toLocaleDateString()}
            </button>
          </div>

          {showCalendar && (
            <CustomCalendar 
                currentDate={targetDate} 
                minDateStr={EARLIEST_ARCHIVE_DATE}
                onSelect={setTargetDate} 
                onClose={() => setShowCalendar(false)} 
                completedDates={completedDates}
            />
          )}

          {isLoading ? <p className="loading-text">Decryption in progress...</p> : 
            <button className="btn-primary start-btn" onClick={handleStartGame}>Start Game</button>
          }
        </div>
      )}

      {/* HEADER INFO */}
      <div className="game-info-header">
         <span className="level-date-display">
            Protocol: {targetDate.toLocaleDateString()}
         </span>
         
         {level && (
             <span 
                className={`mode-badge ${isGlitched ? 'glitched' : 'standard'}`}
                data-tooltip={isGlitched 
                    ? "GLITCHED MODE: One clue is a LIE. All others are true." 
                    : "STANDARD MODE: All clues are TRUE."}
             >
                {isGlitched ? 'GLITCHED MODE' : 'STANDARD MODE'}
             </span>
         )}
      </div>

      <div className={`game-main-content neon-main-content ${!gameStarted ? 'blurred-content' : ''}`}>
        
        {/* LEFT: MATRIX */}
        <div className="deduction-section">
          <div className="section-label">Deduction Matrix</div>
          <div className="matrix-grid" style={{ gridTemplateColumns: `repeat(${level?.codeLength || 3}, 1fr)` }}>
            {level && Array.from({length: level.codeLength}).map((_, idx) => {
               const letter = getColLabel(idx);
               return (
                <div key={`head-${idx}`} className="matrix-header" style={{ color: LETTER_COLORS[letter] }}>
                    {letter}
                </div>
               );
            })}
            {[1, 2, 3, 4, 5].map(num => (
              <React.Fragment key={`row-${num}`}>
                 {level && Array.from({length: level.codeLength}).map((_, colIdx) => {
                    const isEliminated = eliminations[colIdx]?.[num] || false;
                    return (
                      <div 
                        key={`${colIdx}-${num}`} 
                        className={`matrix-cell ${isEliminated ? 'eliminated' : ''}`}
                        onClick={() => toggleElimination(colIdx, num)}
                      >
                         <span className="cell-number">{num}</span>
                      </div>
                    );
                 })}
              </React.Fragment>
            ))}
          </div>

          <div className="section-label">System Code</div>
          <div className="code-input-area">
             {level && Array.from({length: level.codeLength}).map((_, idx) => {
                const letter = getColLabel(idx);
                return (
                  <div key={`input-${idx}`} className="digit-input-wrapper">
                    <label className="digit-label" style={{ color: LETTER_COLORS[letter] }}>
                        {letter}
                    </label>
                    <select 
                        className={`digit-select ${currentGuess[idx] ? 'filled' : ''}`}
                        value={currentGuess[idx] ?? ""}
                        onChange={(e) => handleGuessChange(idx, e.target.value)}
                        disabled={isLevelCompleted}
                    >
                        <option value="">-</option>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                );
             })}
          </div>
        </div>

        {/* RIGHT: CLUES */}
        <div className="clues-section">
           <div className="section-label" style={{marginBottom: '10px'}}>Security Clues</div>
           <div className="clues-grid">
              {level?.clues.map((clue, idx) => (
                 <div 
                   key={clue.id} 
                   className={`clue-item ${usedClues.has(clue.id) ? 'clue-used' : ''}`}
                   onClick={() => toggleClue(clue.id)}
                 >
                    <span className="clue-number">{idx + 1}.</span>
                    <span 
                        className="clue-text" 
                        dangerouslySetInnerHTML={{ __html: formatClueText(clue.description) }} 
                    />
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* FOOTER & RULES */}
      {gameStarted && (
        <div className="game-controls-container">
           {isLevelCompleted && (
              <div className="completion-banner">
                 <h3>ACCESS GRANTED</h3>
                 <div className="completion-stats">
                    <span>⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                    <span>🚫 {errors} Failed Attempts</span>
                 </div>
              </div>
           )}

           <div className="game-actions">
              {isLevelCompleted ? (
                <>
                  <button className="btn-secondary" onClick={handleBackToMenu}>
                    Pick Another Date
                  </button>
                  <button className={`btn-primary btn-share ${copyFeedback?'copied':''}`} onClick={handleShare}>
                      {copyFeedback ? 'Copied' : 'Share Result'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-secondary" onClick={handleRestart}>Reset</button>
                  <button className="btn-primary" onClick={handleSubmit}>Submit Solution</button>
                </>
              )}
           </div>
        </div>
      )}

      {/* RULES */}
      <div className="rules-container">
        <div className="rules-box">
            <h3>📖 How to Play</h3>
            <ul>
                <li><strong>Analyze the Clues:</strong> Read the security clues on the right. They describe the numeric properties of the hidden code.</li>
                <li><strong>Eliminate Numbers:</strong> Click the cells in the <strong>Deduction Matrix</strong> to cross out (X) numbers that are impossible.</li>
                <li><strong>Deduce the Code:</strong> As you eliminate numbers, the remaining digits will reveal the correct code sequence.</li>
                <li><strong>Input & Submit:</strong> Select the numbers in the "System Code" section and click "Submit Solution".</li>
            </ul>
        </div>
        <div className="rules-box">
            <h3>📋 Protocol Rules</h3>
            <ul>
                {/* UPDATED RULE TEXT */}
                <li>The code consists of <strong>3, 4, or 5 digits</strong> (A, B, C, D, E), each between 1 and 5.</li>
                <li><strong>Columns:</strong> A is the 1st digit, B is 2nd, etc.</li>
                <li><strong style={{color: '#4caf50'}}>STANDARD MODE:</strong> All clues provided are TRUE facts.</li>
                <li>
                    <strong className="highlight-glitch">⚠️ GLITCHED MODE:</strong> If the mode is "GLITCHED", exactly 
                    <strong> ONE clue is FALSE</strong> (a lie) and all others are TRUE. You must determine which clue is the glitch to solve the puzzle.
                </li>
            </ul>
        </div>
      </div>

      {/* MODAL */}
      {showResult && (
         <div className="modal-overlay">
            <div className="modal-content" style={{ textAlign: 'center' }}>
               {validationResult === 'CORRECT' ? (
                  <>
                     <h2 style={{color: '#4caf50'}}>ACCESS GRANTED</h2>
                     <p>You have successfully decrypted the protocol.</p>
                     <div className="stats-display">
                        <div className="stat-item"><span>Time</span><span className="stat-value">{Math.floor(timeSpent/60)}:{(timeSpent%60).toString().padStart(2,'0')}</span></div>
                        <div className="stat-item"><span>Errors</span><span className="stat-value">{errors}</span></div>
                     </div>
                     <button className="btn-primary" onClick={() => setShowResult(false)}>Close</button>
                  </>
               ) : (
                  <>
                     <h2 style={{color: '#ff6b6b'}}>ACCESS DENIED</h2>
                     <p>The code is incorrect. Check your logic and try again.</p>
                     <button className="btn-secondary" onClick={() => { setShowResult(false); setTimerActive(true); }}>Retry</button>
                  </>
               )}
            </div>
         </div>
      )}
    </div>
  );
};