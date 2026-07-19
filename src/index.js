import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './pages/LandingPage';
import IntegrationCallback from './pages/IntegrationCallback';
import { ThemeProvider } from './theme/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

const hostname = window.location.hostname;

const isAppDomain =
  hostname === 'app.osflow.pt' ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1';

const isIntegrationCallbackRoute =
  window.location.pathname === '/integrations/callback';

root.render(
  isIntegrationCallbackRoute ? (
    <ThemeProvider>
      <IntegrationCallback />
    </ThemeProvider>
  ) : isAppDomain ? (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ) : (
    <LandingPage />
  )
);

/*const isLandingRoute =
  window.location.pathname === '/landing';

  root.render(
  isIntegrationCallbackRoute ? (
    <ThemeProvider>
      <IntegrationCallback />
    </ThemeProvider>
  ) : isLandingRoute ? (
    <LandingPage />
  ) : (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
);*/