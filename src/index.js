import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './pages/LandingPage';
import IntegrationCallback from './pages/IntegrationCallback';
import { ThemeProvider } from './theme/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

const isCrmRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');
const isIntegrationCallbackRoute = window.location.pathname === '/app/integrations/callback';

root.render(
  <React.StrictMode>
    {isIntegrationCallbackRoute ? (
      <ThemeProvider>
        <IntegrationCallback />
      </ThemeProvider>
    ) : isCrmRoute ? (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    ) : (
      <LandingPage />
    )}
  </React.StrictMode>
);
