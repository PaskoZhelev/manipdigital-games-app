import { SymbiomesGame } from './games/symbiomes/SymbiomesGame';
import { Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import { NeonProtocol } from './games/neon-protocol/NeonProtocol';

function App() {

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/symbiomes" replace />} />
      <Route path="/symbiomes" element={<SymbiomesGame />} />
      <Route path="/neon-protocol" element={<NeonProtocol />} />

      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}

export default App;