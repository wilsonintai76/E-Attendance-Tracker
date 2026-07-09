import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore } from './lib/store';
import LoginScreen from './components/LoginScreen';
import UpdateNotifier from './components/UpdateNotifier';
import VersionDisplay from './components/VersionDisplay';

// Code-split the two large dashboards — only downloaded for the relevant role
const LecturerDashboard = lazy(() => import('./components/LecturerDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs text-slate-400 font-medium">{message}</p>
    </div>
  );
}

export default function App() {
  const { isLoggedIn, isLoading, currentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return <LoadingScreen message="Syncing with D1 database..." />;
  }

  if (!isLoggedIn || !currentUser) {
    return <><UpdateNotifier /><LoginScreen /><VersionDisplay /></>;
  }

  if (currentUser.role === 'lecturer') {
    return (
      <>
        <UpdateNotifier />
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <LecturerDashboard />
        </Suspense>
        <VersionDisplay />
      </>
    );
  }

  return (
    <>
      <UpdateNotifier />
      <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
        <StudentDashboard />
      </Suspense>
      <VersionDisplay />
    </>
  );
}
