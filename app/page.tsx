'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import LoginScreen from '@/components/LoginScreen';
import LecturerDashboard from '@/components/LecturerDashboard';
import StudentDashboard from '@/components/StudentDashboard';

export default function Home() {
  const { isLoggedIn, currentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, display the beautiful Google sign-in portal
  if (!isLoggedIn || !currentUser) {
    return <LoginScreen />;
  }

  // Route to the appropriate dashboard depending on the validated user role
  if (currentUser.role === 'lecturer') {
    return <LecturerDashboard />;
  }

  return <StudentDashboard />;
}

