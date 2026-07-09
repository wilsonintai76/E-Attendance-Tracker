import React, { useState } from 'react';
import { useAppStore, AttendanceSession, AttendanceRecord, Course, AttendanceAlert } from '../lib/store';
import { 
  LogOut, Plus, Users, CheckCircle, Clock, ClipboardList, 
  FileDown, Search, QrCode, BookOpen, Layers, ShieldCheck, RefreshCw,
  MapPin, Navigation, Compass, AlertTriangle, Settings, Info, Check, User,
  LayoutDashboard, Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import * as api from '../lib/api';
import { POLIKU_PRESETS, getCurrentCoordinates } from '../lib/geoUtils';
import PolikuMap from './PolikuMap';
import CourseSessionCard from './CourseSessionCard';
import VersionDisplay from './VersionDisplay';

export default function LecturerDashboard() {
  const { currentUser, sessions, setSessions, records, setRecords, logout, courses = [], setCourses, alerts = [], setAlerts, refreshData } = useAppStore();
  
  // Active Tab for mobile bottom menu & desktop tab toggle
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'records' | 'courses' | 'account' | 'alerts'>('dashboard');

  // Attendance Alert system states
  const [attendanceThreshold, setAttendanceThreshold] = useState(80);
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | 'email' | 'in_app' | 'both'>('all');
  const [warningMessageTemplate, setWarningMessageTemplate] = useState(
    'Amaran Kehadiran: Kehadiran anda untuk {course_name} ({course_code}) setakat ini adalah {attendance_rate}%, iaitu di bawah had minimum {threshold}%. Sila berjumpa dengan pensyarah anda dengan kadar segera.'
  );
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [sendingAlertKey, setSendingAlertKey] = useState<string | null>(null);

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
  const [showRegisterCourseModal, setShowRegisterCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [showSessionGpsModal, setShowSessionGpsModal] = useState(false);
  const [showCourseQRModal, setShowCourseQRModal] = useState(false);
  const [selectedCourseForQR, setSelectedCourseForQR] = useState<Course | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [editSessionDate, setEditSessionDate] = useState('');
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [bulkSession, setBulkSession] = useState<AttendanceSession | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [absentChecked, setAbsentChecked] = useState<Set<string>>(new Set());
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
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
  const [deliveryMode, setDeliveryMode] = useState<'f2f' | 'online'>('f2f');
  
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

    const courseData = {
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

    if (editingCourseId) {
      const isDuplicate = courses.some(
        c => c.code.toLowerCase() === courseData.code.toLowerCase() && c.id !== editingCourseId
      );
      if (isDuplicate) {
        toast.error(`Course with code ${courseData.code} already exists!`);
        return;
      }
      setCourses(courses.map(c =>
        c.id === editingCourseId ? { ...c, ...courseData } : c
      ));
      api.updateCourse(editingCourseId, courseData).then(() => refreshData()).catch(() => {});
      toast.success(`Course ${courseData.code} updated successfully!`);
    } else {
      if (courses.some(c => c.code.toLowerCase() === courseData.code.toLowerCase())) {
        toast.error(`Course with code ${courseData.code} is already registered!`);
        return;
      }
      api.createCourse(courseData).then(() => refreshData()).catch(() => {});
      toast.success(`Course ${courseData.code} registered successfully!`);
    }

    handleCloseCourseModal();
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setRegCode(course.code);
    setRegName(course.name);
    setRegLocation(course.location);
    setRegLat(course.latitude ? course.latitude.toString() : '1.6033');
    setRegLng(course.longitude ? course.longitude.toString() : '110.3547');
    setRegRadius(course.radius || 50);
    setRegStartDate(course.startDate);
    setRegTotalHours(course.totalContactHours.toString());
    setRegHoursPerWeek(course.hoursPerWeek.toString());
    setRegSelectedPreset('');
    setShowRegisterCourseModal(true);
  };

  const handleCloseCourseModal = () => {
    setShowRegisterCourseModal(false);
    setEditingCourseId(null);
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
      api.deleteCourse(courseId).then(() => refreshData()).catch(() => {});
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
          courseId: selectedCourseId || '',
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
          hours: parseFloat(sessionHours) || undefined,
          deliveryMode: deliveryMode
        });
      }
      
      setSessions([...generatedSessions, ...sessions]);
      // Persist all to D1, then refresh to get real IDs
      Promise.all(generatedSessions.map(s =>
        api.createSession({
          courseId: s.courseId,
          courseCode: s.courseCode,
          courseName: s.courseName,
          classGroup: s.classGroup,
          date: s.date,
          startTime: s.startTime,
          code: s.code,
          latitude: s.latitude,
          longitude: s.longitude,
          radius: s.radius,
          week: s.week,
          hours: s.hours,
          deliveryMode: s.deliveryMode,
        }).catch(() => {})
      )).then(() => refreshData()).catch(() => {});
      setShowCreateModal(false);
      toast.success(`Generated 14 weekly sessions for ${courseCode.toUpperCase()}! Week ${chosenWeekNum} is active immediately with code: ${generatedSessions[chosenWeekNum - 1].code}`, {
        duration: 8000
      });
    } else {
      const newSession: AttendanceSession = {
        id: `sess-${Date.now()}`,
        courseId: selectedCourseId || '',
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
        hours: parseFloat(sessionHours) || undefined,
        deliveryMode: deliveryMode
      };

      setSessions([newSession, ...sessions]);
      api.createSession({
        courseId: newSession.courseId,
        courseCode: newSession.courseCode,
        courseName: newSession.courseName,
        classGroup: newSession.classGroup,
        date: newSession.date,
        startTime: newSession.startTime,
        code: newSession.code,
        latitude: newSession.latitude,
        longitude: newSession.longitude,
        radius: newSession.radius,
        week: newSession.week,
        hours: newSession.hours,
        deliveryMode: newSession.deliveryMode,
      }).then(() => refreshData()).catch(() => {});
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
    setDeliveryMode('f2f');
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
    api.completeSession(id).catch(() => {});
    toast.success('Attendance session closed successfully.');
  };

  // Edit session date
  const handleEditSession = (sess: AttendanceSession) => {
    setEditingSession(sess);
    setEditSessionDate(sess.date);
    setShowEditSessionModal(true);
  };

  const handleSaveSessionDate = async () => {
    if (!editingSession) return;
    const updated = sessions.map(s => s.id === editingSession.id ? { ...s, date: editSessionDate } : s);
    setSessions(updated);
    setShowEditSessionModal(false);
    api.updateSession(editingSession.id, { date: editSessionDate }).then(() => refreshData()).catch(() => {});
    toast.success('Session date updated.');
  };

  // Open manual attendance modal
  const handleOpenBulkAttendance = async (sess: AttendanceSession) => {
    setBulkSession(sess);
    setAbsentChecked(new Set());
    setShowBulkAttendanceModal(true);
    setIsLoadingStudents(true);
    try {
      const students = await api.fetchSessionStudents(sess.id);
      setEnrolledStudents(students);
    } catch {
      toast.error('Failed to load enrolled students');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const toggleAbsentCheck = (studentId: string) => {
    setAbsentChecked(prev => {
      const next = new Set(prev);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });
  };

  const handleSubmitBulkAttendance = async () => {
    if (!bulkSession || absentChecked.size === 0) return;
    setIsSubmittingBulk(true);
    try {
      const result = await api.bulkMarkAttendance(bulkSession.id, Array.from(absentChecked));
      toast.success(`Marked ${result.created} student(s) as present.`);
      setShowBulkAttendanceModal(false);
      refreshData();
    } catch {
      toast.error('Failed to submit attendance');
    } finally {
      setIsSubmittingBulk(false);
    }
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
    api.updateRecord(selectedRecordForReview.id, {
      approvalStatus: status,
      approvalNotes: lecturerNotes,
      status: status === 'approved' ? 'present' : 'bermasalah',
    }).catch(() => {});
    toast.success(status === 'approved' 
      ? `Kelulusan Berjaya: Kehadiran ${selectedRecordForReview.studentName} disahkan sebagai HADIR.` 
      : `Pelepasan Ditolak: Kehadiran ${selectedRecordForReview.studentName} ditukar kepada TIDAK HADIR (ABSENT).`
    );
    setSelectedRecordForReview(null);
    setLecturerNotes('');
  };

  // Helper to calculate student lists under the threshold
  const getStudentsBelowThreshold = () => {
    // Collect all students. If none in records, let's use standard default students to simulate beautifully!
    const studentsToScan = [
      { id: 'stud-1', name: 'Ahmad bin Syafiq', matricNo: '20DKM21F1001', classGroup: 'DKM3C', email: 'ahmad@student.poliku.edu.my' },
      { id: 'stud-2', name: 'Chong Wei Ming', matricNo: '20DKM21F1005', classGroup: 'DKM3C', email: 'chong@student.poliku.edu.my' },
      { id: 'stud-3', name: 'Siti Nurhaliza', matricNo: '20DKM21F1012', classGroup: 'DKM5A', email: 'siti@student.poliku.edu.my' },
      { id: 'mock-user-student', name: 'Aiman Hakim', matricNo: '20DKM21F1012', classGroup: 'DKM1C', email: 'aiman@student.poliku.edu.my' }
    ];

    // Ensure we also grab any dynamic student records that were created or are currently registered in records!
    records.forEach(r => {
      if (!studentsToScan.some(s => s.id === r.studentId)) {
        studentsToScan.push({
          id: r.studentId,
          name: r.studentName,
          matricNo: r.matricNo,
          classGroup: r.classGroup,
          email: `${r.studentName.toLowerCase().replace(/\s+/g, '')}@student.poliku.edu.my`
        });
      }
    });

    const result: any[] = [];

    // Loop courses
    courses.forEach(course => {
      // Find completed sessions for this course
      const courseSessions = sessions.filter(s => s.courseCode === course.code && s.status === 'completed');
      if (courseSessions.length === 0) return; // If no sessions are completed yet, skip

      studentsToScan.forEach(student => {
        // Only evaluate if student is in the course's classGroup or has records for this course sessions
        const studentClass = student.classGroup.toUpperCase();
        const hasSessionInClass = courseSessions.some(s => s.classGroup.toUpperCase() === studentClass);
        const hasRecord = records.some(r => {
          const s = sessions.find(sess => sess.id === r.sessionId);
          return r.studentId === student.id && s?.courseCode === course.code;
        });

        if (hasSessionInClass || hasRecord) {
          // Count attendance
          let attendedCount = 0;
          let totalSessionsCount = courseSessions.length;

          courseSessions.forEach(sess => {
            const rec = records.find(r => r.sessionId === sess.id && r.studentId === student.id);
            if (rec) {
              if (rec.status === 'present' || rec.status === 'late') {
                attendedCount++;
              } else if (rec.status === 'bermasalah' && rec.approvalStatus === 'approved') {
                attendedCount++;
              }
            }
          });

          const rate = (attendedCount / totalSessionsCount) * 100;
          const rateFormatted = Math.round(rate * 10) / 10;

          if (rateFormatted < attendanceThreshold) {
            result.push({
              studentId: student.id,
              studentName: student.name,
              studentEmail: student.email,
              matricNo: student.matricNo,
              classGroup: student.classGroup,
              courseCode: course.code,
              courseName: course.name,
              attendedCount,
              totalSessionsCount,
              rate: rateFormatted
            });
          }
        }
      });
    });

    return result;
  };

  const handleSendWarningAlert = (item: any, channel: 'email' | 'in_app' | 'both') => {
    const alertKey = `${item.studentId}-${item.courseCode}`;
    setSendingAlertKey(alertKey);

    // Format template message
    const formattedMessage = warningMessageTemplate
      .replace(/{student_name}/g, item.studentName)
      .replace(/{course_name}/g, item.courseName)
      .replace(/{course_code}/g, item.courseCode)
      .replace(/{attendance_rate}/g, item.rate.toString())
      .replace(/{threshold}/g, attendanceThreshold.toString());

    setTimeout(() => {
      const newAlert: AttendanceAlert = {
        id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentId: item.studentId,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        courseCode: item.courseCode,
        courseName: item.courseName,
        attendanceRate: item.rate,
        threshold: attendanceThreshold,
        timestamp: new Date().toISOString(),
        type: channel,
        message: formattedMessage,
        status: 'sent' as const
      };

      setAlerts([newAlert, ...alerts]);
      api.createAlert(newAlert).catch(() => {});
      setSendingAlertKey(null);
      
      if (channel === 'email') {
        toast.success(`Emel amaran dihantar ke ${item.studentEmail}!`);
      } else if (channel === 'in_app') {
        toast.success(`Notifikasi sistem (in-app) dihantar ke portal ${item.studentName}!`);
      } else {
        toast.success(`Amaran berjaya dipancarkan menerusi Emel & In-App kepada ${item.studentName}!`);
      }
    }, 800);
  };

  const handleSendBulkWarnings = () => {
    const targets = getStudentsBelowThreshold();
    if (targets.length === 0) {
      toast.info('Tiada pelajar yang berada di bawah peratus ambang buat masa ini.');
      return;
    }

    setIsSendingBulk(true);
    
    setTimeout(() => {
      const newAlertsList: any[] = [];
      targets.forEach(item => {
        const formattedMessage = warningMessageTemplate
          .replace(/{student_name}/g, item.studentName)
          .replace(/{course_name}/g, item.courseName)
          .replace(/{course_code}/g, item.courseCode)
          .replace(/{attendance_rate}/g, item.rate.toString())
          .replace(/{threshold}/g, attendanceThreshold.toString());

        newAlertsList.push({
          id: `alert-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          studentId: item.studentId,
          studentName: item.studentName,
          studentEmail: item.studentEmail,
          courseCode: item.courseCode,
          courseName: item.courseName,
          attendanceRate: item.rate,
          threshold: attendanceThreshold,
          timestamp: new Date().toISOString(),
          type: 'both' as const,
          message: formattedMessage,
          status: 'sent' as const
        });
      });

      setAlerts([...newAlertsList, ...alerts]);
      setIsSendingBulk(false);
      toast.success(`Autopilot Selesai: ${targets.length} amaran amaran pukal berjaya disebarkan menerusi Emel & In-App!`);
    }, 1500);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <div className="hidden lg:flex flex-col lg:flex-row items-stretch lg:items-center justify-between border-b border-slate-200/60 pb-5 mb-6 gap-4">
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
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'alerts' 
                  ? 'bg-white text-amber-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Amaran Kehadiran
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
            <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-100 flex flex-col justify-between md:h-57.5 h-auto gap-5">
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
                      <div className="border border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-slate-50/40 min-h-35">
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
                          <div className="flex items-center gap-1">
                            {sess.deliveryMode === 'online' ? (
                              <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Globe className="w-2 h-2" /> ONLINE
                              </span>
                            ) : (
                              <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Users className="w-2 h-2" /> F2F
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md">Week {sess.week || 1}</span>
                          </div>
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

          {/* ==================== COURSE-CENTRIC SESSIONS VIEW ==================== */}
          <div className={`space-y-4 lg:col-span-3 ${activeTab === 'sessions' ? 'block' : 'hidden'}`}>
            {courses.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
                <p className="text-sm font-medium text-slate-400">Register a course first in Course Management.</p>
              </div>
            ) : (
              courses.map((course) => (
                <CourseSessionCard
                  key={course.id}
                  course={course}
                  sessions={sortedSessions.filter(s =>
                    (s.courseCode || '').toLowerCase() === (course.code || '').toLowerCase()
                  )}
                  onSessionsChange={(newSessions) => {
                    const other = sortedSessions.filter(s =>
                      (s.courseCode || '').toLowerCase() !== (course.code || '').toLowerCase()
                    );
                    setSessions([...newSessions, ...other]);
                  }}
                  onEditSession={handleEditSession}
                  onBulkAttendance={handleOpenBulkAttendance}
                  onCloseSession={handleCloseSession}
                  onOpenSession={handleOpenSession}
                />
              ))
            )}
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
                        {s.courseCode} ({s.classGroup}) - {s.courseName} {s.week ? `[Wk ${s.week}]` : ''} {s.deliveryMode === 'online' ? '(ONLINE)' : '(F2F)'}
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

              {/* Desktop Table Layout */}
              <div className="hidden md:block border border-slate-100 rounded-2xl overflow-hidden flex-1">
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

              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    No attendance records match the selected criteria.
                  </div>
                ) : (
                  filteredRecords.map((rec) => {
                    const sess = sessions.find(s => s.id === rec.sessionId);
                    const isBermasalah = rec.status === 'bermasalah';
                    return (
                      <div key={rec.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm hover:border-blue-200 transition-all flex flex-col">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm">{rec.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{rec.matricNo} • {rec.classGroup}</p>
                          </div>
                          <span className={`text-[9px] font-black inline-block px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            rec.status === 'present' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : rec.status === 'late'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                              : rec.status === 'absent'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          }`}>
                            {rec.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50/55 p-2.5 rounded-xl border border-slate-100/50">
                          <div>
                            <span className="text-slate-400 block font-bold text-[8px] uppercase mb-0.5">Subject</span>
                            <span className="font-bold text-slate-700">{sess ? sess.courseCode : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold text-[8px] uppercase mb-0.5">Checked In</span>
                            <span className="text-slate-600 font-bold">
                              {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5 mt-1">
                          <div>
                            {rec.latitude && rec.longitude ? (
                              <span className={`font-extrabold flex items-center gap-1 ${
                                rec.inGeofence ? 'text-green-600' : 'text-amber-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rec.inGeofence ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                {rec.inGeofence ? 'Verified Range' : `${Math.round(rec.distanceToCenter || 0)}m Out of Range`}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No GPS Data</span>
                            )}
                          </div>

                          {/* Mobile Action Trigger */}
                          {isBermasalah && (
                            <div>
                              {rec.approvalStatus === 'none' || !rec.approvalStatus ? (
                                <span className="text-[10px] text-slate-400 font-bold italic">Awaiting MC</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordForReview(rec);
                                    setLecturerNotes(rec.approvalNotes || '');
                                  }}
                                  className={`font-black text-[10px] py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                                    rec.approvalStatus === 'pending'
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : rec.approvalStatus === 'approved'
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {rec.approvalStatus === 'pending' ? 'Review MC' : rec.approvalStatus === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* COURSE MANAGEMENT TAB VIEW */}
          <div className={`space-y-6 ${activeTab === 'courses' ? 'block lg:col-span-3' : 'hidden'}`}>
            <div className="w-full space-y-6">
              
              {/* Registered Courses list */}
              <div className="w-full space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Registered Course List</h3>
                      <p className="text-xs text-slate-400">Standard 14-Week Politeknik Courses and Geofence coordinates</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" /> {courses.length} Active Courses
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditingCourseId(null); setShowRegisterCourseModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-100"
                      >
                        <Plus className="w-4 h-4" /> Register New Course
                      </button>
                    </div>
                  </div>

                  {courses.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                      <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-20 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-500">No Registered Courses</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Click &quot;Register New Course&quot; above to specify your course codes, contact hours, and geofencing coordinates.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {courses.map((course) => (
                        <div key={course.id} className="border border-slate-100 hover:border-blue-100 hover:shadow-sm rounded-2xl p-5 bg-slate-50/20 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">
                                {course.code}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditCourse(course)}
                                  className="text-slate-300 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                                  title="Edit Course"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                  title="Delete Course"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              </div>
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
                            
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCourseForQR(course);
                                setShowCourseQRModal(true);
                              }}
                              className="w-full mt-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold py-2 px-3 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-blue-200/40 shadow-3xs"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Papar Kod QR Kursus (Course QR)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ==================== AUTOMATED ATTENDANCE ALERTS TAB VIEW ==================== */}
          <div className={`space-y-6 lg:col-span-3 ${activeTab === 'alerts' ? 'block' : 'hidden'}`}>
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-full animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                    Sistem Amaran & Notifikasi Kehadiran
                  </h3>
                  <p className="text-xs text-slate-400">Automate warnings & email alerts for students falling below minimum academic attendance thresholds</p>
                </div>

                <button
                  type="button"
                  disabled={isSendingBulk}
                  onClick={handleSendBulkWarnings}
                  className="self-start md:self-auto bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-400 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs shadow-md shadow-amber-100 transition-all cursor-pointer"
                >
                  {isSendingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memancar Amaran Pukal...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Autopilot: Amaran Pukal (Bulk Scan & Warn)
                    </>
                  )}
                </button>
              </div>

              {/* Threshold Adjuster and Message Template Config Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Threshold control card */}
                <div className="bg-slate-50/60 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label htmlFor="attendanceThreshold" className="block text-xs font-extrabold text-slate-500 uppercase mb-2">Ambang Kehadiran Minimum</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="attendanceThreshold"
                        name="attendanceThreshold"
                        type="range"
                        min="50"
                        max="100"
                        value={attendanceThreshold}
                        onChange={(e) => setAttendanceThreshold(parseInt(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl whitespace-nowrap">
                        {attendanceThreshold}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2.5">
                      Standard Politeknik memerlukan minimum <strong>80.0%</strong> kehadiran kuliah bagi melayakkan menduduki peperiksaan akhir.
                    </p>
                  </div>
                </div>

                {/* Message template card */}
                <div className="bg-slate-50/60 border border-slate-100 p-5 rounded-2xl md:col-span-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="warningMessageTemplate" className="block text-xs font-extrabold text-slate-500 uppercase">Templat Mesej Amaran</label>
                    <span className="text-[9px] text-blue-600 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-100 font-sans">Pembolehubah Aktif</span>
                  </div>
                  <textarea
                    id="warningMessageTemplate"
                    name="warningMessageTemplate"
                    value={warningMessageTemplate}
                    onChange={(e) => setWarningMessageTemplate(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Mesej amaran..."
                  />
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-bold text-slate-400 font-mono">
                    <span className="bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">{`{student_name}`}</span>
                    <span className="bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">{`{course_name}`}</span>
                    <span className="bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">{`{course_code}`}</span>
                    <span className="bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">{`{attendance_rate}`}</span>
                    <span className="bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">{`{threshold}`}</span>
                  </div>
                </div>
              </div>

              {/* Scan Workspace and Historical Logs */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left side Workspace: Current under-threshold students */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/10">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        Senarai Pelajar Di Bawah Ambang ({getStudentsBelowThreshold().length})
                      </span>
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                        Di Bawah {attendanceThreshold}%
                      </span>
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Nama Pelajar</th>
                            <th className="py-2.5 px-4">Kod & Kursus</th>
                            <th className="py-2.5 px-4 text-center">Kuliah Hadir / Jumlah</th>
                            <th className="py-2.5 px-4 text-center">Peratus</th>
                            <th className="py-2.5 px-4 text-center">Tindakan Amaran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                          {getStudentsBelowThreshold().length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-12 text-slate-400 font-semibold italic">
                                Sempurna! Tiada pelajar di bawah ambang {attendanceThreshold}% kehadiran setakat sesi yang selesai.
                              </td>
                            </tr>
                          ) : (
                            getStudentsBelowThreshold().map((item) => {
                              const alertKey = `${item.studentId}-${item.courseCode}`;
                              const isSendingThis = sendingAlertKey === alertKey;
                              
                              return (
                                <tr key={`${item.studentId}-${item.courseCode}`} className="hover:bg-slate-50/50 transition-all">
                                  <td className="py-3 px-4">
                                    <p className="font-bold text-slate-800">{item.studentName}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.matricNo} • {item.classGroup}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black text-[9px] mr-1 font-mono">
                                      {item.courseCode}
                                    </span>
                                    <span className="font-semibold text-slate-600">{item.courseName}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                                    {item.attendedCount} / {item.totalSessionsCount} Sesi
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="bg-rose-50 text-rose-700 border border-rose-100 font-black px-2 py-1 rounded-xl">
                                      {item.rate}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={isSendingThis}
                                        onClick={() => handleSendWarningAlert(item, 'both')}
                                        className="bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:bg-amber-400 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        {isSendingThis ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <AlertTriangle className="w-3 h-3" />
                                        )}
                                        Hantar Amaran
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="block md:hidden p-4 space-y-4">
                      {getStudentsBelowThreshold().length === 0 ? (
                        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50 italic text-xs font-semibold">
                          Sempurna! Tiada pelajar di bawah ambang {attendanceThreshold}% kehadiran setakat sesi yang selesai.
                        </div>
                      ) : (
                        getStudentsBelowThreshold().map((item) => {
                          const alertKey = `${item.studentId}-${item.courseCode}`;
                          const isSendingThis = sendingAlertKey === alertKey;
                          
                          return (
                            <div key={`${item.studentId}-${item.courseCode}`} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-xs">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-extrabold text-slate-800 text-sm">{item.studentName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{item.matricNo} • {item.classGroup}</p>
                                </div>
                                <span className="bg-rose-50 text-rose-700 border border-rose-100 font-black px-2 py-0.5 rounded-lg text-[10px]">
                                  {item.rate}% Rate
                                </span>
                              </div>

                              <div className="text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 space-y-1 text-slate-600">
                                <p><span className="font-bold text-slate-700">Course:</span> {item.courseCode} - {item.courseName}</p>
                                <p><span className="font-bold text-slate-700">Sessions Attended:</span> <span className="font-bold text-slate-800">{item.attendedCount} / {item.totalSessionsCount}</span></p>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  disabled={isSendingThis}
                                  onClick={() => handleSendWarningAlert(item, 'both')}
                                  className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:bg-amber-400 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {isSendingThis ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  )}
                                  Hantar Surat Amaran
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side Log History of sent warnings */}
                <div className="xl:col-span-1 space-y-4">
                  <div className="border border-slate-100 rounded-3xl p-5 bg-slate-50/40 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Sejarah Amaran Dihantar</h4>
                        <p className="text-[10px] text-slate-400">Log notifikasi rasmi pelajar</p>
                      </div>

                      {alerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Padam semua rekod log amaran?')) {
                              setAlerts([]);
                              toast.success('Log sejarah amaran berjaya dibersihkan.');
                            }
                          }}
                          className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          Clear Logs
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-87.5 overflow-y-auto pr-1">
                      {alerts.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs italic">
                          Tiada rekod amaran yang dihantar lagi hari ini.
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div key={alert.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition-all">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h5 className="font-bold text-slate-800 text-xs leading-tight">{alert.studentName}</h5>
                                <p className="text-[10px] text-slate-400 mt-0.5">{alert.studentEmail}</p>
                              </div>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                {alert.courseCode}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-600 bg-amber-50/50 border border-amber-100/30 p-2 rounded-xl leading-relaxed font-medium">
                              {alert.message}
                            </p>

                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold border-t border-slate-50 pt-2">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Terhantar (Email & In-App)
                              </span>
                              <span>
                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'sessions' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Clock className={`w-5 h-5 mb-1 transition-all ${activeTab === 'sessions' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Sessions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'records' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ClipboardList className={`w-5 h-5 mb-1 transition-all ${activeTab === 'records' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Records</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'courses' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-1 transition-all ${activeTab === 'courses' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Courses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'alerts' ? 'text-amber-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 mb-1 transition-all ${activeTab === 'alerts' ? 'text-amber-500 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-14 transition-all cursor-pointer ${
            activeTab === 'account' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className={`w-5 h-5 mb-1 transition-all ${activeTab === 'account' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Account</span>
        </button>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full sm:max-w-md border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
          >
            <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">Create Live Session</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Start a geofenced attendance session</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg font-bold transition-all cursor-pointer shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="p-5 sm:p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-4">
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
              </div>
            ) : (
              <form id="create-session-form" onSubmit={handleCreateSession} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-3.5">
                <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl">
                  <label htmlFor="selectedCourseId" className="text-xs font-extrabold text-blue-700 uppercase mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Select Registered Course *
                  </label>
                  <select
                    id="selectedCourseId"
                    name="selectedCourseId"
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
                  <label htmlFor="classGroup" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Class / Group *</label>
                  <input
                    id="classGroup"
                    name="classGroup"
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
                    <label htmlFor="sessionWeek" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lecture Week *</label>
                    <select
                      id="sessionWeek"
                      name="sessionWeek"
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
                    <label htmlFor="sessionDate" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lecture Date *</label>
                    <input
                      id="sessionDate"
                      name="sessionDate"
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="sessionHours" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hours Lecture *</label>
                    <select
                      id="sessionHours"
                      name="sessionHours"
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

                {/* Delivery Mode: Face to Face vs Online */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-2">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Mod Kuliah / Delivery Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('f2f')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        deliveryMode === 'f2f'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">👥</span> F2F / Bersemuka
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('online')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        deliveryMode === 'online'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">🌐</span> Online / Atas Talian
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                    * Jika memilih <strong className="text-blue-600">Online</strong>, pelajar dibenarkan mendaftar kehadiran dari mana-mana lokasi tanpa dianggap &quot;Kehadiran Bermasalah&quot; (Bypass Geofencing).
                  </p>
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
              </form>
            )}

            {/* Sticky Footer Buttons — outside scrollable form */}
            {courses.length > 0 && (
            <div className="shrink-0 p-5 sm:p-6 pt-0 border-t border-slate-100">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="create-session-form"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-100"
                  >
                    Start Session
                  </button>
                </div>
            </div>
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
                {selectedRecordForReview.evidenceFileKey ? (
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-100/30 flex flex-col items-center gap-2">
                    {selectedRecordForReview.evidenceFileKey.startsWith('data:image/') ? (
                      <div className="relative w-full max-h-40 overflow-hidden rounded-xl border border-slate-200 flex justify-center items-center bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={selectedRecordForReview.evidenceFileKey} 
                          alt="Evidence document" 
                          className="object-contain max-h-40"
                        />
                      </div>
                    ) : (
                      <div className="w-full py-4 px-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="text-xs font-bold text-slate-700 truncate max-w-50">{selectedRecordForReview.evidenceFileName || 'dokumen_sokongan.pdf'}</p>
                            <p className="text-[9px] text-slate-400">Document File (Simulated Preview)</p>
                          </div>
                        </div>
                        <a 
                          href={selectedRecordForReview.evidenceFileKey} 
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
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
                <label htmlFor="campusPreset" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campus Location Preset</label>
                <select
                  id="campusPreset"
                  name="campusPreset"
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
                  <label htmlFor="regLat" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                  <input
                    id="regLat"
                    name="regLat"
                    type="number"
                    step="0.000001"
                    required
                    value={regLat}
                    onChange={(e) => setRegLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="regLng" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                  <input
                    id="regLng"
                    name="regLng"
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
                  <label htmlFor="regRadius" className="block text-[10px] font-bold text-slate-400 uppercase">Geofence Radius: {regRadius}m</label>
                </div>
                <input
                  id="regRadius"
                  name="regRadius"
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
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
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


      {/* POPUP MODAL: Show Course QR Code */}
      {showCourseQRModal && selectedCourseForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-sm">Kod QR Pendaftaran Kursus</h4>
                <p className="text-[10px] text-slate-400">Scan this QR code using the student portal to enroll.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCourseQRModal(false);
                  setSelectedCourseForQR(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-blue-50/50 text-blue-700 rounded-2xl p-3 w-full text-xs font-semibold">
                Kursus: <span className="font-extrabold text-blue-900">{selectedCourseForQR.code} - {selectedCourseForQR.name}</span>
              </div>

              {/* Real dynamic QR Code generated via qrserver.com */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-xs relative flex items-center justify-center w-57.5 h-57.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=enroll:${selectedCourseForQR.id}`}
                  alt={`QR Code for ${selectedCourseForQR.code}`}
                  className="w-50 h-50"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Imbas Untuk Mendaftar (Scan to Enroll)</p>
                <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                  Tunjukkan kod QR ini kepada pelajar di dalam bilik kuliah. Pelajar boleh menggunakan ciri <strong>Imbas QR</strong> pada portal pelajar untuk mendaftar masuk ke kursus ini secara automatik.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 w-full space-y-1 text-left text-[11px] text-slate-500">
                <p className="flex justify-between font-medium">
                  <span>Kod Kursus:</span>
                  <strong className="text-slate-700">{selectedCourseForQR.code}</strong>
                </p>
                <p className="flex justify-between font-medium">
                  <span>Lokasi Rasmi:</span>
                  <strong className="text-slate-700">{selectedCourseForQR.location}</strong>
                </p>
                <p className="flex justify-between font-medium">
                  <span>Silibus Kuliah:</span>
                  <strong className="text-slate-700">{selectedCourseForQR.totalContactHours} Jam (14 Minggu)</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCourseQRModal(false);
                  setSelectedCourseForQR(null);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Tutup (Close)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Edit Session Date */}
      {showEditSessionModal && editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h4 className="font-bold text-slate-800 mb-4">Edit Session Date</h4>
            <p className="text-xs text-slate-500 mb-4">{editingSession.courseCode} — Week {editingSession.week}</p>
            <label htmlFor="editSessionDate" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date</label>
            <input id="editSessionDate" name="editSessionDate" type="date" required
              value={editSessionDate} onChange={(e) => setEditSessionDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-100" />
            <div className="flex gap-2">
              <button onClick={() => setShowEditSessionModal(false)}
                className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2 rounded-xl text-xs hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={handleSaveSessionDate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer">Save</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Manual Attendance (tick absent students) */}
      {showBulkAttendanceModal && bulkSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 shrink-0">
              <h4 className="font-bold text-slate-800">Manual Attendance</h4>
              <p className="text-xs text-slate-400 mt-0.5">{bulkSession.courseCode} — Week {bulkSession.week} — {bulkSession.date}</p>
            </div>
            <div className="overflow-y-auto p-5 space-y-2">
              {isLoadingStudents ? (
                <div className="text-center py-8 text-slate-400">Loading students...</div>
              ) : enrolledStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No enrolled students found for this class.</div>
              ) : (
                enrolledStudents.map((s: any) => (
                  <label key={s.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      s.record_status === 'present' ? 'bg-green-50 border-green-100 opacity-60' :
                      absentChecked.has(s.id) ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 hover:bg-white'
                    }`}
                  >
                    <input type="checkbox" checked={absentChecked.has(s.id)} onChange={() => toggleAbsentCheck(s.id)}
                      disabled={s.record_status === 'present'}
                      className="w-4 h-4 rounded accent-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.matric_no || s.email}</p>
                    </div>
                    {s.record_status === 'present' ? (
                      <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Present</span>
                    ) : (
                      <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">Absent</span>
                    )}
                  </label>
                ))
              )}
            </div>
            <div className="p-5 border-t border-slate-100 shrink-0 flex gap-2">
              <button onClick={() => setShowBulkAttendanceModal(false)}
                className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl text-xs cursor-pointer">Cancel</button>
              <button onClick={handleSubmitBulkAttendance} disabled={absentChecked.size === 0 || isSubmittingBulk}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer">
                {isSubmittingBulk ? 'Saving...' : `Mark ${absentChecked.size} Present`}
              </button>
            </div>
          </motion.div>
        </div>
      )}


      {/* POPUP MODAL: Register Course Form Dialog */}
      {showRegisterCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-sm">{editingCourseId ? 'Edit Course' : 'Register New Course'}</h4>
                <p className="text-[10px] text-slate-400">{editingCourseId ? 'Update curriculum specifications and GPS boundaries' : 'Set curriculum specifications, location, and standard Politeknik contact hours.'}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCourseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterCourse} className="flex flex-col min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div>
                  <label htmlFor="regCode" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Code *</label>
                  <input
                    id="regCode"
                    name="regCode"
                    type="text"
                    required
                    placeholder="e.g. DKM5012"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="regName" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Name *</label>
                  <input
                    id="regName"
                    name="regName"
                    type="text"
                    required
                    placeholder="e.g. Thermodynamics II"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="regLocation" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classroom Location *</label>
                  <input
                    id="regLocation"
                    name="regLocation"
                    type="text"
                    required
                    placeholder="e.g. JKM Bilik Kuliah 1"
                    value={regLocation}
                    onChange={(e) => setRegLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Geofencing Location GPS Config */}
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
                      <label htmlFor="regStartDate" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">First Class Start Date *</label>
                      <input
                        id="regStartDate"
                        name="regStartDate"
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
                          <label htmlFor="regTotalHours" className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Total Contact Hours</label>
                          <input
                            id="regTotalHours"
                            name="regTotalHours"
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
                          <label htmlFor="regHoursPerWeek" className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Hours Per Week</label>
                          <input
                            id="regHoursPerWeek"
                            name="regHoursPerWeek"
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
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setShowRegisterCourseModal(false)}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Register Course
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <VersionDisplay />

    </div>
  );
}
