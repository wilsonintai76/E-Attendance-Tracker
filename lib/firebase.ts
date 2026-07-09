import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDR7NWpfgglGp-wcPsQ_9GjOdEtIYS4cOY",
  authDomain: "safecircle-ea9ca.firebaseapp.com",
  databaseURL: "https://safecircle-ea9ca-default-rtdb.firebaseio.com",
  projectId: "safecircle-ea9ca",
  storageBucket: "safecircle-ea9ca.firebasestorage.app",
  messagingSenderId: "371526707670",
  appId: "1:371526707670:web:839217e56c7adc1f34dc77",
  measurementId: "G-63T93RQ55V"
};

// Initialize Firebase only if config is provided
const isConfigured = true;
const app = isConfigured 
   ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const database = app ? getDatabase(app) : null;
export { isConfigured };
