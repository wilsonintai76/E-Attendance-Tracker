import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../lib/store';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { googleLogin } from '../lib/api';
import VersionDisplay from './VersionDisplay';

// Google OAuth Client ID — get yours at https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '843984963765-0u4oqoplckungjlil9f795vhbbejmrhv.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (cb?: (n: { isNotDisplayed(): boolean }) => void) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function LoginScreen() {
  const { loginState, setCurrentUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleCredential = useCallback(async (response: { credential: string }) => {
    setIsLoading(true);
    try {
      const user = await googleLogin(response.credential);
      setCurrentUser(user);
      loginState(true);
      toast.success('Signed in successfully!');
    } catch (err: any) {
      console.error('Google login failed:', err);
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [loginState, setCurrentUser]);

  // Load Google Identity Services script
  useEffect(() => {
    if (document.getElementById('google-gsi-script')) return;
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
  }, []);

  // Render Google Sign-In button once GSI is loaded
  useEffect(() => {
    if (!gsiReady || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: Math.max(buttonRef.current.offsetWidth, 280),
    });
  }, [gsiReady, handleCredential]);

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

        {isLoading ? (
          <div className="w-full flex items-center justify-center gap-2 py-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Signing in via Google...</span>
          </div>
        ) : (
          <div ref={buttonRef} className="flex justify-center min-h-10" />
        )}

        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          <span className="font-semibold text-slate-500">Lecturers:</span> Sign in with your <span className="font-semibold text-blue-600">@poliku.edu.my</span> domain email.<br />
          <span className="font-semibold text-slate-500">Students:</span> Any Google account is accepted.
        </p>
      </motion.div>
      <VersionDisplay />
    </main>
  );
}
