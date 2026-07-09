import React, { useState, useEffect } from 'react';
import { useAppStore } from './lib/store';
import LoginScreen from './components/LoginScreen';
import LecturerDashboard from './components/LecturerDashboard';
import StudentDashboard from './components/StudentDashboard';
import UpdateNotifier from './components/UpdateNotifier';
import VersionDisplay from './components/VersionDisplay';

export default function App() {
  const { isLoggedIn, isLoading, currentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="w-full h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Syncing with D1 database...</p>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return <><UpdateNotifier /><LoginScreen /><VersionDisplay /></>;
  }

  if (currentUser.role === 'lecturer') {
    return <><UpdateNotifier /><LecturerDashboard /><VersionDisplay /></>;
  }

  return <><UpdateNotifier /><StudentDashboard /><VersionDisplay /></>;
}
