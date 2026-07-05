'use client';

import React, { useState } from 'react';
import { useAppStore, AttendanceSession, AttendanceRecord } from '@/lib/store';
import { 
  LogOut, Plus, Users, CheckCircle, Clock, ClipboardList, 
  FileDown, Search, QrCode, BookOpen, Layers, ShieldCheck, RefreshCw,
  MapPin, Navigation, Compass, AlertTriangle, Settings, Info, Check, User,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { POLIKU_PRESETS, getCurrentCoordinates } from '@/lib/geoUtils';
import PolikuMap from './PolikuMap';

export default function LecturerDashboard() {
  const { currentUser, sessions, setSessions, records, setRecords, logout, courses = [], setCourses } = useAppStore();
  
  // Active Tab for mobile bottom menu & desktop tab toggle
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'records' | 'courses' | 'account'>('dashboard');

  // Course Management Form States
  const [regCode, setRegCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regLat, setRegLat] = useState('1.6033');
  const [regLng, setRegLng] = useState('110.3547');
  const [regRadius, setRegRadius] = useState(50);
  const [regStartDate, setRegStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [regTotalHours, setRegTotalHours] = useState('42');
  const [regHoursPerWeek, setRegHoursPerWeek] = useState('3');
  const [regSelectedPreset, setRegSelectedPreset] = useState('');
  const [isFetchingCourseGPS, setIsFetchingCourseGPS] = useState(false);

  // Dashboard states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCourseGpsModal, setShowCourseGpsModal] = useState(false);
  const [showSessionGpsModal, setShowSessionGpsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  
  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [overrideGeofencing, setOverrideGeofencing] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionWeek, setSessionWeek] = useState('1');
  const [sessionHours, setSessionHours] = useState('2');
  const [createFullSemester, setCreateFullSemester] = useState(false);
  
  // Geofencing states
  const [useGeofencing, setUseGeofencing] = useState(true);
  const [latitude, setLatitude] = useState('1.6033'); // Default to JKM
  const [longitude, setLongitude] = useState('110.3547');
  const [radius, setRadius] = useState(50); // Default 50 meters
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Appeal Review States
  const [selectedRecordForReview, setSelectedRecordForReview] = useState<AttendanceRecord | null>(null);
  const [lecturerNotes, setLecturerNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'bermasalah_pending' | 'bermasalah_all'>('all');

  const fetchCurrentLocation = async () => {
    setIsFetchingGPS(true);
    try {
      const pos = await getCurrentCoordinates();
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
      toast.success('Successfully captured current GPS coordinates!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to get GPS coordinates. Check browser permissions.');
    } finally {
      setIsFetchingGPS(false);
    }
  };

  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = POLIKU_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setLatitude(preset.latitude.toFixed(6));
      setLongitude(preset.longitude.toFixed(6));
      toast.success(`Applied preset: ${preset.name}`);
    }
  };

  // Course Management Handlers
  const fetchCurrentCourseLocation = async () => {
    setIsFetchingCourseGPS(true);
    try {
      const pos = await getCurrentCoordinates();
      setRegLat(pos.coords.latitude.toFixed(6));
      setRegLng(pos.coords.longitude.toFixed(6));
      toast.success('Successfully captured current GPS coordinates for course!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to get GPS coordinates. Check browser permissions.');
    } finally {
      setIsFetchingCourseGPS(false);
    }
  };

  const handleApplyCoursePreset = (presetName: string) => {
    setRegSelectedPreset(presetName);
    const preset = POLIKU_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setRegLat(preset.latitude.toFixed(6));
      setRegLng(preset.longitude.toFixed(6));
      toast.success(`Applied preset: ${preset.name}`);
    }
  };

  // Synchronized Politeknik Hours Calculator (14 Weeks)
  const handleTotalHoursChange = (val: string) => {
    setRegTotalHours(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const perWeek = Math.round((num / 14) * 10) / 10;
      setRegHoursPerWeek(perWeek.toString());
    } else {
      setRegHoursPerWeek('');
    }
  };

  const handleHoursPerWeekChange = (val: string) => {
    setRegHoursPerWeek(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const total = Math.round(num * 14);
      setRegTotalHours(total.toString());
    } else {
      setRegTotalHours('');
    }
  };

  const handleRegisterCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCode || !regName || !regLocation) {
      toast.error('Please fill in Course Code, Name and Location');
      return;
    }

    const newCourse = {
      id: `course-${Date.now()}`,
      code: regCode.toUpperCase().trim(),
      name: regName.trim(),
      location: regLocation.trim(),
      latitude: regLat ? parseFloat(regLat) : undefined,
      longitude: regLng ? parseFloat(regLng) : undefined,
      radius: regRadius,
      startDate: regStartDate,
      totalContactHours: parseFloat(regTotalHours) || 0,
      hoursPerWeek: parseFloat(regHoursPerWeek) || 0,
    };

    if (courses.some(c => c.code.toLowerCase() === newCourse.code.toLowerCase())) {
      toast.error(`Course with code ${newCourse.code} is already registered!`);
      return;
    }

    setCourses([...courses, newCourse]);
    toast.success(`Course ${newCourse.code} registered successfully!`);
    
    // Reset Form
    setRegCode('');
    setRegName('');
    setRegLocation('');
    setRegSelectedPreset('');
    setRegTotalHours('42');
    setRegHoursPerWeek('3');
  };

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? Doing so won\'t affect past session logs.')) {
      setCourses(courses.filter(c => c.id !== courseId));
      toast.success('Course deleted successfully.');
    }
  };

  // Handle session creation
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName || !classGroup) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate random code if not specified
    const code = sessionCode || Math.floor(1000 + Math.random() * 9000).toString();

    // Check if we should inherit geofencing or use overridden/custom values
    const selectedCourse = selectedCourseId ? courses.find(c => c.id === selectedCourseId) : null;
    
    let finalLat: number | undefined = undefined;
    let finalLng: number | undefined = undefined;
    let finalRadius: number | undefined = undefined;

    if (selectedCourse && !overrideGeofencing) {
      finalLat = selectedCourse.latitude;
      finalLng = selectedCourse.longitude;
      finalRadius = selectedCourse.radius;
    } else {
      finalLat = useGeofencing ? parseFloat(latitude) : undefined;
      finalLng = useGeofencing ? parseFloat(longitude) : undefined;
      finalRadius = useGeofencing ? radius : undefined;
    }

    if (createFullSemester) {
      const generatedSessions: AttendanceSession[] = [];
      const chosenWeekNum = parseInt(sessionWeek) || 1;
      const baseDate = new Date(sessionDate);
      
      for (let w = 1; w <= 14; w++) {
        // Calculate the weekly offset date based on the chosen week number
        const offsetDays = (w - chosenWeekNum) * 7;
        const wDate = new Date(baseDate);
        wDate.setDate(baseDate.getDate() + offsetDays);
        const wDateString = wDate.toISOString().split('T')[0];
        
        // Generate a random 4-digit code for each week
        const wCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        const isCurrentActive = w === chosenWeekNum;
        
        generatedSessions.push({
          id: `sess-${Date.now()}-${w}`,
          courseCode: courseCode.toUpperCase(),
          courseName,
          classGroup: classGroup.toUpperCase(),
          date: wDateString,
          startTime: isCurrentActive 
            ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
            : '08:30', // Default start time for non-active sessions
          code: wCode,
          status: isCurrentActive ? 'active' : 'completed', // 'completed' acts as inactive/scheduled initially
          lecturerId: currentUser?.id || 'unknown',
          studentCount: 0,
          latitude: finalLat,
          longitude: finalLng,
          radius: finalRadius,
          week: w,
          hours: parseFloat(sessionHours) || undefined
        });
      }
      
      setSessions([...generatedSessions, ...sessions]);
      setShowCreateModal(false);
      toast.success(`Generated 14 weekly sessions for ${courseCode.toUpperCase()}! Week ${chosenWeekNum} is active immediately with code: ${generatedSessions[chosenWeekNum - 1].code}`, {
        duration: 8000
      });
    } else {
      const newSession: AttendanceSession = {
        id: `sess-${Date.now()}`,
        courseCode: courseCode.toUpperCase(),
        courseName,
        classGroup: classGroup.toUpperCase(),
        date: sessionDate,
        startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        code,
        status: 'active',
        lecturerId: currentUser?.id || 'unknown',
        studentCount: 0,
        latitude: finalLat,
        longitude: finalLng,
        radius: finalRadius,
        week: parseInt(sessionWeek) || undefined,
        hours: parseFloat(sessionHours) || undefined
      };

      setSessions([newSession, ...sessions]);
      setShowCreateModal(false);
      toast.success(`Session for ${newSession.courseCode} created! Code is: ${newSession.code}`, {
        duration: 6000
      });
    }

    // Reset fields
    setCourseCode('');
    setCourseName('');
    setClassGroup('');
    setSessionCode('');
    setSelectedCourseId('');
    setOverrideGeofencing(false);
    setSelectedPreset('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionWeek('1');
    setSessionHours('2');
    setCreateFullSemester(false);
  };

  // Close active session
  const handleCloseSession = (id: string) => {
    const updated = sessions.map(s => {
      if (s.id === id) {
        return { ...s, status: 'completed' as const };
      }
      return s;
    });
    setSessions(updated);
    toast.success('Attendance session closed successfully.');
  };

  // Open / activate an inactive/completed session
  const handleOpenSession = (id: string) => {
    const freshCode = Math.floor(1000 + Math.random() * 9000).toString();
    const freshStartTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    // Auto-update date to today's date so it registers today
    const todayStr = new Date().toISOString().split('T')[0];

    const updated = sessions.map(s => {
      if (s.id === id) {
        return { 
          ...s, 
          status: 'active' as const,
          code: freshCode,
          startTime: freshStartTime,
          date: todayStr
        };
      }
      return s;
    });
    setSessions(updated);
    toast.success(`Class session opened! The fresh check-in code is: ${freshCode}`, {
      duration: 6000
    });
  };

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSession = selectedSessionId === 'all' || rec.sessionId === selectedSessionId;
    const matchesSearch = 
      rec.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.matricNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.classGroup.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'present') {
      matchesStatus = rec.status === 'present';
    } else if (statusFilter === 'late') {
      matchesStatus = rec.status === 'late';
    } else if (statusFilter === 'absent') {
      matchesStatus = rec.status === 'absent';
    } else if (statusFilter === 'bermasalah_pending') {
      matchesStatus = rec.status === 'bermasalah' && rec.approvalStatus === 'pending';
    } else if (statusFilter === 'bermasalah_all') {
      matchesStatus = rec.status === 'bermasalah';
    }

    return matchesSession && matchesSearch && matchesStatus;
  });

  // Export records as CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.info('No records found to export');
      return;
    }

    const headers = ['Student Name', 'Matric No', 'Class', 'Session Course', 'Date & Time', 'Status'];
    const rows = filteredRecords.map(rec => {
      const sess = sessions.find(s => s.id === rec.sessionId);
      const courseStr = sess ? `${sess.courseCode} - ${sess.courseName}` : 'Unknown';
      const formattedTime = new Date(rec.timestamp).toLocaleString();
      return [
        `"${rec.studentName}"`,
        `"${rec.matricNo}"`,
        `"${rec.classGroup}"`,
        `"${courseStr}"`,
        `"${formattedTime}"`,
        `"${rec.status.toUpperCase()}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully.');
  };

  // Handle lecturer decision on appeal
  const handleReviewAppeal = (status: 'approved' | 'rejected') => {
    if (!selectedRecordForReview) return;

    const updated = records.map(r => {
      if (r.id === selectedRecordForReview.id) {
        return {
          ...r,
          status: status === 'approved' ? ('present' as const) : ('absent' as const),
          approvalStatus: status,
          approvalNotes: lecturerNotes
        };
      }
      return r;
    });

    setRecords(updated);
    toast.success(status === 'approved' 
      ? `Kelulusan Berjaya: Kehadiran ${selectedRecordForReview.studentName} disahkan sebagai HADIR.` 
      : `Pelepasan Ditolak: Kehadiran ${selectedRecordForReview.studentName} ditukar kepada TIDAK HADIR (ABSENT).`
    );
    setSelectedRecordForReview(null);
    setLecturerNotes('');
  };

  // Sort sessions: active first, then sorted alphabetically by course code, then chronologically by week/date.
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    
    // Both active or both completed/inactive, sort by courseCode then week
    if (a.courseCode !== b.courseCode) {
      return a.courseCode.localeCompare(b.courseCode);
    }
    return (a.week || 0) - (b.week || 0);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">Course E-Attendance</h2>
              <p className="text-xs text-slate-400 font-medium">Lecturer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
              <p className="text-xs text-blue-600 font-medium">{currentUser?.email}</p>
            </div>
            <img 
              src={currentUser?.avatar || 'https://i.pravatar.cc/150?u=user'} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full pb-24 lg:pb-8">
        
        {/* Desktop & Mobile Top Segmented Tab Control */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-slate-200/60 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/30 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'sessions' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" /> Live Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'records' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Student Records
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'courses' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Course Management
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex lg:hidden items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'account' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" /> My Account
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-semibold bg-white px-3.5 py-2 rounded-xl border border-slate-100">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>POLIKU Server Connection: <strong className="text-slate-600">Online</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ==================== DEDICATED DASHBOARD TAB VIEW ==================== */}
          <div className={`space-y-6 lg:col-span-3 ${activeTab === 'dashboard' ? 'block' : 'hidden'}`}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-100 flex flex-col justify-between md:h-[230px] h-auto gap-5">
              <div>
                <span className="text-[10px] font-extrabold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">Politeknik Academic Portal</span>
                <h3 className="text-2xl sm:text-3xl font-black mt-3 leading-tight">Welcome back, {currentUser?.name || 'Lecturer'}</h3>
                <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl leading-relaxed">Manage courses, monitor geofenced classroom locations, and automatically audit weekly attendance hours securely.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className="bg-white text-blue-600 hover:bg-blue-50 active:scale-95 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-4 h-4" /> Manage 14-Week Courses
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setCourseCode('');
                    setCourseName('');
                    setClassGroup('');
                    setSessionCode(Math.floor(1000 + Math.random() * 9000).toString());
                    setSelectedCourseId('');
                    setOverrideGeofencing(false);
                    setUseGeofencing(true);
                    setLatitude('1.6033');
                    setLongitude('110.3547');
                    setRadius(50);
                    setSessionDate(new Date().toISOString().split('T')[0]);
                    setSessionWeek('1');
                    setSessionHours('2');
                    setShowCreateModal(true);
                  }}
                  className="bg-blue-500/30 hover:bg-blue-500/40 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all border border-white/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Start Live Class Session
                </button>
              </div>
            </div>

            {/* Fast Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Registered Courses</span>
                <span className="text-3xl font-black text-slate-800">{courses.length}</span>
                <p className="text-[10px] text-slate-400 mt-1">Managed semester curricula</p>
              </div>
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Live Active Sessions</span>
                <span className="text-3xl font-black text-green-600 flex items-center gap-2">
                  {sessions.filter(s => s.status === 'active').length}
                  {sessions.filter(s => s.status === 'active').length > 0 && <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Awaiting student checks</p>
              </div>
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Records Logged</span>
                <span className="text-3xl font-black text-slate-800">{records.length}</span>
                <p className="text-[10px] text-slate-400 mt-1">Cross-referenced check-ins</p>
              </div>
            </div>

            {/* Pending Kehadiran Bermasalah / Exception Review Card */}
            {(() => {
              const pendingAppeals = records.filter(r => r.status === 'bermasalah' && r.approvalStatus === 'pending');
              if (pendingAppeals.length === 0) return (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> Permohonan Kehadiran Bermasalah
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Selesai Semak (All Reviewed)</span>
                  </div>
                  <p className="text-xs text-slate-400">Tiada permohonan pengecualian / sijil sakit (MC) pelajar yang memerlukan tindakan semakan pada masa ini.</p>
                </div>
              );
              
              return (
                <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-sm animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100/60 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Tindakan: Semakan Kehadiran Bermasalah ({pendingAppeals.length})
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Sila semak dokumen bukti/sijil sakit yang dikemukakan oleh pelajar untuk mengesahkan kehadiran.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setStatusFilter('bermasalah_pending');
                        setActiveTab('records');
                      }}
                      className="text-xs text-blue-600 font-extrabold hover:underline self-start sm:self-auto bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/20"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingAppeals.slice(0, 3).map(rec => {
                      const sess = sessions.find(s => s.id === rec.sessionId);
                      return (
                        <div key={rec.id} className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-200 transition-all">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100/50">
                                {sess?.courseCode || 'DKM'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">{sess?.date}</span>
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs line-clamp-1">{rec.studentName}</h5>
                            <p className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">{rec.matricNo} • {rec.classGroup}</p>
                            
                            <div className="mt-2 text-[10px] bg-white border border-slate-100 p-2.5 rounded-xl space-y-1">
                              <p className="font-bold text-amber-600 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                {rec.evidenceType === 'sijil_sakit' ? 'Sijil Sakit (MC)' : rec.evidenceType === 'surat_pelepasan' ? 'Surat Pelepasan' : 'Lain-lain'}
                              </p>
                              <p className="text-slate-500 italic line-clamp-1">&quot; {rec.evidenceNotes} &quot;</p>
                              <p className="text-[9px] text-blue-600 font-mono truncate pt-1 border-t border-slate-50 mt-1 flex items-center gap-1">
                                📎 {rec.evidenceFileName || 'dokumen_bukti.pdf'}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordForReview(rec);
                              setLecturerNotes(rec.approvalNotes || '');
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[10px] py-2 rounded-xl transition-all shadow-xs cursor-pointer text-center"
                          >
                            Semak Dokumen & Keputusan
                          </button>
                        </div>
                      );
                    })}
                    {pendingAppeals.length > 3 && (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-slate-50/40 min-h-[140px]">
                        <p className="text-xs font-bold text-slate-600">+{pendingAppeals.length - 3} Lagi Permohonan</p>
                        <p className="text-[10px] text-slate-400">Menunggu semakan kelulusan anda</p>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('bermasalah_pending');
                            setActiveTab('records');
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 px-3.5 rounded-lg transition-all"
                        >
                          Lihat Semua
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Live Active Sessions Quick Overview (on Dashboard) */}
            {sessions.filter(s => s.status === 'active').length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Clock className="w-4.5 h-4.5 text-green-500 animate-pulse animate-duration-1000" /> Currently Active Sessions
                  </h4>
                  <button 
                    onClick={() => setActiveTab('sessions')}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    View All Sessions &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.filter(s => s.status === 'active').map(sess => (
                    <div key={sess.id} className="border border-green-100 bg-green-50/20 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                            {sess.courseCode}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md">Week {sess.week || 1}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs line-clamp-1">{sess.courseName}</h5>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Code: <strong className="text-slate-800 font-mono text-[11px] bg-white border border-slate-200 px-1 rounded-sm">{sess.code}</strong> • {sess.studentCount} checked-in
                        </p>
                      </div>
                      <button
                        onClick={() => handleCloseSession(sess.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer text-center"
                      >
                        Close Session
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card on Geofencing & Contact Hours */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                <Info className="w-4.5 h-4.5 text-blue-600" /> Politeknik Geofencing & Hour Auditing
              </h4>
              <div className="text-xs text-slate-500 space-y-2.5 leading-relaxed">
                <p>
                  By registering your courses inside <strong className="text-slate-700">Course Management</strong>, you pin official GPS coordinates for each class classroom/hall. 
                  When starting a live attendance session, student check-ins outside your geofence radius are automatically flagged, ensuring reliable presence verification.
                </p>
                <p>
                  Each Politeknik course syllabus follows a standard <strong className="text-blue-600 font-semibold">14-week duration</strong>. 
                  Setting the total syllabus hours or custom hours/week inside the course manager will automatically balance contacts and assist in auditing your semester progression.
                </p>
              </div>
            </div>
          </div>

          {/* ==================== CLASS SESSIONS LIST (DEDICATED VIEW) ==================== */}
          <div className={`space-y-6 lg:col-span-3 ${activeTab === 'sessions' ? 'block' : 'hidden'}`}>
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Class Sessions</h3>
                  <p className="text-xs text-slate-400">Generate, schedule, or activate weekly 14-week semester sessions</p>
                </div>
                <button
                  onClick={() => {
                    setCourseCode('');
                    setCourseName('');
                    setClassGroup('');
                    setSessionCode(Math.floor(1000 + Math.random() * 9000).toString());
                    setSelectedCourseId('');
                    setOverrideGeofencing(false);
                    setUseGeofencing(true);
                    setLatitude('1.6033');
                    setLongitude('110.3547');
                    setRadius(50);
                    setSessionDate(new Date().toISOString().split('T')[0]);
                    setSessionWeek('1');
                    setSessionHours('2');
                    setShowCreateModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2 px-3.5 rounded-xl flex items-center gap-1.5 text-xs shadow-md shadow-blue-100 transition-all cursor-pointer hover:scale-105"
                >
                  <Plus className="w-4 h-4" /> Create Live Session
                </button>
              </div>

              {/* Session cards list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedSessions.length === 0 ? (
                  <div className="col-span-full text-center py-16 border border-dashed border-slate-100 rounded-3xl text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
                    <p className="text-sm font-medium">No sessions scheduled.</p>
                  </div>
                ) : (
                  sortedSessions.map((sess) => (
                    <div 
                      key={sess.id}
                      className={`border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                        sess.status === 'active' 
                          ? 'bg-blue-50/40 border-blue-100 shadow-xs' 
                          : 'bg-white border-slate-100 hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-1.5">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {sess.courseCode}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {sess.classGroup}
                            </span>
                          </div>
                          <span className={`text-xs font-bold flex items-center gap-1 ${
                            sess.status === 'active' ? 'text-green-600' : 'text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sess.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            {sess.status === 'active' ? 'LIVE' : 'CLOSED'}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 text-sm mb-3 leading-snug">{sess.courseName}</h4>

                        <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold mb-3.5 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100/50">
                          <span className="text-blue-600 font-extrabold">Week {sess.week || 1}</span>
                          <span className="text-slate-300">|</span>
                          <span>{sess.hours || 2} Hour{sess.hours && sess.hours > 1 ? 's' : ''} Lecture</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">{sess.date}</span>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium mb-3">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Started: {sess.startTime}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Students: {sess.studentCount}</span>
                        </div>

                        {sess.latitude && sess.longitude ? (
                          <div className="bg-white/60 border border-slate-100 rounded-xl p-2.5 mb-4 text-[10px] text-slate-500 font-semibold space-y-1">
                            <div className="flex items-center gap-1 text-blue-600">
                              <MapPin className="w-3 h-3" />
                              <span>Geofence Enabled ({sess.radius}m)</span>
                            </div>
                            <div className="flex justify-between text-slate-400 font-mono text-[9px]">
                              <span>LAT: {sess.latitude.toFixed(4)}</span>
                              <span>LNG: {sess.longitude.toFixed(4)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/50 border border-slate-200/40 rounded-xl p-2.5 mb-4 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>No Geofence Restriction</span>
                          </div>
                        )}
                      </div>

                      {sess.status === 'active' ? (
                        <div className="bg-white border border-blue-100 rounded-xl p-3 flex justify-between items-center mb-1">
                          <div>
                            <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider">Session Status</p>
                            <p className="text-xs font-bold text-slate-800">Check-In Open ({sess.code})</p>
                          </div>
                          <button
                            onClick={() => handleCloseSession(sess.id)}
                            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm hover:scale-105"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex justify-between items-center mb-1">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Session Status</p>
                            <p className="text-xs font-semibold text-slate-500">Inactive / Closed</p>
                          </div>
                          <button
                            onClick={() => handleOpenSession(sess.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm hover:scale-105"
                          >
                            Start Class / Open
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Attendance Log & Filters */}
          <div className={`space-y-6 ${activeTab === 'records' ? 'block lg:col-span-3' : 'hidden'}`}>
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Attendance Log</h3>
                  <p className="text-xs text-slate-400">View and audit recorded check-ins with GPS tracking</p>
                </div>
                
                <button
                  onClick={handleExportCSV}
                  className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-xl flex items-center gap-1.5 text-sm shadow-md shadow-emerald-100 transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Export CSV
                </button>
              </div>

              {/* Pending Appeals Notification Banner */}
              {(() => {
                const pendingAppealsCount = records.filter(r => r.status === 'bermasalah' && r.approvalStatus === 'pending').length;
                if (pendingAppealsCount === 0) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-amber-500 text-white p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-900 uppercase tracking-wide">Peti Masuk Kehadiran Bermasalah</p>
                        <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                          Terdapat {pendingAppealsCount} permohonan pengecualian / sijil sakit (MC) pelajar yang memerlukan semakan dan kelulusan anda.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('bermasalah_pending');
                        toast.info('Menapis rekod: Kehadiran Bermasalah sahaja');
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto hover:scale-105 active:scale-95"
                    >
                      Semak Sekarang
                    </button>
                  </div>
                );
              })()}

              {/* Filters Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, matric, or class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 pl-10 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer font-semibold"
                  >
                    <option value="all">Semua Sesi (All Sessions)</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.courseCode} ({s.classGroup}) - {s.courseName} {s.week ? `[Wk ${s.week}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer font-semibold"
                  >
                    <option value="all">Semua Rekod (All Statuses)</option>
                    <option value="present">Hadir (Present)</option>
                    <option value="late">Lewat (Late)</option>
                    <option value="absent">Tidak Hadir (Absent)</option>
                    <option value="bermasalah_pending">Kehadiran Bermasalah (Pending Review)</option>
                    <option value="bermasalah_all">Semua Kehadiran Bermasalah (All Appeals)</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3.5 px-4">Matric No</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4">Subject</th>
                        <th className="py-3.5 px-4">Location / GPS</th>
                        <th className="py-3.5 px-4">Checked In</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Action / Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                            No attendance records match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((rec) => {
                          const sess = sessions.find(s => s.id === rec.sessionId);
                          const isBermasalah = rec.status === 'bermasalah';
                          
                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3.5 px-4 font-bold text-slate-800">{rec.studentName}</td>
                              <td className="py-3.5 px-4 font-mono text-xs">{rec.matricNo}</td>
                              <td className="py-3.5 px-4">{rec.classGroup}</td>
                              <td className="py-3.5 px-4 text-xs">
                                <div className="flex flex-col gap-0.5">
                                  <p className="font-bold text-slate-700">{sess ? sess.courseCode : 'N/A'}</p>
                                  {sess && (
                                    <span className="text-slate-400 font-semibold text-[10px]">
                                      Week {sess.week || 1} • {sess.hours || 2}h lecture
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs">
                                {rec.latitude && rec.longitude ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`font-bold flex items-center gap-1 ${
                                      rec.inGeofence ? 'text-green-600' : 'text-amber-600'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${rec.inGeofence ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                      {rec.inGeofence ? 'Verified Range' : 'Out of Bounds'}
                                    </span>
                                    <span className="text-slate-400 font-medium text-[10px]">
                                      {rec.distanceToCenter !== undefined ? `${Math.round(rec.distanceToCenter)}m away` : 'Coords stored'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No GPS Data</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-400">
                                {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`text-[10px] font-black inline-block px-2.5 py-1 rounded-full uppercase ${
                                  rec.status === 'present' 
                                    ? 'bg-green-100 text-green-700' 
                                    : rec.status === 'late'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : rec.status === 'absent'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700 animate-pulse'
                                }`}>
                                  {rec.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isBermasalah ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {rec.approvalStatus === 'none' || !rec.approvalStatus ? (
                                      <span className="text-xs text-slate-400 italic">Awaiting Student Upload</span>
                                    ) : rec.approvalStatus === 'pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRecordForReview(rec);
                                          setLecturerNotes(rec.approvalNotes || '');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs shrink-0 hover:scale-105 active:scale-95"
                                      >
                                        Semak MC / Dokumen
                                      </button>
                                    ) : rec.approvalStatus === 'approved' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRecordForReview(rec);
                                          setLecturerNotes(rec.approvalNotes || '');
                                        }}
                                        className="text-green-700 hover:text-green-800 font-extrabold text-[11px] bg-green-50 border border-green-100 py-1 px-2.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        ✓ Diluluskan
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRecordForReview(rec);
                                          setLecturerNotes(rec.approvalNotes || '');
                                        }}
                                        className="text-red-700 hover:text-red-800 font-extrabold text-[11px] bg-red-50 border border-red-100 py-1 px-2.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        ✗ Ditolak (Absent)
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* COURSE MANAGEMENT TAB VIEW */}
          <div className={`space-y-6 ${activeTab === 'courses' ? 'block lg:col-span-3' : 'hidden'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Side: Registered Courses list */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Registered Course List</h3>
                      <p className="text-xs text-slate-400">Standard 14-Week Politeknik Courses and Geofence coordinates</p>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto">
                      <BookOpen className="w-4 h-4" /> {courses.length} Active Courses
                    </span>
                  </div>

                  {courses.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                      <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-20 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-500">No Registered Courses</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Use the registration form on the right to register course codes, contact hours, and geofencing coordinates.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.map((course) => (
                        <div key={course.id} className="border border-slate-100 hover:border-blue-100 hover:shadow-xs rounded-2xl p-5 bg-slate-50/20 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">
                                {course.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCourse(course.id)}
                                className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete Course"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <h4 className="font-bold text-slate-800 text-sm mb-1 leading-tight">{course.name}</h4>
                            <p className="text-xs text-slate-400 font-medium mb-3 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-300" /> {course.location}
                            </p>

                            {/* Contact Hours Stats */}
                            <div className="bg-white border border-slate-100 rounded-xl p-3 mb-3 text-[11px] text-slate-500 font-medium space-y-1.5 shadow-2xs">
                              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="text-slate-400">Total Contact Hours:</span>
                                <strong className="text-slate-700">{course.totalContactHours} hrs</strong>
                              </div>
                              <div className="flex justify-between pb-0.5">
                                <span className="text-slate-400">Hours per Week:</span>
                                <strong className="text-blue-600 bg-blue-50 px-1.5 rounded-md font-bold">{course.hoursPerWeek} hrs/week</strong>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                              <span>Start Date:</span>
                              <span className="text-slate-600">{course.startDate}</span>
                            </div>
                            {course.latitude && course.longitude ? (
                              <div className="flex justify-between items-center text-[10px] text-blue-600 font-semibold">
                                <span className="flex items-center gap-0.5"><Compass className="w-3 h-3" /> Geofence:</span>
                                <span>Radius: {course.radius}m</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-semibold">Geofencing Disabled</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Register New Course Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base mb-1">Register New Course</h3>
                  <p className="text-xs text-slate-400 mb-4">Set curriculum specifications, location, and standard Politeknik contact hours.</p>

                  <form onSubmit={handleRegisterCourse} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DKM5012"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Thermodynamics II"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classroom Location *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. JKM Bilik Kuliah 1"
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>

                    {/* Geofencing Location GPS Config - Cleaned into a Modal trigger! */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Compass className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700 uppercase">GPS Geofence Boundary</span>
                        </div>
                        <span className="bg-blue-50 text-blue-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-blue-100">
                          {regRadius}m Radius
                        </span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-slate-600">
                            <span className="text-slate-400 font-bold block uppercase text-[8px]">Current Boundary:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              {parseFloat(regLat || '1.6033').toFixed(4)}, {parseFloat(regLng || '110.3547').toFixed(4)}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setShowCourseGpsModal(true)}
                            className="bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-150 py-1.5 px-3 rounded-xl text-[10px] font-bold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1"
                          >
                            📍 Configure GPS & Map
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Start Date & Hours Calculator */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Clock className="w-4.5 h-4.5 text-blue-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase">Syllabus & Hours Calculator</span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">First Class Start Date *</label>
                          <input
                            type="date"
                            required
                            value={regStartDate}
                            onChange={(e) => setRegStartDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                          />
                        </div>

                        <div className="bg-blue-50/60 border border-blue-100/50 p-4 rounded-2xl space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Total Contact Hours</label>
                              <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 42"
                                value={regTotalHours}
                                onChange={(e) => handleTotalHoursChange(e.target.value)}
                                className="w-full bg-white border border-blue-200/60 rounded-xl py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Hours Per Week</label>
                              <input
                                type="number"
                                required
                                step="0.1"
                                min="0.5"
                                placeholder="e.g. 3"
                                value={regHoursPerWeek}
                                onChange={(e) => handleHoursPerWeekChange(e.target.value)}
                                className="w-full bg-white border border-blue-200/60 rounded-xl py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                              />
                            </div>
                          </div>

                          <div className="text-[10px] text-blue-600/80 font-semibold leading-relaxed flex items-start gap-1">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                            <span>Calculated for a standard <strong>14-week</strong> Politeknik lecture semester. Setting either value will automatically solve the other.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-blue-100 flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
                    >
                      <Plus className="w-4 h-4" /> Register Course
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>

          {/* Mobile Only: Account & Profile Section */}
          <div className={`space-y-6 ${activeTab === 'account' ? 'block' : 'hidden'} lg:hidden`}>
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <User className="w-10 h-10 stroke-[1.5px]" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{currentUser?.name}</h3>
              <p className="text-xs text-blue-600 font-bold mb-6">{currentUser?.email}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
                <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Live Classes</span>
                  <span className="text-xl font-black text-slate-800">{sessions.filter(s => s.status === 'active').length}</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Records Audited</span>
                  <span className="text-xl font-black text-slate-800">{records.length}</span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={logout}
                className="w-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out from Portal
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Navigation Menu for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] flex justify-around items-center pt-2.5 pb-4 px-2">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-all cursor-pointer ${
            activeTab === 'sessions' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Clock className={`w-5 h-5 mb-1 transition-all ${activeTab === 'sessions' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Sessions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-all cursor-pointer ${
            activeTab === 'records' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ClipboardList className={`w-5 h-5 mb-1 transition-all ${activeTab === 'records' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Records</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-all cursor-pointer ${
            activeTab === 'courses' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-1 transition-all ${activeTab === 'courses' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Courses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-all cursor-pointer ${
            activeTab === 'account' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className={`w-5 h-5 mb-1 transition-all ${activeTab === 'account' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Account</span>
        </button>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 p-6 flex flex-col max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-bold text-slate-800 text-lg mb-1">Create New Session</h3>
            <p className="text-xs text-slate-400 mb-4">Start a new real-time geofenced attendance session for your class</p>

            {courses.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-4 mt-2">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-800 text-sm">No Registered Courses</h4>
                  <p className="text-[11px] text-amber-600 mt-1 leading-relaxed">
                    All active attendance sessions must inherit their GPS coordinate limits from pre-registered courses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setActiveTab('courses');
                    toast.info("Register a course with its standard classroom coordinates!");
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-100"
                >
                  Go to Course Management First
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full border border-slate-200 text-slate-500 font-semibold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl">
                  <label className="block text-xs font-extrabold text-blue-700 uppercase mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Select Registered Course *
                  </label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => {
                      const courseId = e.target.value;
                      setSelectedCourseId(courseId);
                      if (courseId) {
                        const selectedCourse = courses.find(c => c.id === courseId);
                        if (selectedCourse) {
                          setCourseCode(selectedCourse.code);
                          setCourseName(selectedCourse.name);
                          if (selectedCourse.latitude && selectedCourse.longitude) {
                            setUseGeofencing(true);
                            setLatitude(selectedCourse.latitude.toString());
                            setLongitude(selectedCourse.longitude.toString());
                            setRadius(selectedCourse.radius || 50);
                          } else {
                            setUseGeofencing(false);
                          }
                          setOverrideGeofencing(false);

                          // Find existing sessions for this course to auto-increment week and add date for next week
                          const courseSessions = sessions.filter(
                            s => s.courseCode.toLowerCase() === selectedCourse.code.toLowerCase()
                          );

                          if (courseSessions.length > 0) {
                            // Find latest week and session chronologically
                            let maxWeek = 0;
                            let latestSession = courseSessions[0];

                            courseSessions.forEach(s => {
                              const w = s.week || 0;
                              if (w > maxWeek) {
                                maxWeek = w;
                              }
                              // Find chronologically latest session to add date for next week
                              if (new Date(s.date) > new Date(latestSession.date)) {
                                latestSession = s;
                              }
                            });

                            const nextWeek = Math.min(14, maxWeek + 1);
                            setSessionWeek(nextWeek.toString());

                            try {
                              const lastDate = new Date(latestSession.date);
                              if (!isNaN(lastDate.getTime())) {
                                lastDate.setDate(lastDate.getDate() + 7);
                                setSessionDate(lastDate.toISOString().split('T')[0]);
                                toast.success(`Auto-incremented to Week ${nextWeek} and updated date for next week!`);
                              } else {
                                toast.success(`Loaded settings. Auto-incremented to Week ${nextWeek}!`);
                              }
                            } catch (err) {
                              setSessionDate(new Date().toISOString().split('T')[0]);
                              toast.success(`Loaded settings. Auto-incremented to Week ${nextWeek}!`);
                            }
                          } else {
                            setSessionWeek('1');
                            setSessionDate(new Date().toISOString().split('T')[0]);
                            toast.success(`Loaded settings for ${selectedCourse.code}!`);
                          }
                        }
                      } else {
                        setCourseCode('');
                        setCourseName('');
                        setOverrideGeofencing(false);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-700 font-semibold focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-blue-500 font-medium mt-1">Geofencing location details will be automatically inherited.</p>
                </div>

                {selectedCourseId && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Course Details (GPS Geofencing Active):</p>
                    <p className="font-extrabold text-slate-700">{courseCode} - {courseName}</p>
                    {latitude && longitude && (
                      <p className="text-[10px] text-emerald-600 font-semibold">
                        📍 Location: {courses.find(c => c.id === selectedCourseId)?.location || 'Standard Classroom'} ({radius}m radius)
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Class / Group *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DKM5A"
                    value={classGroup}
                    onChange={(e) => setClassGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Session Details: Week, Date, and Lecture Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lecture Week *</label>
                    <select
                      required
                      value={sessionWeek}
                      onChange={(e) => setSessionWeek(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w.toString()}>
                          Week {w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lecture Date *</label>
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hours Lecture *</label>
                    <select
                      required
                      value={sessionHours}
                      onChange={(e) => setSessionHours(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                    </select>
                  </div>
                </div>

                {/* 14-Week Semester Generation Toggle */}
                <div className="bg-blue-50/40 border border-blue-100/50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="createFullSemester"
                    checked={createFullSemester}
                    onChange={(e) => setCreateFullSemester(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-100 cursor-pointer w-4 h-4"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="createFullSemester" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 select-none">
                      Generate 14-Week Semester Schedule
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Automatically create weekly check-in sessions for weeks 1 to 14. Dates will be calculated spaced 7 days apart from the selected week.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-100"
                  >
                    Start Session
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* POPUP MODAL: Lecturer Review Appeal / MC */}
      {selectedRecordForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Semakan Bukti Kehadiran Pelajar</h4>
                <p className="text-[10px] text-slate-400">Review submitted medical certificates or letters of justification</p>
              </div>
              <button
                onClick={() => {
                  setSelectedRecordForReview(null);
                  setLecturerNotes('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <span className="text-xl font-bold">×</span>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Student Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Nama Pelajar:</span>
                  <strong className="text-slate-800 text-[13px]">{selectedRecordForReview.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">No Matrik:</span>
                  <strong className="text-slate-800 font-mono">{selectedRecordForReview.matricNo}</strong>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Kumpulan Kelas:</span>
                  <strong className="text-slate-800">{selectedRecordForReview.classGroup}</strong>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Jenis Pelepasan:</span>
                  <strong className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                    {selectedRecordForReview.evidenceType === 'sijil_sakit' 
                      ? 'Sijil Sakit (MC)' 
                      : selectedRecordForReview.evidenceType === 'surat_pelepasan' 
                      ? 'Surat Pelepasan Kuliah' 
                      : 'Sebab-sebab Lain'}
                  </strong>
                </div>
              </div>

              {/* Reason / Justification notes */}
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase text-[9px]">Alasan Pelajar:</span>
                <div className="bg-amber-50/40 border border-amber-100/50 p-3 rounded-xl text-xs text-slate-700 italic">
                  &quot; {selectedRecordForReview.evidenceNotes || 'Tiada catatan sebab disediakan.'} &quot;
                </div>
              </div>

              {/* Render simulated file / scanned image */}
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase text-[9px]">Dokumen Lampiran:</span>
                {selectedRecordForReview.evidenceFile ? (
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-100/30 flex flex-col items-center gap-2">
                    {selectedRecordForReview.evidenceFile.startsWith('data:image/') ? (
                      <div className="relative w-full max-h-[160px] overflow-hidden rounded-xl border border-slate-200 flex justify-center items-center bg-white">
                        <img 
                          src={selectedRecordForReview.evidenceFile} 
                          alt="Evidence document" 
                          className="object-contain max-h-[160px]"
                        />
                      </div>
                    ) : (
                      <div className="w-full py-4 px-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{selectedRecordForReview.evidenceFileName || 'dokumen_sokongan.pdf'}</p>
                            <p className="text-[9px] text-slate-400">Document File (Simulated Preview)</p>
                          </div>
                        </div>
                        <a 
                          href={selectedRecordForReview.evidenceFile} 
                          download={selectedRecordForReview.evidenceFileName || 'sijil_sakit.pdf'}
                          className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        >
                          Muat Turun
                        </a>
                      </div>
                    )}
                    <span className="text-[9px] font-mono text-slate-400">Nama Fail: {selectedRecordForReview.evidenceFileName}</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    Tiada fail dokumen dijumpai.
                  </div>
                )}
              </div>

              {/* Decision and Review Comments */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Catatan / Ulasan Pensyarah (Disimpan bersama keputusan)
                </label>
                <textarea
                  rows={2}
                  placeholder="Sila masukkan catatan maklumbalas mengenai permohonan ini..."
                  value={lecturerNotes}
                  onChange={(e) => setLecturerNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleReviewAppeal('rejected')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ✗ Tolak (Absent)
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAppeal('approved')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ✓ Luluskan Kehadiran
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* POPUP SUB-MODAL: Course GPS Geofence Configuration */}
      {showCourseGpsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Configure Course GPS Geofence</h4>
                <p className="text-[10px] text-slate-400">Set standard attendance boundary for this course</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseGpsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campus Location Preset</label>
                <select
                  value={regSelectedPreset}
                  onChange={(e) => handleApplyCoursePreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-700 focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Custom Coordinates --</option>
                  {POLIKU_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={regLat}
                    onChange={(e) => setRegLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={regLng}
                    onChange={(e) => setRegLng(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCurrentCourseLocation}
                disabled={isFetchingCourseGPS}
                className="w-full bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isFetchingCourseGPS ? 'animate-spin text-blue-600' : ''}`} />
                {isFetchingCourseGPS ? 'Fetching GPS...' : 'Capture My GPS Coordinates'}
              </button>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Geofence Radius: {regRadius}m</label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={regRadius}
                  onChange={(e) => setRegRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium px-1 mt-0.5">
                  <span>10m (Room)</span>
                  <span>100m (Hall)</span>
                  <span>300m (Campus)</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                  Interactive Map Picker
                </label>
                <PolikuMap
                  latitude={parseFloat(regLat) || 1.6033}
                  longitude={parseFloat(regLng) || 110.3547}
                  radius={regRadius}
                  interactive={true}
                  onChange={(lat, lng) => {
                    setRegLat(lat.toString());
                    setRegLng(lng.toString());
                  }}
                  height="200px"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCourseGpsModal(false);
                  toast.success(`Course geofence boundary saved!`);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center"
              >
                Confirm & Save Location
              </button>
            </div>
          </motion.div>
        </div>
      )}


    </div>
  );
}
