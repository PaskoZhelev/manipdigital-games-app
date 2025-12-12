import { Routes, Route } from "react-router-dom";
import './App.css';

// Import Games
import { SymbiomesGame } from './games/symbiomes/SymbiomesGame';
import { NeonProtocol } from './games/neon-protocol/NeonProtocol';
import { LogicGems } from './games/logic-gems/LogicGems';

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
    </Routes>
  );
}

export default App;