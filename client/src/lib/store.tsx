import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as api from './api';
import type { User, AttendanceSession, AttendanceRecord, Course, AttendanceAlert } from './api';

export type { User, AttendanceSession, AttendanceRecord, Course, AttendanceAlert };
export type Role = 'lecturer' | 'student';

interface AppStoreContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: User | null;
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  courses: Course[];
  alerts: AttendanceAlert[];
  setCurrentUser: (user: User | null) => void;
  loginState: (state: boolean) => void;
  setSessions: (sessions: AttendanceSession[]) => void;
  setRecords: (records: AttendanceRecord[]) => void;
  setCourses: (courses: Course[]) => void;
  setAlerts: (alerts: AttendanceAlert[]) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('e_attendance_token');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const stored = localStorage.getItem('e_attendance_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCoursesState] = useState<Course[]>([]);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);

  // Refresh all data from the API
  const refreshData = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      const [coursesData, sessionsData, recordsData, alertsData] = await Promise.all([
        api.fetchCourses(),
        api.fetchSessions(),
        api.fetchRecords(),
        api.fetchAlerts(),
      ]);
      setCoursesState(coursesData);
      setSessions(sessionsData);
      setRecords(recordsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Refresh data on login
  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    }
  }, [isLoggedIn, refreshData]);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('e_attendance_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('e_attendance_user');
    }
  };

  const loginState = (state: boolean) => {
    setIsLoggedIn(state);
  };

  const handleSetSessions = (newSessions: AttendanceSession[]) => {
    setSessions(newSessions);
  };

  const handleSetRecords = (newRecords: AttendanceRecord[]) => {
    setRecords(newRecords);
  };

  const handleSetCourses = (newCourses: Course[]) => {
    setCoursesState(newCourses);
  };

  const handleSetAlerts = (newAlerts: AttendanceAlert[]) => {
    setAlerts(newAlerts);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUserState(null);
    api.setToken(null);
    localStorage.removeItem('e_attendance_token');
    localStorage.removeItem('e_attendance_user');
    setSessions([]);
    setRecords([]);
    setCoursesState([]);
    setAlerts([]);
  };

  // Auto-logout after 15 minutes of inactivity
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.error("You have been automatically logged out due to 15 minutes of inactivity.", {
          id: 'inactivity-logout-toast',
          duration: 10000,
        });
      }, 15 * 60 * 1000);
    };

    resetTimer();

    const interactionEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => resetTimer();

    interactionEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isLoggedIn]);

  return (
    <AppStoreContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        currentUser,
        sessions,
        records,
        courses,
        alerts,
        setCurrentUser,
        loginState,
        setSessions: handleSetSessions,
        setRecords: handleSetRecords,
        setCourses: handleSetCourses,
        setAlerts: handleSetAlerts,
        logout,
        refreshData,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
