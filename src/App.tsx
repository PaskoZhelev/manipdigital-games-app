import { Routes, Route } from "react-router-dom";
import './App.css';

// Import Games
import { SymbiomesGame } from './games/symbiomes/SymbiomesGame';
import { NeonProtocol } from './games/neon-protocol/NeonProtocol';
import { LogicGems } from './games/logic-gems/LogicGems';

// Import Home
import { Home } from './Home';
import WildLiesGame from "./games/wild-lies/WildLiesGame";

function App() {
  return (
    <Routes>
      {/* Main Landing Page */}
      <Route path="/" element={<Home />} />
      
      {/* Game Routes */}
      <Route path="/symbiomes" element={<SymbiomesGame />} />
      <Route path="/neon-protocol" element={<NeonProtocol />} />
      <Route path="/logic-gems" element={<LogicGems />} />
      <Route path="/wild-lies" element={<WildLiesGame />} />
    </Routes>
  );
}

export default App;