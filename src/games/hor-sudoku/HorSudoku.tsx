import React, { useState, useEffect } from 'react';
import type { HorSudokuLevel, SavedHorSudokuProgress } from './types/horsudoku';
import './HorSudoku.css';

// --- CONFIG ---
const STORAGE_KEY = 'horsudoku_daily';
const EARLIEST_DATE = '2026-01-01'; 

// Use the CSS variables defined in your .css file
const COLOR_MAP: Record<string, string> = {
  'A': 'var(--hs-col-A)',
  'B': 'var(--hs-col-B)',
  'C': 'var(--hs-col-C)',
  'D': 'var(--hs-col-D)',
  'E': 'var(--hs-col-E)',
  'F': 'var(--hs-col-F)',
  'G': 'var(--hs-col-G)',
  'H': 'var(--hs-col-H)',
  'I': 'var(--hs-col-I)',
};

// --- HELPERS ---
const getFilenameFromDate = (date: Date) => {
  const mm = String(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/hor-sudoku/levels/${mm}.${yyyy}.json`;
};

const formatDateKey = (date: Date) => String(date.getDate());
const getStorageKey = (dateStr: string) => `${STORAGE_KEY}_${dateStr}`;

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

const parseConfigDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const HorSudoku: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [levelData, setLevelData] = useState<HorSudokuLevel | null>(null);
  const [userGrid, setUserGrid] = useState<any[][] | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isPencilMode, setIsPencilMode] = useState(false);
  
  const [timeSpent, setTimeSpent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [validationResult, setValidationResult] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- LOADING ---
  useEffect(() => {
    const loadLevel = async () => {
      setLevelData(null); 
      setUserGrid(null); 
      setSelectedCell(null);
      setIsCompleted(false); 
      setShowResult(false); 
      setValidationResult(null);
      setIsTimerActive(false); 
      setLoadError(null);

      const dateKey = formatDateKey(currentDate); 
      const storageId = getStorageKey(currentDate.toDateString());
      const filePath = getFilenameFromDate(currentDate);
      
      try {
        const res = await fetch(filePath);
        if (!res.ok) throw new Error(`Level file not found: ${filePath}`);
        
        const allLevels = await res.json();
        const levelRaw: HorSudokuLevel = allLevels[dateKey];
        if (!levelRaw) throw new Error(`No level found for day ${dateKey}`);

        setLevelData(levelRaw);

        const saved = localStorage.getItem(storageId);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserGrid(parsed.userGrid);
          setTimeSpent(parsed.timeSpent);
          setErrors(parsed.errors);
          setIsCompleted(parsed.isCompleted);
          if (parsed.isCompleted) setValidationResult('CORRECT');
          else setIsTimerActive(true);
        } else {
          const initialGrid = levelRaw.grid.map(row => row.map(cell => ({
            number: cell.number,
            color: cell.color,
            isLockedNumber: cell.number !== null,
            isLockedColor: cell.color !== null,
            isError: false,
            notes: [], 
            colorNotes: []
          })));
          setUserGrid(initialGrid);
          setTimeSpent(0); 
          setErrors(0);
          setIsTimerActive(true);
        }
      } catch (err: any) {
        setLoadError(err.message);
      }
    };
    loadLevel();
  }, [currentDate]);

  // --- TIMER ---
  useEffect(() => {
    let interval: number;
    if (isTimerActive && !isCompleted) {
      interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, isCompleted]);

  // --- SAVING ---
  useEffect(() => {
    if (!levelData || !userGrid) return;
    localStorage.setItem(getStorageKey(currentDate.toDateString()), JSON.stringify({
      userGrid, timeSpent, errors, isCompleted, lastPlayed: Date.now()
    }));
  }, [userGrid, timeSpent, errors, isCompleted]);

  // --- HANDLERS ---
  const handleCellClick = (r: number, c: number) => {
    if (isCompleted) return;
    setSelectedCell([r, c]);
  };

  const handleInputNumber = (num: number | null) => {
    if (!userGrid || !selectedCell || isCompleted) return;
    const [r, c] = selectedCell;
    if (userGrid[r][c].isLockedNumber) return;

    const newGrid = [...userGrid];
    const cell = { ...newGrid[r][c] };

    if (num === null) {
      cell.number = null;
      cell.isError = false;
    } else if (isPencilMode) {
      const notes = cell.notes || [];
      cell.notes = notes.includes(num) ? notes.filter((n: number) => n !== num) : [...notes, num];
    } else {
      cell.number = num;
      cell.isError = false;
    }
    newGrid[r][c] = cell;
    setUserGrid(newGrid);
  };

  const handleInputColor = (color: string | null) => {
    if (!userGrid || !selectedCell || isCompleted) return;
    const [r, c] = selectedCell;
    if (userGrid[r][c].isLockedColor) return;

    const newGrid = [...userGrid];
    const cell = { ...newGrid[r][c] };

    if (color === null) {
      cell.color = null;
      cell.isError = false;
    } else if (isPencilMode) {
      const notes = cell.colorNotes || [];
      cell.colorNotes = notes.includes(color) ? notes.filter((n: string) => n !== color) : [...notes, color];
    } else {
      cell.color = color;
      cell.isError = false;
    }
    newGrid[r][c] = cell;
    setUserGrid(newGrid);
  };

  const checkSolution = () => {
    if (!userGrid || !levelData) return;
    let allCorrect = true;
    let newErrors = 0;
    const newGrid = userGrid.map((row, r) => row.map((cell, c) => {
      const sol = levelData.grid[r][c];
      const numMatch = cell.number === sol.solutionNumber;
      const colMatch = cell.color === sol.solutionColor;
      
      if (!numMatch || !colMatch) {
        allCorrect = false;
        if (cell.number !== null || cell.color !== null) newErrors++;
        return { ...cell, isError: (cell.number !== null || cell.color !== null) };
      }
      return { ...cell, isError: false };
    }));

    setUserGrid(newGrid);
    if (allCorrect) {
      setIsCompleted(true);
      setIsTimerActive(false);
      setValidationResult('CORRECT');
    } else {
      setErrors(e => e + (newErrors > 0 ? 1 : 0));
      setValidationResult('WRONG');
    }
    setShowResult(true);
  };

  const handleShare = async () => {
    const text = `HorSudoku ${currentDate.toLocaleDateString()}\n⏱️ ${formatTime(timeSpent)}\nErrors: ${errors}\n✅ Solved`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Result copied!");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text; document.body.appendChild(textArea);
      textArea.select(); document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("Result copied!");
    }
  };

  const generateCalendarDays = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const earliest = parseConfigDate(EARLIEST_DATE);
    const days = [];
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    for(let d = 1; d <= end.getDate(); d++) {
        const iterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
        const isDisabled = iterDate > today || iterDate < earliest;
        const isSelected = isSameDay(iterDate, currentDate);
        const solved = localStorage.getItem(getStorageKey(iterDate.toDateString()))?.includes('"isCompleted":true');
        days.push(
            <div key={d} className={`calendar-day ${isSelected ? 'selected' : ''} ${solved ? 'solved' : ''} ${isDisabled ? 'disabled' : ''}`}
                 onClick={() => { if(!isDisabled) { setCurrentDate(iterDate); setShowCalendar(false); }}}>
                {d}
            </div>
        );
    }
    return days;
  };

  if (loadError) return <div className="horsudoku-container"><h2>Error</h2><p>{loadError}</p></div>;
  if (!levelData || !userGrid) return <div className="loading">Initializing System...</div>;

  return (
    <div className="horsudoku-container">
      <div className="game-info-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={() => setShowCalendar(true)}>📅 {currentDate.toLocaleDateString()}</button>
      </div>

      <h1>Hor Sudoku</h1>

      <div className="sudoku-board-wrapper">
        <div className="sudoku-grid" style={{ gridTemplateColumns: `repeat(${levelData.size}, 1fr)` }}>
          {userGrid.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} 
                 className={`sudoku-cell ${selectedCell?.[0] === r && selectedCell?.[1] === c ? 'selected' : ''} ${cell.isLockedNumber ? 'locked-number' : ''} ${cell.isError ? 'error' : ''}`}
                 style={{ backgroundColor: cell.color ? COLOR_MAP[cell.color] : 'var(--hs-empty-bg)' }}
                 onClick={() => handleCellClick(r, c)}>
                {cell.number}
                {cell.number === null && (
                    <div className="cell-notes">
                        {Array.from({length: 9}, (_, i) => i + 1).map(n => (
                            <div key={n} className="note-num">{cell.notes?.includes(n) && n <= levelData.size ? n : ''}</div>
                        ))}
                        <div className="note-colors">
                            {cell.colorNotes?.map((col: string) => (
                                <div key={col} className="note-dot" style={{backgroundColor: COLOR_MAP[col]}} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )))}
        </div>
      </div>

      <div className="controls-area">
         <div className="control-group">
            {Array.from({length: levelData.size}, (_, i) => i + 1).map(num => (
               <button key={num} className="btn-input" onClick={() => handleInputNumber(num)}>{num}</button>
            ))}
            <button className="btn-input" onClick={() => handleInputNumber(null)}>X</button>
         </div>
         <div className="control-group">
            {['A','B','C','D','E','F','G','H','I'].slice(0, levelData.size).map(char => (
               <div key={char} className="btn-color" style={{ backgroundColor: COLOR_MAP[char] }} onClick={() => handleInputColor(char)} />
            ))}
            <button className="btn-no-col" onClick={() => handleInputColor(null)}>No Col</button>
         </div>

         {!isCompleted ? (
            <button className="btn-primary" onClick={checkSolution}>VERIFY SOLUTION</button>
         ) : (
            <div className="completed-panel">
                <h3>LEVEL COMPLETE</h3>
                <div className="final-time">⏱️ {formatTime(timeSpent)}</div>
                <button className="btn-secondary" style={{width: '100%', marginTop: '10px'}} onClick={handleShare}>Copy Result</button>
            </div>
         )}
         <button className={`btn-pencil ${isPencilMode ? 'active' : ''}`} onClick={() => setIsPencilMode(!isPencilMode)}>✏️ Pencil Mode {isPencilMode ? 'ON' : 'OFF'}</button>
      </div>

      <div className="rules-section">
        <h3>How to Play</h3>
        <ul>
            <li><strong>Unique Regions:</strong> Every Row, Column, and Color Region must contain unique numbers (1-{levelData.size}).</li>
            <li><strong>Deduction:</strong> Some cells are empty, showing only number, or only color. Use logic to find both.</li>
        </ul>
      </div>

      {showCalendar && (
         <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
            <div className="calendar-content" onClick={e => e.stopPropagation()}>
               <h3>Select Date</h3>
               <div className="calendar-grid">{generateCalendarDays()}</div>
               <button className="btn-secondary" style={{width:'100%', marginTop: '15px'}} onClick={() => setShowCalendar(false)}>Close</button>
            </div>
         </div>
      )}

      {showResult && (
         <div className="modal-overlay">
            <div className="modal-content">
               {validationResult === 'CORRECT' ? (
                  <>
                     <h2 style={{color: '#4caf50'}}>LEVEL COMPLETE</h2>
                     <div className="stats-display">
                        <div className="stat-item"><span>Time</span><span className="stat-value">{formatTime(timeSpent)}</span></div>
                        <div className="stat-item"><span>Errors</span><span className="stat-value">{errors}</span></div>
                     </div>
                     <button className="btn-primary" onClick={() => setShowResult(false)}>Close</button>
                  </>
               ) : (
                  <>
                     <h2 style={{color: '#ff6b6b'}}>INCORRECT</h2>
                     <p>Check your logic and try again.</p>
                     <button className="btn-secondary" onClick={() => { setShowResult(false); setIsTimerActive(true); }}>Retry</button>
                  </>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default HorSudoku;