import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../symbiomes/SymbiomesGame.css'; 
import '../logic-gems/LogicGems.css'; 
import './GridKnot.css';

// --- TYPES ---
interface Point { x: number; y: number; }
interface GridItem { x: number; y: number; color: string; }
interface GridKnotLevel {
  width: number;
  height: number;
  start: Point;
  end: Point;
  items: GridItem[];
}
type MonthlyLevelData = { [day: string]: GridKnotLevel; };

interface SavedKnotProgress {
  hWalls: boolean[][];
  vWalls: boolean[][];
  timeSpent: number;
  errors: number;
  isCompleted: boolean;
  lastPlayed: number;
}

const STORAGE_KEY = 'grid_knot_daily';
const CELL_SIZE = 50; 
const WALL_THICKNESS = 14; 

// --- HELPERS ---
const formatDateForInput = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const getFilenameFromDate = (date: Date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/grid-knot/levels/${mm}.${yyyy}.json`;
};

// --- COMPONENT ---
export const GridKnot: React.FC = () => {
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [level, setLevel] = useState<GridKnotLevel | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Wall State
  const [hWalls, setHWalls] = useState<boolean[][]>([]);
  const [vWalls, setVWalls] = useState<boolean[][]>([]);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(true); // true = draw, false = erase

  const [timeSpent, setTimeSpent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  const [regionStatus, setRegionStatus] = useState<number[][]>([]); 
  
  // Date Picker Ref
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dateKey = useMemo(() => formatDateForInput(targetDate), [targetDate]);

  // --- INIT & GLOBAL EVENTS ---

  useEffect(() => { document.title = "Grid Knot"; }, []);

  // Global Mouse Up to stop dragging anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const fetchLevel = async () => {
      setTimerActive(false);
      setIsLoading(true);
      const dayKey = String(targetDate.getDate());
      
      try {
        const res = await fetch(getFilenameFromDate(targetDate))
            .catch(() => fetch(`${import.meta.env.BASE_URL}assets/grid-knot/levels/default.json`));
        if (!res.ok) throw new Error("Level not found");
        const data: MonthlyLevelData = await res.json();
        const levelData = data[dayKey];
        if (!levelData) throw new Error("Day not found");

        setLevel(levelData);

        const savedAll = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const saved: SavedKnotProgress = savedAll[dateKey];

        const emptyH = Array(levelData.height + 1).fill(false).map(() => Array(levelData.width).fill(false));
        const emptyV = Array(levelData.height).fill(false).map(() => Array(levelData.width + 1).fill(false));

        let loadSaved = false;
        if (saved && saved.hWalls && saved.hWalls.length === levelData.height + 1) {
            if (saved.hWalls[0] && saved.hWalls[0].length === levelData.width) {
                loadSaved = true;
            }
        }

        if (loadSaved) {
           setHWalls(saved.hWalls);
           setVWalls(saved.vWalls);
           setTimeSpent(saved.timeSpent);
           setErrors(saved.errors);
           setIsLevelCompleted(saved.isCompleted);
           if(saved.isCompleted) { setGameStarted(true); setShowResult(false); }
        } else {
           setHWalls(emptyH);
           setVWalls(emptyV);
           setTimeSpent(0);
           setErrors(0);
           setIsLevelCompleted(false);
        }
        setRegionStatus(Array(levelData.height).fill(0).map(() => Array(levelData.width).fill(0)));
      } catch (e) {
        console.error(e);
        setLevel(null);
      } finally { setIsLoading(false); }
    };
    fetchLevel();
  }, [dateKey]);

  useEffect(() => {
    let interval: number;
    if (timerActive && !isLevelCompleted) interval = window.setInterval(() => setTimeSpent(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, isLevelCompleted]);

  useEffect(() => {
    if (!gameStarted || !level) return;
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[dateKey] = { hWalls, vWalls, timeSpent, errors, isCompleted: isLevelCompleted, lastPlayed: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [hWalls, vWalls, timeSpent, isLevelCompleted, gameStarted]);

  // --- INTERACTION LOGIC ---

  const updateHWall = (r: number, c: number, active: boolean) => {
    setHWalls(prev => {
        if (prev[r][c] === active) return prev;
        const next = prev.map(row => [...row]);
        next[r][c] = active;
        return next;
    });
  };

  const updateVWall = (r: number, c: number, active: boolean) => {
    setVWalls(prev => {
        if (prev[r][c] === active) return prev;
        const next = prev.map(row => [...row]);
        next[r][c] = active;
        return next;
    });
  };

  const handleWallMouseDown = (e: React.MouseEvent, r: number, c: number, isHorizontal: boolean, isActive: boolean) => {
    if (isLevelCompleted) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const newMode = !isActive;
    setDragMode(newMode);

    if (isHorizontal) updateHWall(r, c, newMode);
    else updateVWall(r, c, newMode);
  };

  const handleWallMouseMove = (e: React.MouseEvent, r: number, c: number, isHorizontal: boolean) => {
    if (!isDragging || isLevelCompleted) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const THRESHOLD = 3; 

    if (isHorizontal) {
        if (y < THRESHOLD || y > rect.height - THRESHOLD) return;
    } else {
        if (x < THRESHOLD || x > rect.width - THRESHOLD) return;
    }

    if (isHorizontal) updateHWall(r, c, dragMode);
    else updateVWall(r, c, dragMode);
  };

  const handleStart = () => {
    setGameStarted(true);
    if (!isLevelCompleted) setTimerActive(true);
  };
  
  const handleReset = () => {
      if (!level) return;
      const emptyH = Array(level.height + 1).fill(false).map(() => Array(level.width).fill(false));
      const emptyV = Array(level.height).fill(false).map(() => Array(level.width + 1).fill(false));
      setHWalls(emptyH);
      setVWalls(emptyV);
      setRegionStatus(Array(level.height).fill(0).map(() => Array(level.width).fill(0)));
  };

  // --- DATE HANDLING ---
  const handleDateClick = () => {
    if (dateInputRef.current) dateInputRef.current.showPicker();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        const parts = e.target.value.split('-');
        const newDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        setTargetDate(newDate);
        setGameStarted(false); // Reset to start screen for new level
        setShowResult(false);
    }
  };

  // --- SHARE ---
  const handleShare = () => {
      const text = `Grid Knot - ${targetDate.toLocaleDateString()}\n⏱️ ${Math.floor(timeSpent/60)}:${(timeSpent%60).toString().padStart(2,'0')} \nErrors: ${errors}`;
      navigator.clipboard.writeText(text).then(() => alert("Result copied to clipboard!"));
  };

  // --- VALIDATION ---
  const validateBoard = () => {
    if (!level) return;
    const visited = Array(level.height).fill(false).map(() => Array(level.width).fill(false));
    const regions: Point[][] = [];
    
    // 1. Find Regions
    const getRegion = (startX: number, startY: number) => {
        const stack = [{x: startX, y: startY}];
        const regionCells: Point[] = [];
        visited[startY][startX] = true;
        while(stack.length > 0) {
            const curr = stack.pop()!;
            regionCells.push(curr);
            if (curr.y > 0 && !hWalls[curr.y][curr.x] && !visited[curr.y - 1][curr.x]) {
                visited[curr.y-1][curr.x] = true; stack.push({x: curr.x, y: curr.y - 1});
            }
            if (curr.y < level.height - 1 && !hWalls[curr.y + 1][curr.x] && !visited[curr.y + 1][curr.x]) {
                visited[curr.y+1][curr.x] = true; stack.push({x: curr.x, y: curr.y + 1});
            }
            if (curr.x > 0 && !vWalls[curr.y][curr.x] && !visited[curr.y][curr.x - 1]) {
                visited[curr.y][curr.x-1] = true; stack.push({x: curr.x - 1, y: curr.y});
            }
            if (curr.x < level.width - 1 && !vWalls[curr.y][curr.x + 1] && !visited[curr.y][curr.x + 1]) {
                visited[curr.y][curr.x+1] = true; stack.push({x: curr.x + 1, y: curr.y});
            }
        }
        return regionCells;
    };

    for(let y=0; y<level.height; y++) for(let x=0; x<level.width; x++) if(!visited[y][x]) regions.push(getRegion(x, y));

    // 2. Validate Colors
    const itemsByColor: Record<string, Point[]> = {};
    level.items.forEach(item => {
        if(!itemsByColor[item.color]) itemsByColor[item.color] = [];
        itemsByColor[item.color].push({x: item.x, y: item.y});
    });

    let allRegionsValid = true;
    const newStatus = Array(level.height).fill(0).map(() => Array(level.width).fill(0));
    const foundColors = new Set<string>();

    for (const region of regions) {
        const regionItems = region.map(p => level.items.find(i => i.x === p.x && i.y === p.y)).filter(Boolean) as GridItem[];
        if (regionItems.length === 0) continue; 

        const firstColor = regionItems[0].color;
        const mixedColors = regionItems.some(i => i.color !== firstColor);

        if (mixedColors) {
            allRegionsValid = false;
            region.forEach(p => newStatus[p.y][p.x] = -1);
            continue;
        }

        const totalCountForColor = itemsByColor[firstColor].length;
        if (regionItems.length !== totalCountForColor) {
             allRegionsValid = false;
             region.forEach(p => newStatus[p.y][p.x] = -1);
             continue;
        }
        foundColors.add(firstColor);
        region.forEach(p => newStatus[p.y][p.x] = 1); 
    }
    if (Object.keys(itemsByColor).length !== foundColors.size) allRegionsValid = false;

    // 3. Path Connectivity Check
    let pathValid = true;
    for(let y=0; y<=level.height; y++) {
        for(let x=0; x<=level.width; x++) {
             let degree = 0;
             if (x < level.width && hWalls[y][x]) degree++;
             if (x > 0 && hWalls[y][x-1]) degree++;
             if (y < level.height && vWalls[y][x]) degree++;
             if (y > 0 && vWalls[y-1][x]) degree++;

             const isStart = (x === level.start.x && y === level.start.y);
             const isEnd = (x === level.end.x && y === level.end.y);

             if (isStart || isEnd) {
                 if (degree !== 1) pathValid = false; 
             } else {
                 if (degree !== 0 && degree !== 2) pathValid = false; 
             }
        }
    }
    
    setRegionStatus(newStatus);
    if (allRegionsValid && pathValid) {
        setIsLevelCompleted(true);
        setTimerActive(false);
        setShowResult(true);
    } else {
        setErrors(e => e + 1);
        if (!pathValid && allRegionsValid) alert("Regions are correct, but the line must be continuous from S to E!");
    }
  };

  const getItemAt = (x: number, y: number) => level?.items.find(i => i.x === x && i.y === y);
  
  // Hidden input for date picker
  const renderDateInput = () => (
      <input 
        type="date" 
        ref={dateInputRef}
        style={{visibility:'hidden', position:'absolute', top: 0}}
        onChange={handleDateChange}
        value={formatDateForInput(targetDate)}
      />
  );

  if (!level && !isLoading) return <div className="logic-gems-container">Failed to load level. {renderDateInput()}</div>;

  return (
    <div className="logic-gems-container">
        {renderDateInput()}
        
        {!gameStarted && (
            <div className="game-start-overlay">
                <h1 className="game-title-neon" style={{color: '#2979ff', textShadow: '0 0 10px #2979ff'}}>GRID KNOT</h1>
                <div className="date-selector-container">
                    <button className="custom-date-trigger" onClick={handleDateClick}>📅 {targetDate.toLocaleDateString()}</button>
                </div>
                {isLoading ? <p>Loading...</p> : (
                    <button className="btn-primary start-btn" onClick={handleStart}>
                        {isLevelCompleted ? 'View Solution' : 'Start Puzzle'}
                    </button>
                )}
            </div>
        )}

        <div className="game-info-header"><span>Puzzle: 📅 {targetDate.toLocaleDateString()}</span></div>

        <div className={`knot-game-container ${!gameStarted ? 'blurred-content' : ''}`}>
            {level && (
            <div className="knot-board-wrapper">
                <div className="knot-grid" style={{
                    gridTemplateColumns: `repeat(${level.width}, ${WALL_THICKNESS}px ${CELL_SIZE}px) ${WALL_THICKNESS}px`,
                    gridTemplateRows: `repeat(${level.height}, ${WALL_THICKNESS}px ${CELL_SIZE}px) ${WALL_THICKNESS}px`
                }}>
                    {Array.from({length: level.height * 2 + 1}).map((_, gridRowIndex) => {
                        const isVertexRow = gridRowIndex % 2 === 0;
                        const mapY = Math.floor(gridRowIndex / 2);

                        return Array.from({length: level.width * 2 + 1}).map((__, gridColIndex) => {
                             const isVertexCol = gridColIndex % 2 === 0;
                             const mapX = Math.floor(gridColIndex / 2);

                             // VERTEX
                             if (isVertexRow && isVertexCol) {
                                 const isStart = level.start.x === mapX && level.start.y === mapY;
                                 const isEnd = level.end.x === mapX && level.end.y === mapY;
                                 const connected = (mapX < level.width && hWalls[mapY][mapX]) || 
                                                   (mapX > 0 && hWalls[mapY][mapX-1]) ||
                                                   (mapY < level.height && vWalls[mapY][mapX]) ||
                                                   (mapY > 0 && vWalls[mapY-1][mapX]);
                                 return (
                                     <div key={`${gridRowIndex}-${gridColIndex}`} className={`knot-vertex ${connected ? 'active':''}`}>
                                         {isStart && <span className="vertex-marker marker-S">S</span>}
                                         {isEnd && <span className="vertex-marker marker-E">E</span>}
                                     </div>
                                 );
                             }

                             // WALLS
                             if (isVertexRow && !isVertexCol) {
                                 const isActive = hWalls[mapY][mapX];
                                 return (
                                     <div 
                                        key={`${gridRowIndex}-${gridColIndex}`}
                                        className={`knot-wall-h ${isActive ? 'active' : ''}`}
                                        onMouseDown={(e) => handleWallMouseDown(e, mapY, mapX, true, isActive)}
                                        onMouseMove={(e) => handleWallMouseMove(e, mapY, mapX, true)}
                                     />
                                 );
                             }

                             if (!isVertexRow && isVertexCol) {
                                 const isActive = vWalls[mapY][mapX];
                                 return (
                                     <div 
                                        key={`${gridRowIndex}-${gridColIndex}`}
                                        className={`knot-wall-v ${isActive ? 'active' : ''}`}
                                        onMouseDown={(e) => handleWallMouseDown(e, mapY, mapX, false, isActive)}
                                        onMouseMove={(e) => handleWallMouseMove(e, mapY, mapX, false)}
                                     />
                                 );
                             }

                             // CELL (IMAGE)
                             if (!isVertexRow && !isVertexCol) {
                                 const item = getItemAt(mapX, mapY);
                                 const status = regionStatus[mapY][mapX];
                                 const statusClass = status === 1 ? 'region-success' : status === -1 ? 'region-error' : '';
                                 return (
                                     <div key={`${gridRowIndex}-${gridColIndex}`} className={`knot-cell ${statusClass}`}>
                                         {item && (
                                            <img 
                                                src={`${import.meta.env.BASE_URL}assets/grid-knot/images/${item.color}.png`}
                                                alt={item.color}
                                                className="knot-item"
                                            />
                                         )}
                                     </div>
                                 );
                             }
                             return null;
                        });
                    })}
                </div>
            </div>
            )}

            {isLevelCompleted && (
                <div className="completion-banner">
                    <h3>🏆 Connected Successfully!</h3>
                    <div className="completion-stats">
                        <span>⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                        <span>Errors: {errors}</span>
                    </div>
                </div>
            )}

            <div className="game-actions">
                {!isLevelCompleted && (
                    <>
                        <button className="btn-secondary" onClick={handleReset}>Reset</button>
                        <button className="btn-primary" onClick={validateBoard}>Check Connections</button>
                    </>
                )}
                {isLevelCompleted && <button className="btn-secondary" onClick={() => { setGameStarted(false); setTimerActive(false); }}>Back to Menu</button>}
            </div>
        </div>

        <div className={`rules-container ${!gameStarted ? 'blurred-content' : ''}`}>
            <div className="rules-box">
                <h3>How to Play</h3>
                <ul>
                    <li><strong>Goal:</strong> Separate the colors into their own regions.</li>
                    <li><strong>Draw Walls:</strong> Drag mouse along the <strong>center</strong> of lines.</li>
                    <li><strong>Continuous Line:</strong> Walls must form a single path from <strong>S (Start)</strong> to <strong>E (End)</strong>.</li>
                    <li>The edge of the grid acts as a wall.</li>
                </ul>
            </div>
        </div>

        {showResult && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2 style={{color: '#2979ff'}}>Puzzle Solved!</h2>
                    <div className="stats-display">
                        <div className="stat-item"><span className="stat-label">Time</span><span className="stat-value">{Math.floor(timeSpent/60)}:{(timeSpent%60).toString().padStart(2,'0')}</span></div>
                    </div>
                    <div className="completion-actions">
                        <button className="btn-share" onClick={handleShare}>Share Result</button>
                        <button className="btn-primary" onClick={handleDateClick}>Select Date</button>
                        <button className="btn-secondary" onClick={() => setShowResult(false)}>Close</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};