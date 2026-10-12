import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './styles/index.css';
import App from './App.jsx';
import { detectLocale, loadLocale } from './lib/i18n.jsx';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// erst die Sprache laden, damit nie kurz deutsche Texte aufblitzen
loadLocale(detectLocale())
  .catch(() => {})
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    );
  });
