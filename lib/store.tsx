'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  matricNo?: string;
  classGroup?: string;
}

export interface AttendanceSession {
  id: string;
  courseCode: string;
  courseName: string;
  classGroup: string;
  date: string;
  startTime: string;
  code: string;
  status: 'active' | 'completed';
  lecturerId: string;
  studentCount: number;
  latitude?: number;
  longitude?: number;
  radius?: number; // In meters
  week?: number; // Week number (e.g. 1-14)
  hours?: number; // Hours for this lecture session (e.g. 1, 2, 3)
}

export interface Course {
  id: string;
  code: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // In meters
  startDate: string; // YYYY-MM-DD
  totalContactHours: number; // e.g. 42
  hoursPerWeek: number; // calculated as total / 14, or input
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  matricNo: string;
  classGroup: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late' | 'bermasalah';
  latitude?: number;
  longitude?: number;
  distanceToCenter?: number;
  inGeofence?: boolean;
  evidenceType?: 'sijil_sakit' | 'surat_pelepasan' | 'lain_lain' | '';
  evidenceNotes?: string;
  evidenceFile?: string; // Base64 simulated data
  evidenceFileName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  approvalNotes?: string;
}

interface AppStoreContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  courses: Course[];
  setCurrentUser: (user: User | null) => void;
  loginState: (state: boolean) => void;
  setSessions: (sessions: AttendanceSession[]) => void;
  setRecords: (records: AttendanceRecord[]) => void;
  setCourses: (courses: Course[]) => void;
  logout: () => void;
}

const AppStoreContext = createContext<AppStoreContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Local state for offline/mock backup
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('e_attendance_user');
      const storedLoggedIn = localStorage.getItem('e_attendance_logged_in');
      const storedSessions = localStorage.getItem('e_attendance_sessions');
      const storedRecords = localStorage.getItem('e_attendance_records');
      const storedCourses = localStorage.getItem('e_attendance_courses');

      if (storedUser && storedLoggedIn === 'true') {
        setCurrentUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      }
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      } else {
        // Seed some mock sessions if none exist
        const mockSessions: AttendanceSession[] = [
          {
            id: 'sess-1',
            courseCode: 'DKM5012',
            courseName: 'Thermodynamics II',
            classGroup: 'DKM5A',
            date: new Date().toISOString().split('T')[0],
            startTime: '08:30',
            code: '8839',
            status: 'active',
            lecturerId: 'mock-lecturer',
            studentCount: 2,
            latitude: 1.6033,
            longitude: 110.3547,
            radius: 50
          },
          {
            id: 'sess-2',
            courseCode: 'DJJ31022',
            courseName: 'Engineering Mechanics',
            classGroup: 'DKM3C',
            date: '2026-07-03',
            startTime: '10:00',
            code: '1245',
            status: 'completed',
            lecturerId: 'mock-lecturer',
            studentCount: 4,
            latitude: 1.6033,
            longitude: 110.3547,
            radius: 50
          }
        ];
        setSessions(mockSessions);
        localStorage.setItem('e_attendance_sessions', JSON.stringify(mockSessions));
      }

      if (storedRecords) {
        setRecords(JSON.parse(storedRecords));
      } else {
        const mockRecords: AttendanceRecord[] = [
          {
            id: 'rec-1',
            sessionId: 'sess-2',
            studentId: 'stud-1',
            studentName: 'Ahmad bin Syafiq',
            matricNo: '20DKM21F1001',
            classGroup: 'DKM3C',
            timestamp: '2026-07-03T10:02:15Z',
            status: 'present',
            latitude: 1.60335,
            longitude: 110.35472,
            distanceToCenter: 6.2,
            inGeofence: true,
            approvalStatus: 'none'
          },
          {
            id: 'rec-2',
            sessionId: 'sess-2',
            studentId: 'stud-2',
            studentName: 'Chong Wei Ming',
            matricNo: '20DKM21F1005',
            classGroup: 'DKM3C',
            timestamp: '2026-07-03T10:05:33Z',
            status: 'present',
            latitude: 1.60341,
            longitude: 110.35465,
            distanceToCenter: 14.3,
            inGeofence: true,
            approvalStatus: 'none'
          },
          {
            id: 'rec-3',
            sessionId: 'sess-1',
            studentId: 'stud-2', // Chong Wei Ming in another session
            studentName: 'Chong Wei Ming',
            matricNo: '20DKM21F1005',
            classGroup: 'DKM5A',
            timestamp: '2026-07-04T08:31:00Z',
            status: 'bermasalah',
            latitude: 1.6111, // Far away
            longitude: 110.3999,
            distanceToCenter: 1250,
            inGeofence: false,
            evidenceType: 'sijil_sakit',
            evidenceNotes: 'Demam panas pada hari Sabtu pagi, mohon pelepasan kuliah.',
            evidenceFileName: 'mc_klinik_kesihatan_matang.pdf',
            evidenceFile: 'data:application/pdf;base64,mockpdf...',
            approvalStatus: 'pending'
          },
          {
            id: 'rec-4',
            sessionId: 'sess-1',
            studentId: 'stud-3', // Another student who completely missed check-in on design time
            studentName: 'Siti Nurhaliza',
            matricNo: '20DKM21F1012',
            classGroup: 'DKM5A',
            timestamp: '2026-07-04T08:35:00Z',
            status: 'bermasalah',
            inGeofence: false,
            approvalStatus: 'none' // Outstanding submission required
          }
        ];
        setRecords(mockRecords);
        localStorage.setItem('e_attendance_records', JSON.stringify(mockRecords));
      }

      if (storedCourses) {
        setCourses(JSON.parse(storedCourses));
      } else {
        const mockCourses: Course[] = [
          {
            id: 'course-1',
            code: 'DKM5012',
            name: 'Thermodynamics II',
            location: 'Bilik Kuliah 1, JKM',
            latitude: 1.6033,
            longitude: 110.3547,
            radius: 50,
            startDate: '2026-07-06',
            totalContactHours: 42,
            hoursPerWeek: 3
          },
          {
            id: 'course-2',
            code: 'DJJ31022',
            name: 'Engineering Mechanics',
            location: 'Dewan Serbaguna',
            latitude: 1.6025,
            longitude: 110.3542,
            radius: 100,
            startDate: '2026-07-07',
            totalContactHours: 28,
            hoursPerWeek: 2
          }
        ];
        setCourses(mockCourses);
        localStorage.setItem('e_attendance_courses', JSON.stringify(mockCourses));
      }
    }
  }, []);

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('e_attendance_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('e_attendance_user');
    }
  };

  const loginState = (state: boolean) => {
    setIsLoggedIn(state);
    localStorage.setItem('e_attendance_logged_in', state ? 'true' : 'false');
  };

  const handleSetSessions = (newSessions: AttendanceSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('e_attendance_sessions', JSON.stringify(newSessions));
  };

  const handleSetRecords = (newRecords: AttendanceRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('e_attendance_records', JSON.stringify(newRecords));
  };

  const handleSetCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
    localStorage.setItem('e_attendance_courses', JSON.stringify(newCourses));
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('e_attendance_logged_in');
    localStorage.removeItem('e_attendance_user');
  };

  return (
    <AppStoreContext.Provider value={{
      isLoggedIn,
      currentUser,
      sessions,
      records,
      courses,
      setCurrentUser: handleSetCurrentUser,
      loginState,
      setSessions: handleSetSessions,
      setRecords: handleSetRecords,
      setCourses: handleSetCourses,
      logout
    }}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
