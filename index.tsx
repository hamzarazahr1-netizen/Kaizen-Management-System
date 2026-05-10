
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global error handling for better debugging in production
window.onerror = (message, source, lineno, colno, error) => {
  rootElement.innerHTML = `
    <div style="padding: 20px; color: #ef4444; font-family: sans-serif; text-align: center; margin-top: 20vh;">
      <h1 style="font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">System Error</h1>
      <p style="font-size: 14px; color: #64748b;">The application failed to initialize. Details:</p>
      <code style="display: block; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; margin-top: 10px; font-size: 12px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">${message}</code>
      <button onclick="window.location.reload()" style="margin-top: 20px; background: #0f172a; color: white; border: none; padding: 10px 20px; font-weight: 800; text-transform: uppercase; cursor: pointer; border-radius: 4px;">Restart Application</button>
    </div>
  `;
  return false;
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
