import React, { useState, useEffect, useMemo, useRef } from 'react';
import './TotemOrigins.css'; 

// --- TYPES ---
type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
type Shape = 'SQUARE' | 'CIRCLE' | 'TRIANGLE' | 'STAR';
type Pips = 1 | 2 | 3;

interface Piece {
  id: string; 
  color: Color;
  shape: Shape;
  pips: Pips;
}

interface LevelData {
  difficulty: number;
  solution: string[]; 
  examples: {
    true_koan: { color: string, shape: string, pips: number }[];
    false_koan: { color: string, shape: string, pips: number }[];
  };
}

type MonthlyLevels = Record<string, LevelData>;

interface SavedTotemProgress {
  history: { pieces: Piece[], result: boolean }[];
  userGuess: string[];
  isSolved: boolean;
  currentBuild: Piece[];
  timeSpent: number;
  submissionCount: number;
  lastPlayed: number;
}

// --- CONFIGURATION ---
const STORAGE_KEY = 'totem_origins_progress';

const DROPDOWN_OPTIONS = [
  [
    "At least one piece",
    "All pieces",
    "No pieces",
    "The total count",
    "The sum of pips",
    "All RED pieces",
    "All BLUE pieces",
    "All GREEN pieces",
    "All YELLOW pieces",
    "All SQUARE pieces",
    "All CIRCLE pieces",
    "All TRIANGLE pieces",
    "All STAR pieces"
  ],
  [
    "is / are",
    "contains",
    "equals"
  ],
  [
    "RED", "BLUE", "GREEN", "YELLOW",
    "SQUARE", "CIRCLE", "TRIANGLE", "STAR",
    "1", "2", "3", "4", "5",
    "ODD", "EVEN",
    "RED SQUARE", "RED CIRCLE", "RED TRIANGLE", "RED STAR",
    "BLUE SQUARE", "BLUE CIRCLE", "BLUE TRIANGLE", "BLUE STAR",
    "GREEN SQUARE", "GREEN CIRCLE", "GREEN TRIANGLE", "GREEN STAR",
    "YELLOW SQUARE", "YELLOW CIRCLE", "YELLOW TRIANGLE", "YELLOW STAR"
  ]
];

// --- HELPER: Rule Evaluation Engine ---
const evaluateRule = (koan: Piece[], ruleParts: string[]): boolean => {
  if (ruleParts.length !== 3) return false;
  const [subject, verb, value] = ruleParts;

  const colors = koan.map(p => p.color);
  const shapes = koan.map(p => p.shape);
  const totalPips = koan.reduce((acc, p) => acc + p.pips, 0);
  const count = koan.length;

  if (subject === "At least one piece") {
    if (["RED","BLUE","GREEN","YELLOW"].includes(value)) return colors.includes(value as Color);
    if (["SQUARE","CIRCLE","TRIANGLE","STAR"].includes(value)) return shapes.includes(value as Shape);
    const [c, s] = value.split(" ");
    if (c && s) return koan.some(p => p.color === c && p.shape === s);
  }

  if (subject === "All pieces") {
    if (count === 0) return false; 
    if (["RED","BLUE","GREEN","YELLOW"].includes(value)) return koan.every(p => p.color === value);
    if (["SQUARE","CIRCLE","TRIANGLE","STAR"].includes(value)) return koan.every(p => p.shape === value);
  }
  
  if (subject === "No pieces") {
    if (["RED","BLUE","GREEN","YELLOW"].includes(value)) return !colors.includes(value as Color);
    if (["SQUARE","CIRCLE","TRIANGLE","STAR"].includes(value)) return !shapes.includes(value as Shape);
  }

  if (subject === "The sum of pips") {
    if (value === "EVEN") return totalPips % 2 === 0;
    if (value === "ODD") return totalPips % 2 !== 0;
    if (!isNaN(Number(value))) return totalPips === Number(value);
  }
  if (subject === "The total count") return count === Number(value);

  if (subject.startsWith("All ") && subject.endsWith(" pieces")) {
     const targetType = subject.split(" ")[1];
     const relevantPieces = koan.filter(p => p.color === targetType || p.shape === targetType);
     if (relevantPieces.length === 0) return true; 
     return relevantPieces.every(p => p.color === value || p.shape === value);
  }

  return false;
};

const getAllProgress = (): Record<string, SavedTotemProgress> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
};

// --- VISUAL COMPONENTS ---

const ShapeIcon = ({ shape, color }: { shape: Shape, color: string }) => {
  switch (shape) {
    case 'SQUARE': return <rect x="15" y="15" width="70" height="70" rx="10" fill={color} />;
    case 'CIRCLE': return <circle cx="50" cy="50" r="40" fill={color} />;
    case 'TRIANGLE': return <polygon points="50,10 90,90 10,90" fill={color} />;
    case 'STAR': return <polygon points="50,5 63,35 98,35 70,57 82,91 50,72 18,91 30,57 2,35 37,35" fill={color} />;
    default: return null;
  }
};

const RenderPiece = React.memo(({ piece, size = 50 }: { piece: Piece, size?: number }) => {
  const colorMap: Record<string, string> = {
    RED: '#e53935', BLUE: '#1e88e5', GREEN: '#43a047', YELLOW: '#fdd835'
  };

  const getShapeOffset = (s: Shape): React.CSSProperties => {
    if (s === 'TRIANGLE') return { paddingTop: '15%' };
    if (s === 'STAR') return { paddingTop: '10%' };
    return {};
  };

  const pipsContent = useMemo(() => {
    const p = piece.pips;
    const pipSize = size * 0.14; 
    
    const dotStyle: React.CSSProperties = { 
        width: pipSize, height: pipSize, 
        background: '#fff', borderRadius: '50%', 
        boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
    };

    const containerStyle: React.CSSProperties = { 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        ...getShapeOffset(piece.shape)
    };

    if(p===1) return (
        <div style={containerStyle}>
            <div style={dotStyle}/>
        </div>
    );
    
    if(p===2) return (
        <div style={containerStyle}>
            <div style={{
                width: '30%', height: '30%', 
                display: 'flex', justifyContent: 'space-between', 
                transform: 'rotate(-45deg)', alignItems: 'center'
            }}>
                <div style={dotStyle}/><div style={dotStyle}/>
            </div>
        </div>
    );
    
    if(p===3) return (
        <div style={containerStyle}>
            <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center', 
                width: size * 0.35, gap: '2px', transform: 'rotate(0deg)'
            }}>
                 <div style={dotStyle}/>
                 <div style={dotStyle}/>
                 <div style={dotStyle}/>
            </div>
        </div>
    );
    return null;
  }, [piece.pips, piece.shape, size]);

  return (
    <div className="totem-piece" style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 3px 2px rgba(0,0,0,0.4))' }}>
        <ShapeIcon shape={piece.shape} color={colorMap[piece.color]} />
      </svg>
      {pipsContent}
    </div>
  );
});

// --- MAIN GAME COMPONENT ---
export const TotemOrigins = () => {
  const getLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalToday());
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthlyLevels, setMonthlyLevels] = useState<MonthlyLevels | null>(null);
  
  const [level, setLevel] = useState<LevelData | null>(null);
  const [history, setHistory] = useState<{ pieces: Piece[], result: boolean }[]>([]);
  const [currentBuild, setCurrentBuild] = useState<Piece[]>([]);
  const [userGuess, setUserGuess] = useState<string[]>(["", "", ""]); 
  const [isSolved, setIsSolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New Stats State
  const [timeSpent, setTimeSpent] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Builder UI State
  const [selColor, setSelColor] = useState<Color>('RED');
  const [selShape, setSelShape] = useState<Shape>('SQUARE');
  const [selPips, setSelPips] = useState<Pips>(1);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  // 1. Fetch Data
  useEffect(() => {
    const fetchMonthData = async () => {
      setIsLoading(true);
      setError(null);
      const [yyyy, mm] = selectedDate.split('-');
      
      if(!yyyy || !mm) return;

      const url = `${import.meta.env.BASE_URL}assets/totem-origins/levels/${mm}.${yyyy}.json`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("No levels found for this month");
        const data: MonthlyLevels = await res.json();
        setMonthlyLevels(data);
      } catch (err) {
        setError("Could not load levels for this month.");
        setMonthlyLevels(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonthData();
  }, [selectedDate.substring(0, 7)]); 

  // 2. Load Level & Progress
  useEffect(() => {
    // Reset timer when switching dates
    setTimerActive(false);

    if (!monthlyLevels) return;

    const day = parseInt(selectedDate.split('-')[2], 10).toString(); 
    const lvl = monthlyLevels[day];

    if (lvl) {
      setLevel(lvl);
      const allProgress = getAllProgress();
      const saved = allProgress[selectedDate];

      if (saved) {
        setHistory(saved.history || []);
        setIsSolved(saved.isSolved || false);
        setUserGuess(saved.userGuess || [DROPDOWN_OPTIONS[0][0], DROPDOWN_OPTIONS[1][0], DROPDOWN_OPTIONS[2][0]]);
        setCurrentBuild(saved.currentBuild || []);
        setTimeSpent(saved.timeSpent || 0);
        setSubmissionCount(saved.submissionCount || 0);
        
        // If not solved, continue timer
        if (!saved.isSolved) setTimerActive(true);
      } else {
        // Init New Level
        setHistory([]);
        setIsSolved(false);
        setUserGuess([DROPDOWN_OPTIONS[0][0], DROPDOWN_OPTIONS[1][0], DROPDOWN_OPTIONS[2][0]]);
        setCurrentBuild([]);
        setTimeSpent(0);
        setSubmissionCount(0);
        setTimerActive(true);
      }
    } else {
      setLevel(null);
    }
  }, [selectedDate, monthlyLevels]);

  // 3. Update Global Completion Set
  useEffect(() => {
     const all = getAllProgress();
     const solvedSet = new Set<string>();
     Object.keys(all).forEach(key => {
         if (all[key].isSolved) solvedSet.add(key);
     });
     setCompletedDates(solvedSet);
  }, [isSolved, selectedDate]);

  // 4. Timer Tick
  useEffect(() => {
    let interval: number;
    if (timerActive && !isSolved) {
        interval = window.setInterval(() => {
            setTimeSpent(t => t + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isSolved]);

  // 5. Save Progress
  useEffect(() => {
    if (!level) return;
    const all = getAllProgress();
    all[selectedDate] = { 
        history, 
        isSolved, 
        userGuess, 
        currentBuild,
        timeSpent,
        submissionCount,
        lastPlayed: Date.now() 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [history, isSolved, userGuess, currentBuild, timeSpent, submissionCount, selectedDate, level]);

  // --- ACTIONS ---

  const handleAddPiece = () => {
    if (currentBuild.length >= 4) return;
    const newPiece: Piece = {
      id: Math.random().toString(36).substr(2, 9),
      color: selColor,
      shape: selShape,
      pips: selPips
    };
    setCurrentBuild([...currentBuild, newPiece]);
  };

  const handleClearBuild = () => {
    setCurrentBuild([]);
  };

  const handleTestKoan = () => {
    if (currentBuild.length === 0 || !level) return;
    const result = evaluateRule(currentBuild, level.solution);
    setHistory(prev => [...prev, { pieces: [...currentBuild], result }]);
    // Keep build to allow tweaking? No, previous behavior was clear.
    setCurrentBuild([]);
  };

  const handleGuessSubmit = () => {
    if (!level) return;
    
    setSubmissionCount(c => c + 1);

    const solution = level.solution;
    const isCorrect = JSON.stringify(userGuess) === JSON.stringify(solution);
    
    if (isCorrect) {
        setIsSolved(true);
        setTimerActive(false);
    }
    else {
        alert("Hypothesis incorrect. Check your research log.");
    }
  };

  const handleShare = async () => {
    const minutes = Math.floor(timeSpent / 60);
    const seconds = (timeSpent % 60).toString().padStart(2, '0');
    const summary = `Totem Origins 🗿\n📅 ${selectedDate}\n✅ Solved in ${minutes}:${seconds}\n📝 Theories: ${submissionCount}`;
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) { console.error(e); }
  };

  const getColorHex = (c: Color) => (c==='YELLOW'?'#fdd835':c==='RED'?'#e53935':c==='BLUE'?'#1e88e5':'#43a047');

  const renderCalendar = () => {
    const [y, m] = selectedDate.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = [];
    for(let d=1; d<=daysInMonth; d++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isDone = completedDates.has(dStr);
        const isSel = dStr === selectedDate;
        days.push(
            <div key={d} className={`calendar-day ${isSel?'selected':''} ${isDone?'solved':''}`} onClick={() => { setSelectedDate(dStr); setShowCalendar(false); }}>
                {d}
            </div>
        );
    }
    return <div className="calendar-grid">{days}</div>;
  };

  if (isLoading && !monthlyLevels) return <div className="loading-screen">Deciphering Totems...</div>;

  return (
    <div className="totem-game-container">
      <div className="totem-header">
         <div className="game-logo">TOTEM <span className="logo-accent">ORIGINS</span></div>
         <div className="date-selector" onClick={() => setShowCalendar(!showCalendar)}>
            📅 {selectedDate} {isSolved && '✨'}
         </div>
      </div>

      {showCalendar && (
         <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
            <div className="calendar-modal" onClick={e => e.stopPropagation()}>
               <h3>Select Expedition Date</h3>
               {renderCalendar()}
            </div>
         </div>
      )}

      {!level ? (
          <div className="error-message">{error ? error : "No expedition found for this date."}</div>
      ) : (
        <>
            <div className="totem-layout">
                {/* INFO PANEL */}
                <div className="totem-panel info-panel">
                    <div className="panel-header">FIELD NOTES</div>
                    <div className="example-group">
                        <div className="ex-label true">MATCHES RULE</div>
                        <div className="koan-box true-box">
                            {level.examples.true_koan.map((p, i) => (
                                <RenderPiece key={`t-${i}`} piece={{...p, id:`t-${i}`} as any} size={40} />
                            ))}
                        </div>
                    </div>
                    <div className="example-group">
                        <div className="ex-label false">VIOLATES RULE</div>
                        <div className="koan-box false-box">
                            {level.examples.false_koan.map((p, i) => (
                                <RenderPiece key={`f-${i}`} piece={{...p, id:`f-${i}`} as any} size={40} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* WORKSPACE PANEL */}
                <div className="totem-panel workspace-panel">
                    <div className="panel-header">CONSTRUCTION SITE</div>
                    
                    {/* BUILD AREA */}
                    <div className="build-area">
                        {currentBuild.length === 0 && <span className="ghost-text">Place totems here...</span>}
                        {currentBuild.map(p => (
                            <div key={p.id} onClick={() => setCurrentBuild(currentBuild.filter(x => x.id !== p.id))} className="clickable-piece">
                                <RenderPiece piece={p} size={70} />
                            </div>
                        ))}
                    </div>

                    {!isSolved && (
                        <div className="controls-area">
                            {/* PALETTE */}
                            <div className="palette-container">
                                
                                {/* 1. SHAPES */}
                                <div className="palette-section">
                                    <div className="category-label">SHAPE</div>
                                    <div className="palette-group">
                                        {(['SQUARE','CIRCLE','TRIANGLE','STAR'] as Shape[]).map(s => (
                                            <button key={s} className={`p-btn ${selShape===s?'active':''}`} onClick={()=>setSelShape(s)}>
                                                <svg viewBox="0 0 100 100" style={{ width: '28px', height: '28px' }}>
                                                    <ShapeIcon shape={s} color={selShape===s ? '#fff' : '#888'} />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. COLORS */}
                                <div className="palette-section">
                                    <div className="category-label">COLOR</div>
                                    <div className="palette-group">
                                        {(['RED','BLUE','GREEN','YELLOW'] as Color[]).map(c => (
                                            <button key={c} className={`p-btn ${selColor===c?'active':''}`} onClick={()=>setSelColor(c)}>
                                                <div style={{
                                                    width: '24px', 
                                                    height: '24px', 
                                                    borderRadius: '6px',
                                                    backgroundColor: getColorHex(c),
                                                    border: selColor===c ? '2px solid #fff' : '2px solid transparent',
                                                    boxSizing: 'border-box',
                                                    flexShrink: 0
                                                }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. PIPS */}
                                <div className="palette-section">
                                    <div className="category-label">PIPS</div>
                                    <div className="palette-group">
                                        {(['1','2','3'] as any[]).map(p => (
                                            <button key={p} className={`p-btn ${selPips===Number(p)?'active':''}`} onClick={()=>setSelPips(Number(p) as Pips)} style={{fontSize: '1.2rem', fontWeight: 'bold'}}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="action-row">
                                <button className="act-btn sec" onClick={handleAddPiece} disabled={currentBuild.length>=4}>
                                    PLACE PIECE
                                </button>
                                <button className="act-btn pri" onClick={handleTestKoan} disabled={currentBuild.length===0}>
                                    TEST
                                </button>
                                <button className="act-btn danger" onClick={handleClearBuild} disabled={currentBuild.length===0}>
                                    CLEAR
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* HISTORY PANEL */}
                <div className="totem-panel history-panel">
                    <div className="panel-header">RESEARCH LOG</div>
                    <div className="history-list">
                        {history.length === 0 && <div className="empty-log">No experiments yet.</div>}
                        {history.map((entry, idx) => (
                            <div key={idx} className="log-entry">
                                <div className="log-index">#{idx + 1}</div>
                                <div className={`status-pill ${entry.result ? 'ok' : 'fail'}`}>
                                    {entry.result ? 'TRUE' : 'FALSE'}
                                </div>
                                <div className="mini-pieces">
                                    {entry.pieces.map(p => <RenderPiece key={p.id} piece={p} size={30} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* GUESS PANEL */}
            <div className="guess-panel">
                <div className="guess-header">FORMULATE THEORY</div>
                {isSolved ? (
                    <div className="victory-message">
                        <h2>🏅 DISCOVERY CONFIRMED</h2>
                        <p>The rule is indeed: <span className="highlight">{userGuess.join(' ')}</span></p>
                        
                        {/* New Stats Display */}
                        <div className="victory-stats">
                            <span>⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                            <span>📝 {submissionCount} Theories</span>
                        </div>

                        {/* New Victory Actions */}
                        <div className="victory-actions">
                             <button className="act-btn sec" onClick={() => setShowCalendar(true)}>
                                Pick Another Date
                             </button>
                             <button className={`act-btn pri ${copyFeedback ? 'copied' : ''}`} onClick={handleShare}>
                                {copyFeedback ? 'Copied!' : 'Share Result'}
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="guess-form">
                        <div className="dropdowns">
                            {DROPDOWN_OPTIONS.map((options, i) => (
                                <select key={i} value={userGuess[i]} onChange={e => {
                                    const next = [...userGuess];
                                    next[i] = e.target.value;
                                    setUserGuess(next);
                                }}>
                                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ))}
                        </div>
                        <button className="submit-btn" onClick={handleGuessSubmit}>PUBLISH THEORY</button>
                    </div>
                )}
            </div>
            
            {/* RULES PANEL */}
            <div className="rules-panel">
                <div className="rules-header">HOW TO PLAY</div>
                <div className="rules-content">
                    <p><strong>Goal:</strong> Discover the hidden rule that governs the totems for this expedition.</p>
                    <ul>
                        <li><strong>1. Observe:</strong> Analyze the "Matches Rule" and "Violates Rule" examples to form an initial hypothesis.</li>
                        <li><strong>2. Experiment:</strong> Construct your own totem sequences in the Construction Site and <strong>TEST</strong> them. The Research Log will tell you if your sequence satisfies the hidden rule.</li>
                        <li><strong>3. Solve:</strong> Once confident, use the dropdowns in "Formulate Theory" to submit your guess (e.g., "At least one piece" + "is" + "RED").</li>
                    </ul>
                    <p className="rules-hint"><em>Rules may involve color, shape, pip counts, or totals.</em></p>
                </div>
            </div>
        </>
      )}
    </div>
  );
};