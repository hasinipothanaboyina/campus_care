import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically destroy any broken Supabase locks left by a hanging tab
Object.keys(localStorage).forEach(key => {
  if (key.includes('sb-') && key.includes('-auth-token')) {
    // We do NOT want to clear the auth token, only locks if they exist
  } else if (key.includes('supabase.auth.lock')) {
    localStorage.removeItem(key);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
