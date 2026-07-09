'use client';

import React, { useState } from 'react';
import { useAppStore, Role } from '@/lib/store';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, database, isConfigured } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { toast } from 'sonner';
import Image from 'next/image';

export default function LoginScreen() {
  const { loginState, setCurrentUser } = useAppStore();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMockLoading, setIsMockLoading] = useState<Role | null>(null);

  const handleMockLogin = (role: Role) => {
    setIsMockLoading(role);
    if (role === 'lecturer') {
      setCurrentUser({
        id: 'mock-user-wilson',
        name: 'Wilson Intai',
        email: 'wilson@poliku.edu.my',
        avatar: 'https://i.pravatar.cc/150?u=wilson',
        role: 'lecturer'
      });
      toast.success('Logged in as Lecturer (Demo)');
    } else {
      setCurrentUser({
        id: 'mock-user-student',
        name: 'Aiman Hakim',
        email: 'aiman@student.poliku.edu.my',
        avatar: 'https://i.pravatar.cc/150?u=student',
        role: 'student',
        matricNo: '20DKM21F1012',
        classGroup: 'DKM1C',
        enrolledCourses: ['course-1']
      });
      toast.success('Logged in as Student (Demo)');
    }
    loginState(true);
    setIsMockLoading(null);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    
    // Fallback if Firebase auth isn't configured
    if (!isConfigured || !auth) {
      toast.info('No Firebase config provided. Using local mock login.');
      setCurrentUser({
        id: 'mock-user-1',
        name: 'Wilson Intai',
        email: 'wilson@poliku.edu.my',
        avatar: 'https://i.pravatar.cc/150?u=mock',
        role: 'lecturer'
      });
      loginState(true);
      setIsGoogleLoading(false);
      return;
    }

    // Set a timeout of 10 seconds in case the popup hangs in the iframe
    const timeoutId = setTimeout(() => {
      setIsGoogleLoading(false);
      toast.info('Google Sign-In is taking longer than usual. You can sign in instantly using the demo buttons below, or click the "Open in new tab" icon in the top right of the screen!', {
        duration: 12000,
      });
    }, 10000);

    try {
      const provider = new GoogleAuthProvider();
      // Force Google account chooser so users can switch accounts easily if needed
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      clearTimeout(timeoutId);
      const user = result.user;
      const email = user.email || '';
      
      // Determine role based on domain
      const isLecturer = email.toLowerCase().endsWith('@poliku.edu.my');
      const role: Role = isLecturer ? 'lecturer' : 'student';

      if (database) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCurrentUser({
              ...data,
              id: user.uid,
              name: data.name || user.displayName || 'E-Attendance User',
              email: email,
              avatar: data.avatar || user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
              role: data.role || role,
              matricNo: data.matricNo || '',
              classGroup: data.classGroup || ''
            });
          } else {
            // First time login - set standard details
            const defaultUser = {
              id: user.uid,
              name: user.displayName || 'E-Attendance User',
              email: email,
              avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
              role: role,
              matricNo: role === 'student' ? '20DKM21F1012' : '', // Default mock matric for demonstration
              classGroup: role === 'student' ? 'DKM1C' : '',
              enrolledCourses: role === 'student' ? ['course-1'] : []
            };
            setCurrentUser(defaultUser);
          }
        } catch (dbError) {
          console.error('Firebase Realtime Database read failed:', dbError);
          // Crucial fallback: proceed with sign-in even if Realtime DB fails or permission denied
          setCurrentUser({
            id: user.uid,
            name: user.displayName || 'E-Attendance User',
            email: email,
            avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
            role: role
          });
        }
      } else {
        // Fallback when RTDB is disabled or not initialized
        setCurrentUser({
          id: user.uid,
          name: user.displayName || 'E-Attendance User',
          email: email,
          avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          role: role
        });
      }

      loginState(true);
      toast.success('Signed in successfully!');
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Firebase Auth Error:', error);
      
      if (error.code === 'auth/network-request-failed') {
        toast.info('Network failed. Signing in with local developer profile.');
        setCurrentUser({
          id: 'mock-user-wilson',
          name: 'Wilson Intai',
          email: 'wilson@poliku.edu.my',
          avatar: 'https://i.pravatar.cc/150?u=wilson',
          role: 'lecturer'
        });
        loginState(true);
      } else if (error.code === 'auth/configuration-not-found') {
        toast.error('Google Sign-In is not enabled. Please enable it in Firebase Console.', { duration: 8000 });
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error(`Authorized Domains mismatch. Please add ${window.location.hostname} in Firebase Authentication settings.`, { duration: 10000 });
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in popup closed before completion. Please try again.');
      } else {
        toast.error(error.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-slate-800">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col border border-slate-100 text-center"
      >
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-800">
          Course <span className="text-blue-600">E-Attendance</span>
        </h1>
        <p className="text-slate-400 text-sm mb-8 font-medium">Professional Attendance Management</p>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isMockLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all mb-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              Signing in...
            </span>
          ) : (
            <>
              <Image 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                width={20} 
                height={20} 
                className="w-5 h-5" 
                referrerPolicy="no-referrer" 
              />
              Continue with Google
            </>
          )}
        </button>
        
        <p className="text-xs text-slate-400 mt-4 leading-relaxed mb-4">
          @poliku.edu.my emails are automatically verified as <span className="font-semibold text-slate-500">Lecturers</span>.
        </p>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 bg-white text-xs font-semibold uppercase tracking-wider text-slate-400">
            Or Sign In Instantly
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => handleMockLogin('lecturer')}
            disabled={isMockLoading !== null}
            className="flex flex-col items-center justify-center gap-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 active:bg-slate-100 hover:border-blue-300 transition-all text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMockLoading === 'lecturer' ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : (
              <span className="text-xl">👨‍🏫</span>
            )}
            <div className="text-xs font-bold text-slate-700">Lecturer Demo</div>
            <div className="text-[10px] text-slate-400 font-medium">Wilson Intai</div>
          </button>
          <button
            onClick={() => handleMockLogin('student')}
            disabled={isMockLoading !== null}
            className="flex flex-col items-center justify-center gap-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 active:bg-slate-100 hover:border-blue-300 transition-all text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMockLoading === 'student' ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : (
              <span className="text-xl">🧑‍🎓</span>
            )}
            <div className="text-xs font-bold text-slate-700">Student Demo</div>
            <div className="text-[10px] text-slate-400 font-medium">Aiman Hakim</div>
          </button>
        </div>

        {!isConfigured && (
          <p className="text-xs text-amber-600 mt-6 bg-amber-50 p-3 rounded-xl text-left font-medium border border-amber-100">
            Note: Firebase parameters are not configured in local environment files. Using safe sandbox simulation.
          </p>
        )}
      </motion.div>
    </main>
  );
}
