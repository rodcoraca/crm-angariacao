import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './pages/LandingPage';
import IntegrationCallback from './pages/IntegrationCallback';
import { ThemeProvider } from './theme/ThemeContext';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';

function PwaRuntime({ children }) {
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    let mounted = true;

    registerServiceWorker((nextRegistration) => {
      if (mounted) {
        setRegistration(nextRegistration);
      }
    }).then((nextRegistration) => {
      if (mounted && nextRegistration) {
        setRegistration(nextRegistration);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {children}
      <PwaUpdatePrompt registration={registration} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

const hostname = window.location.hostname;

const isLocal =
  hostname === "localhost" ||
  hostname === "127.0.0.1";

const isAppDomain =
  hostname === "app.osflow.pt";

const forceLanding =
  window.location.search.includes("landing");

const isIntegrationCallbackRoute =
  window.location.pathname === "/integrations/callback";

const content = isIntegrationCallbackRoute ? (
  <ThemeProvider>
    <IntegrationCallback />
  </ThemeProvider>
) : isAppDomain || (isLocal && !forceLanding) ? (
  <ThemeProvider>
    <App />
  </ThemeProvider>
) : (
  <LandingPage />
);

root.render(<PwaRuntime>{content}</PwaRuntime>);
