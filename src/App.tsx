import { SymbiomesGame } from './games/symbiomes/SymbiomesGame';
import { Routes, Route } from "react-router-dom";
import './App.css';

function App() {

  return (
    <Routes>
      <Route path="/symbiomes" element={<SymbiomesGame />} />

      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}

export default App;