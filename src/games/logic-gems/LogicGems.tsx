import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../symbiomes/SymbiomesGame.css'; 
import './LogicGems.css'; 
import '../neon-protocol/NeonProtocol.css'; 

// --- TYPES ---
type Color = 'RED' | 'GREEN' | 'BLUE' | 'YELLOW';
type Shape = 'CIRCLE' | 'SQUARE' | 'TRIANGLE';

interface Piece {
  color: Color | null;
  shape: Shape | null;
}

interface CluePattern {
  color: Color | null;
  shape: Shape | null;
}

// 1. UPDATE the VisualClue interface
interface VisualClue {
  type: 'SINGLE_POINT' | 'DIAGONAL_FULL' | 'FLOATING_LINE' | 'DIAGONAL_PAIR' | 'MULTI_POINT' | 'RELATIVE_SHAPE' | 'ORTHOGONAL_PAIR'; // Added ORTHOGONAL_PAIR
  negative?: boolean;
  row?: number; 
  col?: number;
  pattern?: CluePattern; 
  patterns?: CluePattern[]; 
  is_row?: boolean; 
  direction?: string; 
  top?: CluePattern;
  bottom?: CluePattern;
  // NEW PROPERTIES FOR ORTHOGONAL PAIR
  orientation?: string; // 'HORIZONTAL' | 'VERTICAL'
  first?: CluePattern;
  second?: CluePattern;
  
  constraints?: any[]; 
  parts?: {dr:number, dc:number, pattern: CluePattern}[]; 
}

interface LogicGemsLevel {
  grid_size: number;
  solution: Piece[][]; 
  clues: VisualClue[];
  difficulty?: string;
}

interface SavedGemsProgress {
  boardState: (Piece | null)[][];
  hintsState: (Piece | null)[][];
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
  usedClues: number[]; 
  lastPlayed: number;
}

// Drag Types
type DragSourceType = 'PALETTE' | 'BOARD';
interface DragItem {
  type: DragSourceType;
  piece?: Piece;
  r?: number;
  c?: number;
}

// --- CONSTANTS ---
const STORAGE_KEY = 'logic_gems_daily';
const EARLIEST_ARCHIVE_DATE = '2025-11-01';
const SHAPE_MAP: Record<string, number> = { 'TRIANGLE': 1, 'CIRCLE': 2, 'SQUARE': 3 };
const COLORS: Color[] = ['RED', 'GREEN', 'BLUE'];
const SHAPES: Shape[] = ['SQUARE', 'TRIANGLE', 'CIRCLE'];

// --- HELPERS ---
const getFilenameFromDate = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/logic-gems/levels/${dd}.${mm}.${yyyy}.json`;
};

const formatDateForInput = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const getAllProgress = (): Record<string, SavedGemsProgress> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
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

  const minDate = new Date(minDateStr);
  minDate.setHours(0, 0, 0, 0); 
  const maxDate = new Date(); 
  maxDate.setHours(23, 59, 59, 999); 

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); 
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1); 

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

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
          {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} className="calendar-day-header">{d}</div>)}
          {Array.from({length: startOffset}).map((_, i) => <div key={`empty-${i}`} className="calendar-day empty"></div>)}
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

// --- SUB-COMPONENTS (GemView & ClueVisualizer) ---
const GemView: React.FC<{ piece: Piece | CluePattern, small?: boolean }> = ({ piece, small }) => {
  if (!piece) return null;
  
  if (piece.color && piece.shape) {
    const num = SHAPE_MAP[piece.shape];
    const colorName = piece.color.toLowerCase(); 
    const src = `${import.meta.env.BASE_URL}assets/logic-gems/gems/${colorName} (${num}).png`;
    return <img src={src} alt={`${piece.color} ${piece.shape}`} className={`gem-image ${small ? 'mini' : ''}`} draggable={false} />;
  }
  if (piece.color && !piece.shape) {
    const colorMap: Record<string, string> = { 'RED': '#ff2d2d', 'GREEN': '#00e676', 'BLUE': '#2979ff', 'YELLOW': '#ffea00' };
    return <div className={`gem-color-only ${small ? 'mini' : ''}`} style={{ backgroundColor: colorMap[piece.color] }}>?</div>;
  }
  if (!piece.color && piece.shape) {
    return <div className={`gem-shape-outline shape-${piece.shape} ${small ? 'mini' : ''}`} />;
  }
  return null;
};

// HINT SELECTOR POPUP
const HintSelectorModal: React.FC<{
    onSelect: (piece: Piece | null) => void;
    onClose: () => void;
    position: { x: number, y: number };
}> = ({ onSelect, onClose, position }) => {
    return (
        <div className="hint-modal-overlay" onClick={onClose}>
            <div 
                className="hint-popup" 
                style={{ top: position.y, left: position.x }}
                onClick={e => e.stopPropagation()}
            >
                <div className="hint-popup-title">Place Hint</div>
                <div className="hint-popup-grid">
                    {/* Colors */}
                    {COLORS.map(c => (
                        <div key={c} className="hint-popup-item" onClick={() => onSelect({color: c, shape: null})}>
                            <GemView piece={{color: c, shape: null}} small />
                        </div>
                    ))}
                    {/* Shapes */}
                    {SHAPES.map(s => (
                        <div key={s} className="hint-popup-item" onClick={() => onSelect({color: null, shape: s})}>
                            <GemView piece={{color: null, shape: s}} small />
                        </div>
                    ))}
                    {/* Clear */}
                    <div className="hint-popup-item clear-hint" onClick={() => onSelect(null)}>
                        ✕
                    </div>
                </div>
            </div>
        </div>
    );
};


const ClueVisualizer: React.FC<{ clue: VisualClue, onClick: () => void, isUsed: boolean }> = ({ clue, onClick, isUsed }) => {
  const renderContent = () => {
    if ((clue.type === 'SINGLE_POINT' && clue.pattern) || (clue.type === 'MULTI_POINT' && clue.constraints)) {
       const grid = Array(3).fill(null).map(() => Array(3).fill(null));
       if (clue.type === 'SINGLE_POINT' && clue.row !== undefined && clue.col !== undefined) {
         grid[clue.row][clue.col] = clue.pattern;
       } else if (clue.type === 'MULTI_POINT' && clue.constraints) {
         clue.constraints.forEach(c => {
            if(c.type === 'SINGLE_POINT' && c.row !== undefined && c.col !== undefined) grid[c.row][c.col] = c.pattern;
         });
       }
       return (
         <div className="clue-grid-3x3 full-context">
            {grid.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`} className={`mini-cell ${cell ? 'filled' : ''}`}>
                 {cell && <GemView piece={cell} small />}
              </div>
            )))}
         </div>
       );
    }
    if (clue.type === 'FLOATING_LINE' && clue.patterns) {
      return (
        <div className={`clue-strip ${clue.is_row ? 'horizontal' : 'vertical'}`}>
          {clue.patterns.map((p, i) => i < 3 && (
              <div key={i} className="mini-cell filled-box"><GemView piece={p} small /></div>
          ))}
        </div>
      );
    }

    if (clue.type === 'ORTHOGONAL_PAIR' && clue.first && clue.second) {
        const isVertical = clue.orientation === 'VERTICAL';
        return (
            <div className={`clue-ortho-container ${isVertical ? 'vertical' : 'horizontal'}`}>
                <div className="mini-cell filled-box"><GemView piece={clue.first} small /></div>
                <div className="mini-cell filled-box"><GemView piece={clue.second} small /></div>
            </div>
        );
    }

    if (clue.type === 'DIAGONAL_PAIR' && clue.top && clue.bottom) {
       const isMain = clue.direction === 'MAIN_AXIS'; 
       return (
         <div className="clue-pair-container">
            <div className="pair-row">
               <div className="mini-cell filled-box">{isMain && <GemView piece={clue.top} small />}</div>
               <div className="mini-cell filled-box">{!isMain && <GemView piece={clue.top} small />}</div>
            </div>
            <div className="pair-row">
               <div className="mini-cell filled-box">{!isMain && <GemView piece={clue.bottom} small />}</div>
               <div className="mini-cell filled-box">{isMain && <GemView piece={clue.bottom} small />}</div>
            </div>
         </div>
       );
    }
    if (clue.type === 'RELATIVE_SHAPE' && clue.parts) {
      const rows = clue.parts.map(p => p.dr);
      const cols = clue.parts.map(p => p.dc);
      const height = Math.max(...rows) - Math.min(...rows) + 1;
      const width = Math.max(...cols) - Math.min(...cols) + 1;
      const grid = Array(height).fill(null).map(() => Array(width).fill(null));
      const minR = Math.min(...rows);
      const minC = Math.min(...cols);
      clue.parts.forEach(p => { grid[p.dr - minR][p.dc - minC] = p.pattern; });
      return (
        <div className="clue-relative-grid" style={{ gridTemplateRows: `repeat(${height}, 1fr)`, gridTemplateColumns: `repeat(${width}, 1fr)` }}>
           {grid.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`} className={`mini-cell ${cell ? 'filled-box' : 'transparent'}`}>
                 {cell && <GemView piece={cell} small />}
              </div>
           )))}
        </div>
      );
    }
    if (clue.type === 'DIAGONAL_FULL' && clue.patterns) {
      const isMain = clue.direction === 'MAIN';
      return (
        <div className="clue-grid-3x3 full-context">
           {Array(3).fill(null).map((_, r) => Array(3).fill(null).map((_, c) => {
              let p = null;
              if (isMain && r === c) p = clue.patterns![r];
              else if (!isMain && r + c === 2) p = clue.patterns![r];
              return <div key={`${r}-${c}`} className="mini-cell">{p && <GemView piece={p} small />}</div>
           }))}
        </div>
      );
    }
    return null;
  };
  return (
    <div className={`visual-clue-card ${isUsed ? 'used' : ''} ${clue.negative ? 'negative-clue' : ''}`} onClick={onClick}>
       {renderContent()}
    </div>
  );
};

// --- MAIN COMPONENT ---
export const LogicGems: React.FC = () => {
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [level, setLevel] = useState<LogicGemsLevel | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [board, setBoard] = useState<(Piece | null)[][]>([]);
  const [hints, setHints] = useState<(Piece | null)[][]>([]); 
  const [usedClues, setUsedClues] = useState<Set<number>>(new Set());
  
  const [timeSpent, setTimeSpent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  
  const [showResult, setShowResult] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);

  // New Hint Selection State
  const [activeHintSlot, setActiveHintSlot] = useState<{r: number, c: number, x: number, y: number} | null>(null);

  const dateKey = useMemo(() => formatDateForInput(targetDate), [targetDate]);

  // Drag State
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Document Title
  useEffect(() => {
      document.title = "Logic Gems";
  }, []);

  // Sync Completed Dates
  useEffect(() => {
    const all = getAllProgress();
    const solvedSet = new Set<string>();
    Object.keys(all).forEach(key => {
      if (all[key].isCompleted) solvedSet.add(key);
    });
    setCompletedDates(solvedSet);
  }, [gameStarted, isLevelCompleted]);

  // Load Level
  useEffect(() => {
    const fetchLevel = async () => {
      // STOP TIMER while loading new level
      setTimerActive(false);
      setIsLoading(true);
      
      const filename = getFilenameFromDate(targetDate);
      const saved = getAllProgress()[dateKey];
      try {
        const res = await fetch(filename).catch(() => fetch(`${import.meta.env.BASE_URL}assets/logic-gems/levels/default.json`));
        if (!res.ok) throw new Error("Load failed");
        const data: LogicGemsLevel = await res.json();
        setLevel(data);
        
        if (saved) {
           setBoard(saved.boardState);
           setHints(saved.hintsState || Array(data.grid_size || 3).fill(null).map(() => Array(data.grid_size || 3).fill(null)));
           setTimeSpent(saved.timeSpent);
           setErrors(saved.errors);
           setIsLevelCompleted(saved.isCompleted);
           setUsedClues(new Set(saved.usedClues));
           
           if(saved.isCompleted) {
              setGameStarted(true);
              setShowResult(true);
              setTimerActive(false);
           } else {
              // FIX: If saved but NOT completed, force user to "Play Puzzle" to resume timer.
              // Previously this set gameStarted(true) skipping the start logic.
              setGameStarted(false); 
              setTimerActive(false);
           }
        } else {
           setBoard(Array(data.grid_size || 3).fill(null).map(() => Array(data.grid_size || 3).fill(null)));
           setHints(Array(data.grid_size || 3).fill(null).map(() => Array(data.grid_size || 3).fill(null)));
           setTimeSpent(0); 
           setErrors(0); 
           setUsedClues(new Set()); 
           setIsLevelCompleted(false); 
           setGameStarted(false);
           setTimerActive(false);
        }
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    fetchLevel();
  }, [dateKey]);

  // Timer Logic
  useEffect(() => {
    let interval: number;
    if (timerActive && !isLevelCompleted) {
        interval = window.setInterval(() => {
            setTimeSpent(t => t + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isLevelCompleted]);

  // Save Progress
  useEffect(() => {
    if (!gameStarted || !level) return;
    const all = getAllProgress();
    all[dateKey] = { 
        boardState: board, 
        hintsState: hints, 
        timeSpent, 
        errors, 
        isCompleted: isLevelCompleted, 
        usedClues: Array.from(usedClues), 
        lastPlayed: Date.now() 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [board, hints, timeSpent, isLevelCompleted, usedClues, gameStarted]);

  // --- ACTIONS ---

  const handleShare = async () => {
    const minutes = Math.floor(timeSpent / 60);
    const seconds = (timeSpent % 60).toString().padStart(2, '0');
    const summary = `Logic Gems 💎\n📅 ${targetDate.toLocaleDateString()}\n✅ Solved in ${minutes}:${seconds}\n🛑 Errors: ${errors}`;
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setShowResult(false);
    setTimerActive(false);
  };

  const handleStart = () => {
     if(isLevelCompleted) {
        setShowResult(true);
        setTimerActive(false);
     }
     else {
        setTimerActive(true);
     }
     setGameStarted(true);
  };

  // --- DRAG LOGIC ---
  const executeMove = (item: DragItem, targetR: number, targetC: number) => {
    const newBoard = board.map(row => [...row]);
    const newHints = hints.map(row => [...row]);
    
    if (item.type === 'PALETTE' || item.type === 'BOARD') {
       if (item.piece) { // From Palette
           newBoard[targetR][targetC] = item.piece;
           newHints[targetR][targetC] = null; // Clear hint if gem placed
       } else if (item.r !== undefined && item.c !== undefined) { // From Board (Move)
           if (item.r === targetR && item.c === targetC) return;
           const sourcePiece = newBoard[item.r][item.c];
           const targetPiece = newBoard[targetR][targetC];
           
           newBoard[targetR][targetC] = sourcePiece;
           newBoard[item.r][item.c] = targetPiece;
           
           // Clear hint at target
           if (sourcePiece) newHints[targetR][targetC] = null;
       }
       setBoard(newBoard);
       setHints(newHints);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    if (isLevelCompleted) { e.preventDefault(); return; }
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
    if (isLevelCompleted) return;
    setDragOverCell(`${r}-${c}`);
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!dragItem || isLevelCompleted) return;
    executeMove(dragItem, r, c);
    setDragItem(null);
  };
  
  const handleDragEnd = () => {
    setDragItem(null);
    setDragOverCell(null);
  };

  const handleTouchStart = (item: DragItem) => { if (!isLevelCompleted) setDragItem(item); };
  
  const handleTouchMove = (e: React.TouchEvent) => {
     if (!dragItem || isLevelCompleted) return;
     if(e.cancelable) e.preventDefault();
     const touch = e.touches[0];
     const target = document.elementFromPoint(touch.clientX, touch.clientY);
     const slot = target?.closest('.board-slot');
     if (slot) {
        const r = slot.getAttribute('data-r');
        const c = slot.getAttribute('data-c');
        if (r && c) setDragOverCell(`${r}-${c}`);
     } else setDragOverCell(null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
     if (!dragItem || isLevelCompleted) return;
     if (dragOverCell) {
        const [r, c] = dragOverCell.split('-').map(Number);
        executeMove(dragItem, r, c);
     }
     setDragOverCell(null);
     setDragItem(null);
  };

  // --- HINT LOGIC ---
  const handleCellClick = (e: React.MouseEvent, r: number, c: number) => {
    if (isLevelCompleted) return;
    // Only allow hint popup if there isn't a real gem
    if (board[r][c]) return;

    // Calculate position for popup (centered on click or cell)
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    setActiveHintSlot({ r, c, x, y });
  };

  const handleSelectHint = (piece: Piece | null) => {
      if (!activeHintSlot) return;
      const { r, c } = activeHintSlot;
      const newHints = hints.map(row => [...row]);
      newHints[r][c] = piece;
      setHints(newHints);
      setActiveHintSlot(null);
  };

  const checkSolution = () => {
    if(!level || !level.solution) {
        alert("Level data missing solution. Please regenerate.");
        return;
    }
    let isFull = true;
    for(let r=0; r<3; r++) for(let c=0; c<3; c++) if(!board[r][c]) isFull = false;
    if(!isFull) { alert("Fill the entire board before checking!"); return; }

    let correct = true;
    for(let r=0; r<3; r++) for(let c=0; c<3; c++) {
       const userP = board[r][c];
       const solP = level.solution[r][c];
       if (!userP || !solP || userP.color !== solP.color || userP.shape !== solP.shape) { correct = false; break; }
    }
    if (correct) { 
        setIsLevelCompleted(true); 
        setTimerActive(false); 
        setShowResult(true); 
    } 
    else { setErrors(e => e + 1); alert("Incorrect arrangement."); }
  };

  const palette = useMemo(() => {
     const p: Piece[] = [];
     COLORS.forEach(c => SHAPES.forEach(s => p.push({color: c, shape: s})));
     return p;
  }, []);

  const isPieceOnBoard = (piece: Piece) => board.some(row => row.some(p => p?.color === piece.color && p?.shape === piece.shape));

  return (
    <div className="logic-gems-container neon-container">
       {!gameStarted && (
        <div className="game-start-overlay">
          <h1 className="game-title-neon" style={{color: '#4caf50', textShadow: '0 0 10px #4caf50'}}>LOGIC GEMS</h1>
          <div className="date-selector-container">
            <button className="custom-date-trigger" onClick={() => setShowCalendar(true)}>
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

          {isLoading ? <p>Loading...</p> : <button className="btn-primary start-btn" onClick={handleStart}>
              {isLevelCompleted ? 'View Solution' : 'Play Puzzle'}
          </button>}
        </div>
      )}

      <div className="game-info-header">
         <span className="level-date-display">Puzzle: 📅 {targetDate.toLocaleDateString()}</span>
      </div>

      <div className={`gems-game-layout ${!gameStarted ? 'blurred-content' : ''}`}>
         <div style={{display:'flex', flexDirection:'column', gap: '20px', alignItems:'center'}}>
            
            {/* PALETTE */}
            <div className="gem-palette">
               {palette.map((p, i) => (
                  <div 
                     key={i} 
                     className={`palette-item ${isPieceOnBoard(p) ? 'placed-on-board' : ''}`}
                     draggable={!isLevelCompleted}
                     onDragStart={(e) => handleDragStart(e, {type: 'PALETTE', piece: p})}
                     onDragEnd={handleDragEnd}
                     onTouchStart={() => handleTouchStart({type: 'PALETTE', piece: p})}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}
                  >
                     <GemView piece={p} />
                  </div>
               ))}
            </div>

            {/* BOARD */}
            <div className="gem-board-container">
               <div className="gem-board-grid">
                  {board.map((row, r) => row.map((cell, c) => (
                     <div 
                        key={`${r}-${c}`} 
                        className={`board-slot ${dragOverCell === `${r}-${c}` ? 'drag-over' : ''}`}
                        data-r={r} 
                        data-c={c} 
                        onDragOver={(e) => handleDragOver(e, r, c)}
                        onDrop={(e) => handleDrop(e, r, c)}
                        onDragLeave={() => setDragOverCell(null)}
                        onClick={(e) => handleCellClick(e, r, c)}
                     >
                        {/* Render Real Gem */}
                        {cell && (
                           <div 
                             className="placed-gem"
                             draggable={!isLevelCompleted}
                             onDragStart={(e) => handleDragStart(e, {type: 'BOARD', r, c})}
                             onDragEnd={handleDragEnd}
                             onTouchStart={() => handleTouchStart({type: 'BOARD', r, c})}
                             onTouchMove={handleTouchMove}
                             onTouchEnd={handleTouchEnd}
                             onClick={e => e.stopPropagation()} // Prevent opening hint menu on real gem
                           >
                              <GemView piece={cell} />
                           </div>
                        )}
                        {/* Render Hint (only if no Real Gem) */}
                        {!cell && hints[r][c] && (
                            <div className="hint-marker">
                                <GemView piece={hints[r][c]!} small />
                            </div>
                        )}
                     </div>
                  )))}
               </div>
            </div>
            
            {/* INSTRUCTION TEXT for hints */}
            {!isLevelCompleted && (
                <div style={{fontSize: '0.85rem', color: '#666', marginTop: '-10px', fontStyle: 'italic'}}>
                    Click an empty slot to place a hint.
                </div>
            )}

            <div className="game-actions">
               {isLevelCompleted ? (
                   <>
                      <button className="btn-secondary" onClick={handleBackToMenu}>Pick Another Date</button>
                      <button className={`btn-primary btn-share ${copyFeedback?'copied':''}`} onClick={handleShare}>
                          {copyFeedback ? 'Copied!' : 'Share Result'}
                      </button>
                   </>
               ) : (
                   <>
                      <button className="btn-secondary" onClick={() => {
                          setBoard(Array(3).fill(null).map(()=>Array(3).fill(null)));
                          setHints(Array(3).fill(null).map(()=>Array(3).fill(null)));
                          setUsedClues(new Set());
                      }}>Reset</button>
                      <button className="btn-primary" onClick={checkSolution}>Check</button>
                   </>
               )}
            </div>
         </div>

         <div className="clue-scroll-container">
            {level?.clues.map((clue, idx) => (
               <ClueVisualizer key={idx} clue={clue} isUsed={usedClues.has(idx)}
                  onClick={() => { const next = new Set(usedClues); if(next.has(idx)) next.delete(idx); else next.add(idx); setUsedClues(next); }} />
            ))}
         </div>
      </div>
      
      {/* RULES SECTION */}
      <div className={`rules-container ${!gameStarted ? 'blurred-content' : ''}`}>
        <div className="rules-box">
            <h3>📖 How to Play</h3>
            <ul>
                <li><strong>Objective:</strong> Place all 9 gems into the 3x3 grid correctly.</li>
                <li><strong>No Duplicates:</strong> Each gem has a unique combination of <strong>Color</strong> and <strong>Shape</strong>.</li>
                <li><strong>Use Hints:</strong> Click an empty square to place a temporary color/shape hint.</li>
                <li><strong>Check:</strong> Once the board is full, click "Check" to see if you solved it.</li>
            </ul>
        </div>
        <div className="rules-box">
            <h3>🧩 Understanding Clues</h3>
            <ul>
                <li><strong>3x3 Grids:</strong> Show the exact position of a gem or pattern.</li>
                <li><strong>Pairs:</strong> Show two gems that are diagonally adjacent.</li>
                <li><strong>Shapes (L, T, etc):</strong> Show a geometric arrangement of gems. Rotations are NOT allowed.</li>
                <li><strong>Lines:</strong> Shows a row or column of gems (order matters).</li>
                <li><strong style={{color: '#ff5f5f'}}>Red Background:</strong> Means the clue is <strong>NEGATIVE</strong> (This EXACT pattern does NOT exist).</li>
            </ul>
        </div>
      </div>

      {showResult && isLevelCompleted && (
         <div className="modal-overlay">
            <div className="modal-content" style={{textAlign:'center', border: '1px solid #4caf50'}}>
               <h2 style={{color: '#4caf50'}}>SOLVED!</h2>
               <div className="completion-stats"><p>⏱️ {Math.floor(timeSpent/60)}:{(timeSpent%60).toString().padStart(2,'0')}</p><p>🚫 {errors} Errors</p></div>
               <button className="btn-secondary" onClick={() => setShowResult(false)}>Close</button>
            </div>
         </div>
      )}

      {/* HINT POPUP */}
      {activeHintSlot && (
          <HintSelectorModal 
              position={{x: activeHintSlot.x, y: activeHintSlot.y}} 
              onSelect={handleSelectHint} 
              onClose={() => setActiveHintSlot(null)}
          />
      )}

    </div>
  );
};