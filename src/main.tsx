import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Silences third-party share widget errors when the expected DOM node is missing.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const source = event.filename || '';
    if (source.includes('share-modal.js')) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);



