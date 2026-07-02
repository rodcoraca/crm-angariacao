import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './pages/LandingPage';
import { ThemeProvider } from './theme/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

const isCrmRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');

root.render(
  <React.StrictMode>
    {isCrmRoute ? (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    ) : (
      <LandingPage />
    )}
  </React.StrictMode>
);
