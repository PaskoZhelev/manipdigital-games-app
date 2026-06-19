import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from "react-router-dom";

const redirect = sessionStorage.redirect;
delete sessionStorage.redirect;

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>
)

// Navigate to the stored route after app loads
if (redirect && redirect !== '/') {
  window.history.replaceState(null, '', import.meta.env.BASE_URL + redirect);
}