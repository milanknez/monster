import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';


// Debug pro Capacitor
console.log('Main.tsx loaded');

// Inicializace Google Auth pro nativní platformy
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
}


try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);

  if (!rootElement) {
    document.body.innerHTML = '<div style="color: white; padding: 20px;">Root element not found!</div>';
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  console.log('React app rendered');
} catch (error) {
  console.error('Error rendering app:', error);
  document.body.innerHTML = `<div style="color: white; padding: 20px;">Error: ${error}</div>`;
}
