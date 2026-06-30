// Polyfill globalThis for older Smart TV browsers (e.g., older Tizen / WebOS)
if (typeof globalThis === "undefined") {
  (window as any).globalThis = window;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
