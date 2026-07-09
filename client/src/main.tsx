import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './lib/store';
import { Toaster } from 'sonner';
import App from './App';
import UpdateNotifier from './components/UpdateNotifier';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <UpdateNotifier />
      <App />
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  </React.StrictMode>
);
