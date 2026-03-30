import React, { useState, useEffect, useRef } from 'react';
import type { WildLiesLevel, PlayerGuesses } from './types/wildLies';
import './WildLiesGame.css';

// --- CONSTANTS ---
const ANIMALS = ['Fox', 'Giraffe', 'Bear', 'Sheep', 'Dog', 'Horse', 'Tiger'];
const STORAGE_KEY = 'wildlies_all_progress';

// --- HELPERS ---
const getFilenameFromDate = (date: Date) => {
  const mm = String(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${import.meta.env.BASE_URL}assets/wild-lies/levels/${mm}.${yyyy}.json`; 
};

// Generates the dictionary key for the master save file
const getDateKey = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

const WildLiesGame: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [level, setLevel] = useState<WildLiesLevel | null>(null);
  const [guesses, setGuesses] = useState<PlayerGuesses>({});
  
  // Stats & Modals
  const [timeSpent, setTimeSpent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [showResult, setShowResult] = useState<'success' | 'failure' | null>(null);
  const [isLevelSolved, setIsLevelSolved] = useState(false); // NEW: Tracks solved state independently of the modal
  const [copied, setCopied] = useState(false); // NEW: Tracks copy button feedback
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Load Level & Restore Saved Data
  useEffect(() => {
    document.title = "Wild Lies";
    const fetchLevel = async () => {
      // Force resets to prevent old UI elements from "sticking"
      setIsLevelSolved(false);
      setShowResult(null);
      setCopied(false);
      setErrors(0);
      setGuesses({});
      setTimeSpent(0);
      try {
        const url = getFilenameFromDate(currentDate);
        const response = await fetch(url);
        const monthData = await response.json();
        const day = currentDate.getDate().toString();
        
        if (monthData[day]) {
          setLevel(monthData[day]);
          
          // Check master save file for this specific date
          const masterSave = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          const dayKey = getDateKey(currentDate);
          const savedData = masterSave[dayKey];

          if (savedData) {
            setGuesses(savedData.guesses);
            setTimeSpent(savedData.timeSpent);
            setErrors(savedData.errors);
            
            if (savedData.isCompleted) {
              setIsLevelSolved(true);
              setShowResult(null); // Keep modal hidden on revisit
            } else {
              setIsLevelSolved(false);
              startTimer();
            }
          } else {
            initializeGuesses(monthData[day].levelSetup.suspectsPlaying);
            startTimer();
          }
        } else {
          setLevel(null);
        }
      } catch (err) {
        console.error("Error loading level:", err);
        setLevel(null);
      }
    };
    
    stopTimer();
    fetchLevel();
    return () => stopTimer();
  }, [currentDate]);

  // 2. Save Progress whenever it changes
  useEffect(() => {
    if (!level || Object.keys(guesses).length === 0) return;
    
    const masterSave = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayKey = getDateKey(currentDate);
    
    masterSave[dayKey] = {
      guesses,
      timeSpent,
      errors,
      isCompleted: isLevelSolved
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(masterSave));
  }, [guesses, timeSpent, errors, isLevelSolved, level, currentDate]);

  const initializeGuesses = (suspects: string[]) => {
    const initial: PlayerGuesses = {};
    suspects.forEach(s => {
      initial[s] = { isCulprit: false, isLiar: false };
    });
    setGuesses(initial);
    setTimeSpent(0);
    setErrors(0);
    setIsLevelSolved(false);
    setShowResult(null);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Interactions
  const toggleGuess = (animal: string, field: 'isCulprit' | 'isLiar') => {
    if (isLevelSolved) return; // Locked if won
    
    setGuesses(prev => {
      const currentAnimalState = prev[animal] || { isCulprit: false, isLiar: false };
      return {
        ...prev,
        [animal]: {
          ...currentAnimalState,
          [field]: !currentAnimalState[field]
        }
      };
    });
  };

  const handleSubmit = () => {
    if (!level || isLevelSolved) return;
    const { culprits, liars } = level.solution;
    
    let isCorrect = true;
    level.levelSetup.suspectsPlaying.forEach(animal => {
      const g = (guesses && guesses[animal]) || { isCulprit: false, isLiar: false };
      const shouldBeCulprit = culprits.includes(animal);
      const shouldBeLiar = liars.includes(animal);

      if (g.isCulprit !== shouldBeCulprit || g.isLiar !== shouldBeLiar) {
        isCorrect = false;
      }
    });

    if (isCorrect) {
      stopTimer();
      setIsLevelSolved(true);
      setShowResult('success'); // Show popup only when first solved
    } else {
      setErrors(prev => prev + 1);
      setShowResult('failure');
    }
  };

  // NEW: Discord formatting
  const handleCopyResult = () => {
    const dateStr = currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = `${Math.floor(timeSpent / 60)}:${(timeSpent % 60).toString().padStart(2, '0')}`;
    const text = `🕵️ Wild Lies • ${dateStr}\n⏱️ Time: ${timeStr}\n❌ Errors: ${errors}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error("Could not copy text: ", err));
  };

  // --- CALENDAR RENDERER ---
  const renderCalendarModal = () => {
    if (!showCalendar) return null;

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Pull the master save once for the whole calendar to check for solved days
    const masterSave = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isFuture = date > new Date(); 
      const isBeforeEarliest = date < new Date(2026, 2, 1); // first of march 2026
      const isSelected = date.toDateString() === currentDate.toDateString();

      const dayKey = getDateKey(date);
      const isSolved = masterSave[dayKey]?.isCompleted || false;

      days.push(
        <div
          key={d}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isSolved ? 'solved' : ''} ${isFuture || isBeforeEarliest ? 'disabled' : ''}`}
          onClick={() => {
            if (!isFuture && !isBeforeEarliest) {
              // 1. Immediately wipe the current state to prevent Save cross-contamination
              setLevel(null);
              setIsLevelSolved(false);
              setShowResult(null);
              setCopied(false);
              setErrors(0);
              setGuesses({});
              setTimeSpent(0);
              
              // 2. Set the new date to trigger the fresh download
              setCurrentDate(date);
              setCalendarViewDate(date);
              setShowCalendar(false);
            }
          }}
        >
          {d}
        </div>
      );
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ minWidth: '320px' }}>
          <h2 style={{ marginTop: 0 }}>Select a Case</h2>
          
          <div className="calendar-header">
            <button className="toggle-btn" onClick={() => setCalendarViewDate(new Date(year, month - 1, 1))}>&lt;</button>
            <h3 style={{ margin: 0 }}>{monthNames[month]} {year}</h3>
            <button className="toggle-btn" onClick={() => setCalendarViewDate(new Date(year, month + 1, 1))}>&gt;</button>
          </div>

          <div className="calendar-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            {days}
          </div>

          <button className="btn-secondary" style={{ marginTop: '20px', width: '100%' }} onClick={() => setShowCalendar(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderStatement = (text: string) => {
    const regex = new RegExp(`(${ANIMALS.join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      if (ANIMALS.some(a => a.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={i} className={`inline-animal inline-animal-${part.toLowerCase()}`}>
            <img src={`${import.meta.env.BASE_URL}assets/wild-lies/animals/${part.toLowerCase()}-small.png`} alt={part} />
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!level) {
    return (
      <div className="wildlies-container">
        <h2>No Case File Found</h2>
        <p>There is no puzzle available for {currentDate.toDateString()}.</p>
        <button className="btn-primary" onClick={() => setShowCalendar(true)}>Select Different Date</button>
        {renderCalendarModal()}
      </div>
    );
  }

  return (
    <div className="wildlies-container">
      {/* Header */}
      <div className="game-header">
        <h1>Wild Lies</h1>
        <div className="level-info">
          <span className="badge badge-culprits">
            Culprits: {level.levelSetup.exactNumberOfCulprits}
          </span>
          <span className="badge badge-liars">
            Liars: {level.levelSetup.possibleNumberOfLiars[0]} 
            {level.levelSetup.possibleNumberOfLiars[0] !== level.levelSetup.possibleNumberOfLiars[1] 
              && ` - ${level.levelSetup.possibleNumberOfLiars[1]}`}
          </span>
        </div>
        <div className="error-display" style={{ marginTop: '10px', color: '#ff9800', fontWeight: 'bold' }}>
          Errors: {errors}
        </div>
      </div>

      {/* Elliptical Play Area */}
      <div className="circle-container">
        {level.levelSetup.suspectsPlaying.map((animal, index) => {
          const total = level.levelSetup.suspectsPlaying.length;
          const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); 

          let radiusX = 460; 
          let radiusY = 300;
          
          if (total === 4) {
             radiusX = 320; 
             radiusY = 280;
          } else if (total === 7) {
             radiusX = 410; 
             radiusY = 340;
          }
          
          if (windowWidth <= 600) {
            radiusX = (windowWidth / 2) - 75; 
            if (total == 7) {
               radiusX = (windowWidth / 2) - 65;  
               radiusY = 400; 
            } else if (total == 6) {
                radiusY = 340; 
            } else {
               radiusY = 280; 
            }
          } else if (windowWidth <= 1000) {
            radiusX = 300;
            radiusY = 350;
          }
          
          const x = Math.cos(angle) * radiusX;
          const y = Math.sin(angle) * radiusY;

          return (
            <div 
              key={animal} 
              className="animal-card"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <img 
                src={`${import.meta.env.BASE_URL}assets/wild-lies/animals/${animal.toLowerCase()}.png`} 
                alt={animal} 
                className="animal-img-large" 
              />
              <div className="statement-box">
                <div className="statement-text">
                  {renderStatement(level.puzzle[animal])}
                </div>
                <div className="card-actions">
                  <button 
                    className={`toggle-btn ${guesses[animal]?.isCulprit ? 'active-culprit' : ''}`}
                    onClick={() => toggleGuess(animal, 'isCulprit')}
                  >
                    Culprit
                  </button>
                  <button 
                    className={`toggle-btn ${guesses[animal]?.isLiar ? 'active-liar' : ''}`}
                    onClick={() => toggleGuess(animal, 'isLiar')}
                  >
                    Liar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW: Solved Panel that sits above the buttons */}
      {isLevelSolved && (
        <div className="solved-summary">
          <h3>🎉 Case Solved!</h3>
          <p>Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')} | Errors: {errors}</p>
          <button className="btn-primary" onClick={handleCopyResult}>
            {copied ? "✅ Copied to Clipboard!" : "📋 Copy Result"}
          </button>
        </div>
      )}

      {/* Footer Controls */}
      <div className="game-footer">
        {/* Hide Submit button if the level is already solved */}
        {!isLevelSolved && (
          <button className="btn-primary action-btn" onClick={handleSubmit}>
            Submit Verdict
          </button>
        )}
        <button className="btn-secondary action-btn" onClick={() => setShowCalendar(true)}>
          Select Date
        </button>
      </div>

      <div className="rules-section">
        <h3>How to Play: Wild Lies</h3>
        <ul>
          <li><strong>The Goal:</strong> Deduce exactly who committed the crime based on the animals' statements. You must determine the culprit(s) and liar(s) to solve the case.</li>
          <li><strong>The Catch:</strong> Some animals are lying! Check the header to see exactly how many Culprits and Liars are in the current case. Sometimes the Liars number will be shown as a range, e.g. 1-2. This means that there might be 1 or 2 Liars in the case.</li>
          <li><strong>Important:</strong> Being a Culprit and being a Liar are two different things. A Culprit might be telling the truth to cover their tracks, and an innocent animal might be lying to protect someone else! But the culprit might also be lying!</li>
          <li><strong>Adjacency Clues:</strong> The animals are sitting at a round table. The first animal is sitting next to the last animal.</li>
          <li><strong>One Solution:</strong> There is always only one solution to the case.</li>
        </ul>
      </div>

      {/* Result Modals */}
      {showResult && (
        <div className="modal-overlay" onClick={() => setShowResult(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {showResult === 'success' ? (
              <>
                <h2>🎉 Case Solved!</h2>
                <div className="stats-grid">
                  <div className="stat"><span>Time:</span> {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
                  <div className="stat"><span>Errors:</span> {errors}</div>
                </div>
                <button className="btn-primary" onClick={handleCopyResult}>
                   {copied ? "✅ Copied!" : "📋 Copy Result"}
                </button>
                <div style={{ marginTop: '15px' }}>
                  <button className="btn-secondary" onClick={() => setShowResult(null)}>Okay</button>
                  <button className="btn-secondary" style={{ marginLeft: '10px' }} onClick={() => { setShowResult(null); setShowCalendar(true); }}>
                    Play Another Day
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>❌ Incorrect Verdict</h2>
                <p>Your deduction has a logical flaw. Review the statements and try again.</p>
                <button className="btn-secondary" onClick={() => setShowResult(null)}>Keep Trying</button>
              </>
            )}
          </div>
        </div>
      )}

      {renderCalendarModal()}

    </div>
  );
};

export default WildLiesGame;