import { Routes, Route } from "react-router-dom";
import './App.css';

// Import Games
import { SymbiomesGame } from './games/symbiomes/SymbiomesGame';
import { NeonProtocol } from './games/neon-protocol/NeonProtocol';
import { LogicGems } from './games/logic-gems/LogicGems';
import { GridKnot } from './games/grid-knot/GridKnot';

// Import Home
import { Home } from './Home';

function App() {
  return (
    <Routes>
      {/* Main Landing Page */}
      <Route path="/" element={<Home />} />
      
      {/* Game Routes */}
      <Route path="/symbiomes" element={<SymbiomesGame />} />
      <Route path="/neon-protocol" element={<NeonProtocol />} />
      <Route path="/logic-gems" element={<LogicGems />} />
      <Route path="/grid-knot" element={<GridKnot />} />
    </Routes>
  );
}

export default App;