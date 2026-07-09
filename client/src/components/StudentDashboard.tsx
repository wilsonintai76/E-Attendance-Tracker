import React, { useState, useEffect } from 'react';
import { useAppStore, AttendanceRecord, AttendanceSession, Course } from '../lib/store';
import { 
  LogOut, ShieldCheck, CheckCircle2, Award, ClipboardCheck, 
  MapPin, HelpCircle, Save, ArrowRight, BookOpen, Clock,
  Navigation, Compass, AlertTriangle, Info, Check, User,
  Activity, Wifi, Bell, QrCode, Camera, Globe, Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import * as api from '../lib/api';
import { calculateDistance, getCurrentCoordinates } from '../lib/geoUtils';
import PolikuMap from './PolikuMap';
import VersionDisplay from './VersionDisplay';

export default function StudentDashboard() {
  const { currentUser, setCurrentUser, sessions, setSessions, records, setRecords, logout, alerts = [], setAlerts, courses = [], setCourses, refreshData } = useAppStore();
  
  // Active Tab for mobile bottom menu
  const [activeTab, setActiveTab] = useState<'checkin' | 'courses' | 'history' | 'profile'>('checkin');

  // Notifications tray toggle
  const [showNotifications, setShowNotifications] = useState(false);

  // Checking state
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedInSession, setCheckedInSession] = useState<AttendanceSession | null>(null);


  // Push Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser does not support desktop notifications');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Push notification permission denied.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Monitor for newly opened sessions
  const prevSessionsRef = React.useRef<AttendanceSession[]>([]);
  useEffect(() => {
    if (!currentUser || prevSessionsRef.current.length === 0) {
      prevSessionsRef.current = sessions;
      return;
    }

    const enrolledCourseIds = currentUser?.enrolledCourses || [];
    const activeSessions = sessions.filter(s => s.status === 'active' && enrolledCourseIds.includes(s.courseId));
    const newActiveSessions = activeSessions.filter(activeSess => {
      const prevSess = prevSessionsRef.current.find(p => p.id === activeSess.id);
      return !prevSess || prevSess.status !== 'active';
    });

    if (newActiveSessions.length > 0) {
      newActiveSessions.forEach(sess => {
        const msg = `Lecturer has opened check-in for ${sess.courseCode} (${sess.courseName})!`;
        toast.info('New Attendance Session Opened', {
          description: msg,
          icon: <Bell className="text-blue-500 w-5 h-5" />,
          duration: 10000,
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Course E-Attendance', {
            body: msg,
          });
        }
      });
    }

    prevSessionsRef.current = sessions;
  }, [sessions, currentUser]);

  // Course Enrollment & QR Scanner States
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [scannerMode, setScannerMode] = useState<'camera' | 'simulation' | 'manual'>('simulation');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [manualCourseCode, setManualCourseCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCourse, setScannedCourse] = useState<Course | null>(null);
  const [scanningSuccess, setScanningSuccess] = useState(false);

  const startCamera = async () => {
    try {
      setCameraPermission('prompt');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setVideoStream(stream);
      setCameraPermission('granted');
      setTimeout(() => {
        const video = document.getElementById('qr-video') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(e => console.log('Video play error:', e));
        }
      }, 200);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraPermission('denied');
      setScannerMode('simulation');
      toast.error('Gagal mengakses kamera peranti. Mod simulasi diaktifkan.');
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  useEffect(() => {
    if (showScannerModal && scannerMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScannerModal, scannerMode]);

  const handleEnrollInCourse = async (courseId: string) => {
    if (!currentUser) return;
    
    const enrolledCourseIds = currentUser.enrolledCourses || [];
    if (enrolledCourseIds.includes(courseId)) {
      toast.info('Anda sudah pun berdaftar untuk kursus ini!');
      return;
    }

    const courseToEnroll = allCourses.find(c => c.id === courseId) || courses.find(c => c.id === courseId);
    const courseName = courseToEnroll ? `${courseToEnroll.code} - ${courseToEnroll.name}` : 'kursus';

    // Optimistic update
    const updatedUser = { ...currentUser, enrolledCourses: [...enrolledCourseIds, courseId] };
    setCurrentUser(updatedUser);

    try {
      await api.enrollInCourse(courseId);
      toast.success(`Berjaya mendaftar ke ${courseName}!`);
      // Refresh to sync with server
      setShowScannerModal(false);
      refreshData();
    } catch (err: any) {
      // Revert on 409 (already enrolled) or other errors
      setCurrentUser(currentUser);
      if (err.message?.includes('409') || err.message?.includes('Already')) {
        toast.info('Anda sudah pun berdaftar untuk kursus ini!');
      } else {
        toast.error('Gagal mendaftar kursus.');
      }
    }
  };

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCourseCode.trim()) return;

    try {
      // Search via API — looks up by course code directly
      const { course, alreadyEnrolled } = await api.scanQRCode(manualCourseCode.trim().toUpperCase());
      if (alreadyEnrolled) {
        toast.info('Anda sudah pun berdaftar untuk kursus ini!');
        setManualCourseCode('');
        setShowScannerModal(false);
        return;
      }
      handleEnrollInCourse(course.id);
      setManualCourseCode('');
      setShowScannerModal(false);
    } catch {
      toast.error('Kod kursus tidak sah. Sila pastikan anda memasukkan kod yang betul (Contoh: DJJ31022).');
    }
  };

  const handleSimulatedScan = (course: Course) => {
    setIsScanning(true);
    setScannedCourse(course);
    setScanningSuccess(false);

    // Simulate standard laser scan and beep delay
    setTimeout(() => {
      setIsScanning(false);
      setScanningSuccess(true);
      
      setTimeout(() => {
        handleEnrollInCourse(course.id);
        setShowScannerModal(false);
        setScannedCourse(null);
        setScanningSuccess(false);
      }, 1200);
    }, 1500);
  };

  // Edit profile info (Matric & Class)
  const [isEditingProfile, setIsEditingProfile] = useState(!currentUser?.matricNo || !currentUser?.classGroup);
  const [matricNo, setMatricNo] = useState(currentUser?.matricNo || '');
  const [classGroup, setClassGroup] = useState(currentUser?.classGroup || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // GPS & Geofencing states
  const [studentLat, setStudentLat] = useState<number | null>(null);
  const [studentLng, setStudentLng] = useState<number | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [bypassGeofence, setBypassGeofence] = useState(false);
  const [showOutOfZoneConfirm, setShowOutOfZoneConfirm] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported' | 'checking' | null>('checking');

  // Course Enrollment calculations
  const enrolledCourseIds = currentUser?.enrolledCourses || [];
  const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const enrolledCourseCodes = enrolledCourses.map(c => c.code.toUpperCase());

  // Find active live sessions and geofence state variables (filtered to enrolled courses)
  const activeSessions = sessions.filter(
    s => s.status === 'active' && enrolledCourseCodes.includes((s.courseCode || '').toUpperCase())
  );
  const targetSession = sessions.find(s => s.id === selectedSessionId);
  const isGeofenced = !!(targetSession?.latitude && targetSession?.longitude);
  
  const computedDistance = (studentLat !== null && studentLng !== null && targetSession?.latitude && targetSession?.longitude)
    ? calculateDistance(studentLat, studentLng, targetSession.latitude, targetSession.longitude)
    : null;
    
  const isInsideGeofence = (computedDistance !== null && targetSession?.radius)
    ? computedDistance <= targetSession.radius
    : true;

  // Monitor browser geolocation permissions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      return;
    }

    if (!navigator.permissions || !navigator.permissions.query) {
      setPermissionState('prompt');
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    const updatePermission = () => {
      if (permissionStatus) {
        setPermissionState(permissionStatus.state);
      }
    };

    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        permissionStatus = status;
        setPermissionState(status.state);
        status.addEventListener('change', updatePermission);
      })
      .catch((err) => {
        console.error('Error querying geolocation permission:', err);
        setPermissionState('prompt');
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', updatePermission);
      }
    };
  }, []);

  const getStudentLocation = React.useCallback(async () => {
    setIsFetchingLocation(true);
    setLocationError(null);
    try {
      const pos = await getCurrentCoordinates();
      setStudentLat(pos.coords.latitude);
      setStudentLng(pos.coords.longitude);
      setGpsAccuracy(pos.coords.accuracy);
      setLastLocationUpdate(new Date().toLocaleTimeString());
      setPermissionState('granted');
      toast.success('Sistem berjaya mengesan koordinat GPS terkini anda!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 1) {
        setPermissionState('denied');
      }
      setLocationError(err.message || 'Gagal mengakses GPS. Sila pastikan kebenaran lokasi dibenarkan.');
      toast.error('Gagal mendapatkan koordinat GPS. Sila benarkan akses lokasi pada peranti anda.');
    } finally {
      setIsFetchingLocation(false);
    }
  }, []);

  // Automatically manage live background GPS tracking when a class session is active and geofenced
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let activeWatchId: number | null = null;

    if (selectedSessionId) {
      setBypassGeofence(false);
      
      // Fetch initial single shot location immediately
      getStudentLocation().catch(() => {});

      // If geofencing is required, automatically start high-accuracy live background tracking
      if (isGeofenced && navigator.geolocation) {
        setIsWatchingLocation(true);
        activeWatchId = navigator.geolocation.watchPosition(
          (position) => {
            setStudentLat(position.coords.latitude);
            setStudentLng(position.coords.longitude);
            setGpsAccuracy(position.coords.accuracy);
            setLastLocationUpdate(new Date().toLocaleTimeString());
            setLocationError(null);
            setPermissionState('granted');
          },
          (err) => {
            console.error('Background automatic GPS watch failed:', err);
            setLocationError(err.message || 'Ralat mendapatkan lokasi automatik.');
            setIsWatchingLocation(false);
            if (err.code === 1) {
              setPermissionState('denied');
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
        setWatchId(activeWatchId);
      }
    } else {
      // Reset GPS states when no class is selected
      setStudentLat(null);
      setStudentLng(null);
      setGpsAccuracy(null);
      setLastLocationUpdate(null);
      setIsWatchingLocation(false);
      setWatchId(null);
    }

    return () => {
      if (activeWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(activeWatchId);
      }
    };
  }, [selectedSessionId, isGeofenced, getStudentLocation]);

  // Appeal & Evidence States
  const [selectedRecordForAppeal, setSelectedRecordForAppeal] = useState<AttendanceRecord | null>(null);
  const [evidenceType, setEvidenceType] = useState<'sijil_sakit' | 'surat_pelepasan' | 'lain_lain' | ''>('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<string>('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  // Auto-switch to profile tab on mobile if registration is incomplete
  useEffect(() => {
    if (isEditingProfile) {
      setActiveTab('profile');
    }
  }, [isEditingProfile]);

  // Handle saving profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricNo || !classGroup) {
      toast.error('Both Matric No. and Class/Group are required');
      return;
    }

    const updateData = {
      matricNo: matricNo.toUpperCase(),
      classGroup: classGroup.toUpperCase(),
      phone: phone.trim(),
    };

    // Optimistic local update
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updateData, phone: updateData.phone });
    }

    // Persist to D1 via API
    try {
      const updatedUser = await api.updateProfile(updateData);
      setCurrentUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch {
      toast.success('Profile saved locally');
    }
    setIsEditingProfile(false);
  };

  // Handle check-in submit
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      toast.error('Please select an active class session');
      return;
    }

    if (!targetSession) {
      toast.error('Class session not found');
      return;
    }

    if (targetSession.status !== 'active') {
      toast.error('This attendance session is already closed');
      return;
    }

    // Check if already checked in
    const alreadyChecked = records.some(r => r.sessionId === selectedSessionId && r.studentId === currentUser?.id);
    if (alreadyChecked) {
      toast.warning('You have already recorded your attendance for this class.');
      return;
    }

    setIsSubmitting(true);

    let finalLat = studentLat;
    let finalLng = studentLng;

    // Check/Retrieve GPS Location before check-in is complete
    if (isGeofenced && (finalLat === null || finalLng === null)) {
      toast.loading('Checking GPS permissions and acquiring coordinates...', { id: 'gps-check' });
      try {
        const pos = await getCurrentCoordinates();
        finalLat = pos.coords.latitude;
        finalLng = pos.coords.longitude;
        setStudentLat(finalLat);
        setStudentLng(finalLng);
        toast.dismiss('gps-check');
        toast.success('GPS coordinates verified successfully!');
      } catch (err: any) {
        toast.dismiss('gps-check');
        setIsSubmitting(false);
        console.error(err);
        toast.error('Sistem gagal menyemak lokasi GPS anda. Kelas ini memerlukan pengesahan lokasi GPS. Sila pastikan kebenaran lokasi pada peranti dibenarkan.');
        return;
      }
    }

    // Recalculate distance and fence status based on finalized coordinates
    const finalDistance = (finalLat !== null && finalLng !== null && targetSession?.latitude && targetSession?.longitude)
      ? calculateDistance(finalLat, finalLng, targetSession.latitude, targetSession.longitude)
      : null;

    const finalIsInside = (finalDistance !== null && targetSession?.radius)
      ? finalDistance <= targetSession.radius
      : true;

    // Show warning confirmation if student is out-of-zone and it's NOT an online session
    if (isGeofenced && !finalIsInside && targetSession?.deliveryMode !== 'online') {
      setShowOutOfZoneConfirm(true);
      return;
    }

    // Proceed to register check-in
    proceedCheckIn(finalLat, finalLng, finalDistance, finalIsInside);
  };

  const proceedCheckIn = async (
    finalLat: number | null, 
    finalLng: number | null, 
    finalDistance: number | null, 
    finalIsInside: boolean
  ) => {
    setIsSubmitting(true);
    setShowOutOfZoneConfirm(false);

    try {
      // Determine if check-in is valid. 
      // If deliveryMode is 'online', we always treat as 'present' regardless of geofence.
      const isOnline = targetSession?.deliveryMode === 'online';
      const actualIsInside = isOnline ? true : (isGeofenced ? finalIsInside : true);

      // Call the real API — client already computed Haversine distance,
      // server just verifies, stores the record, and timestamps it.
      const newRecord = await api.checkInSession(selectedSessionId, {
        latitude: finalLat ?? undefined,
        longitude: finalLng ?? undefined,
        distanceToCenter: finalDistance ?? undefined,
        inGeofence: actualIsInside,
      });

      // Update local state optimistically from the server response
      setRecords([newRecord, ...records]);
      setSessions(sessions.map(s => {
        if (s.id === selectedSessionId) {
          return { ...s, studentCount: s.studentCount + 1 };
        }
        return s;
      }));
      if (targetSession) setCheckedInSession(targetSession);
      setIsSubmitting(false);

      if (actualIsInside) {
        toast.success(`Berjaya! Kehadiran disahkan di dalam kelas untuk ${targetSession?.courseCode}`);
      } else {
        toast.error(`Perhatian: Anda berada di luar sempadan kelas (${finalDistance?.toFixed(0)}m). Kehadiran didaftarkan sebagai "Kehadiran Bermasalah". Sila kemukakan bukti/sijil sakit untuk mendapatkan kelulusan pensyarah!`);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Check-in failed:', err);
      if (err.message?.includes('Already checked in')) {
        toast.warning('You have already recorded your attendance for this class.');
      } else {
        toast.error(err.message || 'Check-in failed. Please try again.');
      }
    }
  };

  // Handle uploading and parsing files to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEvidenceFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEvidenceFile(reader.result);
        toast.success(`Dokumen "${file.name}" berjaya dimuat naik secara simulasi!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit appeal/exemption request
  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForAppeal) return;
    if (!evidenceType) {
      toast.error('Sila pilih jenis bukti!');
      return;
    }
    if (!evidenceNotes.trim()) {
      toast.error('Sila nyatakan sebab / alasan pengecualian kuliah!');
      return;
    }

    setIsSubmittingAppeal(true);
    setTimeout(() => {
      // Check if this record already exists in global records
      const recordExists = records.some(r => r.id === selectedRecordForAppeal.id);
      
      let updatedRecords;
      if (recordExists) {
        // Update existing out-of-bounds record
        updatedRecords = records.map(r => {
          if (r.id === selectedRecordForAppeal.id) {
            return {
              ...r,
              status: 'bermasalah' as const,
              evidenceType,
              evidenceNotes,
              evidenceFileName: evidenceFileName || 'dokumen_bukti.pdf',
              evidenceFileKey: evidenceFile || 'data:application/pdf;base64,mockpdf...',
              approvalStatus: 'pending' as const
            };
          }
          return r;
        });
      } else {
        // Create new record for missed session
        const newRecord: AttendanceRecord = {
          ...selectedRecordForAppeal,
          status: 'bermasalah',
          evidenceType,
          evidenceNotes,
          evidenceFileName: evidenceFileName || 'dokumen_bukti.pdf',
          evidenceFileKey: evidenceFile || 'data:application/pdf;base64,mockpdf...',
          approvalStatus: 'pending'
        };
        updatedRecords = [newRecord, ...records];
      }

      setRecords(updatedRecords);
      setIsSubmittingAppeal(false);
      setSelectedRecordForAppeal(null);
      setEvidenceType('');
      setEvidenceNotes('');
      setEvidenceFileName('');
      setEvidenceFile('');
      toast.success('Permohonan pelepasan & bukti kehadiran berjaya dihantar untuk kelulusan pensyarah!');
    }, 1200);
  };

  // Student specific check-in records
  const myRecords = records.filter(rec => rec.studentId === currentUser?.id);

  // Student notifications & alerts
  const myAlerts = alerts.filter(a => a.studentId === currentUser?.id);
  const unreadAlerts = myAlerts.filter(a => a.status === 'sent');

  const handleAcknowledgeAlert = (alertId: string) => {
    const updated = alerts.map(a => {
      if (a.id === alertId) {
        return { ...a, status: 'read' as const };
      }
      return a;
    });
    setAlerts(updated);
    toast.success('Amaran diakui & ditandakan sebagai dibaca!');
  };

  // Find completed or active sessions of student's class group that they haven't checked in for yet
  const studentClassGroup = (currentUser?.classGroup || '').toUpperCase();
  const missedSessions = sessions.filter(sess => {
    const isForStudentClass = sess.classGroup.toUpperCase() === studentClassGroup;
    const isEnrolled = enrolledCourseCodes.includes(sess.courseCode.toUpperCase());
    const hasRecord = records.some(r => r.sessionId === sess.id && r.studentId === currentUser?.id);
    return isForStudentClass && isEnrolled && !hasRecord && (sess.status === 'completed' || sess.status === 'active');
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight">Course E-Attendance</h2>
              <p className="text-xs text-slate-400 font-medium">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
              <p className="text-xs text-slate-400 font-mono text-right">{currentUser?.matricNo || 'No Matric'}</p>
            </div>
            
            {/* Notification Bell Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer relative"
                title="Sistem Amaran & Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                    {unreadAlerts.length}
                  </span>
                )}
              </button>

              {/* Notification Tray Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 max-h-100 overflow-y-auto animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    
                    <span className="text-xs font-extrabold text-slate-700 uppercase">Notifikasi & Amaran ({myAlerts.length})</span>
                    {unreadAlerts.length > 0 && (
                      <button 
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded"
                        onClick={() => {
                          const updated = alerts.map(a => 
                            (a.studentId === currentUser?.id && a.status === 'sent') 
                              ? { ...a, status: 'read' as const } : a
                          );
                          setAlerts(updated);
                        }}
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                  
                  {notificationPermission !== 'granted' && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-3">
                      <p className="text-[11px] text-slate-600 mb-2">Enable desktop push notifications to get instantly alerted when a lecturer opens a class session.</p>
                      <button 
                        onClick={requestNotificationPermission}
                        className="w-full text-[10px] bg-blue-600 text-white font-bold py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        Enable Push Notifications
                      </button>
                    </div>
                  )}


                  <div className="space-y-3">
                    {myAlerts.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 italic">
                        Tiada sebarang amaran atau notifikasi buat masa ini. Rekod anda cemerlang!
                      </div>
                    ) : (
                      [...myAlerts].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((alert) => (
                        <div 
                          key={alert.id} 
                          className={`p-3 rounded-xl border transition-all text-xs ${
                            alert.status === 'sent' 
                              ? 'bg-amber-50/50 border-amber-100 shadow-2xs' 
                              : 'bg-slate-50/30 border-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-extrabold text-amber-700 text-[10px] uppercase flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Amaran Kehadiran
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold">
                              {new Date(alert.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-700 leading-relaxed font-medium mb-2.5">
                            {alert.message}
                          </p>

                          {alert.status === 'sent' ? (
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] py-1.5 rounded-lg shadow-sm cursor-pointer transition-all text-center"
                            >
                              Faham & Acknowledge
                            </button>
                          ) : (
                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                              ✓ Telah Dibaca & Diakui
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {unreadAlerts.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-250/60 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700 mt-0.5 md:mt-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Amaran Akademik Aktif (Critical Attendance Alert)</h4>
                <p className="text-xs text-slate-600 mt-0.5 font-semibold">Anda mempunyai {unreadAlerts.length} amaran rasmi daripada pensyarah kerana peratusan kehadiran kuliah di bawah {unreadAlerts[0]?.threshold || 80}%.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
            >
              Lihat Amaran & Akui
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Column 1: Navigation Menu and Courses/Profile */}
          <div className={`${activeTab === 'profile' || activeTab === 'courses' ? 'md:col-span-5 max-w-2xl mx-auto' : 'md:col-span-2'} space-y-6 w-full`}>
            
            {/* Desktop Navigation Sidebar (hidden on mobile) */}
            <div className="hidden md:block bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-2">
              <h3 className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider mb-3 px-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Menu Pelajar
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('checkin')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeTab === 'checkin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" /> Check-In
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeTab === 'courses'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> Kursus Saya
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Kehadiran
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4" /> Profil
                </button>
              </div>
            </div>

            {/* Student Profile block wrapper */}
            <div className={activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'}>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" /> Student Profile
              </h3>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg font-medium border border-amber-100 leading-relaxed mb-1">
                    First-time setup: please specify your Matric Number and Class Group to register attendances correctly.
                  </p>

                  <div>
                    <label htmlFor="matricNo" className="block text-xs font-bold text-slate-500 uppercase mb-1">Matric Number *</label>
                    <input
                      id="matricNo"
                      name="matricNo"
                      type="text"
                      required
                      placeholder="e.g. 20DKM21F1012"
                      value={matricNo}
                      onChange={(e) => setMatricNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="classGroup" className="block text-xs font-bold text-slate-500 uppercase mb-1">Class / Group *</label>
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

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="e.g. 012-3456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-100 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Registration
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Matric No:</span>
                      <span className="font-mono font-bold text-slate-700">{currentUser?.matricNo}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Class Group:</span>
                      <span className="font-bold text-slate-700">{currentUser?.classGroup}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2 mt-1">
                      <span className="text-slate-400 font-medium">Email:</span>
                      <span className="text-slate-600 font-medium text-[11px] truncate max-w-37.5">{currentUser?.email}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMatricNo(currentUser?.matricNo || '');
                      setClassGroup(currentUser?.classGroup || '');
                      setIsEditingProfile(true);
                    }}
                    className="w-full border border-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Edit Registration Details
                  </button>
                </div>
              )}
            </div>
            </div>

            {/* Kursus Berdaftar Saya (My Enrolled Courses) Card */}
            <div className={activeTab === 'courses' ? 'block animate-fade-in' : 'hidden'}>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <BookOpen className="w-4.5 h-4.5 text-blue-600" /> Kursus Saya (Enrolled)
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-0.5 rounded-full">
                  {enrolledCourses.length} Kursus
                </span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  Tiada kursus berdaftar. Sila imbas kod QR pensyarah untuk mendaftar masuk.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-75 overflow-y-auto pr-1">
                  {enrolledCourses.map((course) => {
                    const courseSessions = sessions.filter(
                      s => s.courseCode.toUpperCase() === course.code.toUpperCase()
                    );
                    const courseRecords = records.filter(
                      r => r.studentId === currentUser?.id && courseSessions.some(s => s.id === r.sessionId)
                    );
                    const totalSessions = courseSessions.filter(
                      s => s.status === 'completed' || s.status === 'active'
                    ).length;
                    const presentCount = courseRecords.filter(
                      r => r.status === 'present' || r.status === 'late' || r.approvalStatus === 'approved'
                    ).length;
                    const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
                    
                    const isBelowThreshold = attendancePercent < 80;

                    return (
                      <div key={course.id} className="border border-slate-50 hover:border-slate-100 rounded-2xl p-3 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wide">
                              {course.code}
                            </span>
                            <h4 className="font-bold text-slate-800 text-[11px] mt-1 leading-snug truncate" title={course.name}>
                              {course.name}
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5" /> {course.location}
                            </p>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${isBelowThreshold ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'}`}>
                              {attendancePercent}%
                            </span>
                          </div>
                        </div>

                        {/* Attendance Progress bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isBelowThreshold ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, attendancePercent)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                            <span>Status: {isBelowThreshold ? '⚠️ Amaran' : '✓ Selamat'}</span>
                            <span className="text-slate-500">{presentCount}/{totalSessions} Kuliah</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={async () => {
                    setScannerMode('simulation');
                    setShowScannerModal(true);
                    try { setAllCourses(await api.fetchAllCourses()); } catch {}
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 transition-all cursor-pointer hover:shadow-lg hover:scale-101"
                >
                  <QrCode className="w-4 h-4 animate-pulse" />
                  Daftar Kursus (Imbas QR)
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* Column 2: Check-in / History Content Panels */}
          <div className={`${activeTab === 'checkin' || activeTab === 'history' ? 'md:col-span-3' : 'hidden'} space-y-6`}>
            
            <div className={activeTab === 'checkin' ? 'block space-y-6 animate-fade-in' : 'hidden'}>
              {/* Success check-in splash */}
              {checkedInSession ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-100 rounded-3xl p-6 shadow-xs text-center flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-md shadow-green-100">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-green-800 text-base mb-1">Attendance Confirmed</h4>
                <p className="text-xs text-green-600 font-medium mb-4">You are successfully checked in for {checkedInSession.courseCode}!</p>
                
                <div className="bg-white border border-green-100/60 rounded-2xl p-4 w-full text-left space-y-1 text-slate-600 text-xs mb-4">
                  <p><span className="font-semibold text-slate-700">Course:</span> {checkedInSession.courseName}</p>
                  <p><span className="font-semibold text-slate-700">Class:</span> {checkedInSession.classGroup}</p>
                  <p>
                    <span className="font-semibold text-slate-700">Mode:</span> 
                    {checkedInSession.deliveryMode === 'online' ? (
                      <span className="ml-1 text-purple-600 font-bold">Online</span>
                    ) : (
                      <span className="ml-1 text-blue-600 font-bold">Bersemuka (F2F)</span>
                    )}
                  </p>
                  <p><span className="font-semibold text-slate-700">Time:</span> {new Date().toLocaleTimeString()}</p>
                </div>

                <button
                  onClick={() => setCheckedInSession(null)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" /> Live Attendance Check-In
                </h3>
                <p className="text-xs text-slate-400 mb-6">Select your class and verify your location coordinates to register your attendance</p>

                {isEditingProfile ? (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Please complete your Profile first</p>
                    <p className="text-xs mt-1">Register your matric and class to enable check-ins.</p>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30 animate-pulse text-slate-500" />
                    <p className="text-sm font-semibold">No active sessions right now</p>
                    <p className="text-xs mt-1">Check-in will be enabled once your lecturer starts a live class.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCheckIn} className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Pilih Sesi Kelas Live (Select Active Course Card) *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeSessions.map((s) => {
                          const isSelected = selectedSessionId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSessionId(s.id)}
                              className={`relative text-left p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full group ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/5 ring-4 ring-blue-100 shadow-md scale-102'
                                  : 'border-slate-100 hover:border-blue-300 bg-slate-50/30 hover:bg-white hover:shadow-sm'
                              }`}
                            >
                              {/* Top Row: Course Code & Active Badge */}
                              <div className="w-full flex items-center justify-between gap-1 mb-2.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-700'
                                }`}>
                                  {s.courseCode}
                                </span>
                                <span className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                  </span>
                                  <span className="text-[9px] font-black text-green-700 uppercase">Sesi Aktif</span>
                                </span>
                              </div>

                              {/* Course Name */}
                              <div className="mb-4">
                                <h4 className={`font-extrabold text-xs sm:text-sm leading-snug ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                                  {s.courseName}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200/40">
                                    Kumpulan: {s.classGroup}
                                  </span>
                                  {s.week && (
                                    <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100/40">
                                      Minggu {s.week}
                                    </span>
                                  )}
                                  {s.deliveryMode === 'online' ? (
                                    <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100/40 flex items-center gap-1">
                                      <Globe className="w-2.5 h-2.5" /> ONLINE
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100/40 flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5" /> BERSEMUKA
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Details Row: Location, Duration */}
                              <div className="pt-3 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-500 w-full font-semibold">
                                <span className="flex items-center gap-1 truncate max-w-35 text-slate-400">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate">{s.latitude && s.longitude ? '📍 Geofenced' : 'Standard Class'}</span>
                                </span>
                                <span className="flex items-center gap-0.5 text-slate-400 shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {s.hours || 2} Jam
                                </span>
                              </div>

                              {/* Active outline check badge */}
                              {isSelected && (
                                <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 w-7 h-7 bg-blue-600 text-white rounded-full border-3 border-white flex items-center justify-center shadow-lg shadow-blue-200">
                                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedSessionId && targetSession && (
                      <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-3 flex flex-wrap justify-between items-center text-xs text-slate-600 gap-y-2">
                        <div>
                          <span className="font-bold text-slate-700">Date:</span> {targetSession.date}
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-slate-200" />
                        <div>
                          <span className="font-bold text-slate-700">Week:</span> {targetSession.week || '1'}
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-slate-200" />
                        <div>
                          <span className="font-bold text-slate-700">Mode:</span> 
                          {targetSession.deliveryMode === 'online' ? (
                            <span className="ml-1 text-purple-700 font-black">ONLINE</span>
                          ) : (
                            <span className="ml-1 text-amber-700 font-black">F2F</span>
                          )}
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-slate-200" />
                        <div>
                          <span className="font-bold text-slate-700">Duration:</span> {targetSession.hours || 2} Hour{targetSession.hours && targetSession.hours > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {selectedSessionId && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                            <MapPin className="w-4 h-4 text-blue-600 animate-pulse" />
                            <span>Verifikasi Lokasi GPS (Geolocation API)</span>
                          </div>

                          {studentLat !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 border ${
                              isInsideGeofence
                                ? 'bg-green-100 text-green-700 border-green-200/80 animate-fade-in'
                                : 'bg-rose-100 text-rose-700 border-rose-200/80 animate-pulse'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInsideGeofence ? 'bg-green-500' : 'bg-rose-500'}`} />
                              {isInsideGeofence ? 'DALAM KAWASAN' : 'LUAR SEMPADAN'}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-medium ml-auto">Had kelas: {targetSession?.radius || 50}m</span>
                        </div>

                        {isGeofenced ? (
                          <div className="space-y-3">
                            {/* Live Tracking Status Badge if active */}
                            {isWatchingLocation && (
                              <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-emerald-800 font-bold animate-pulse">
                                <div className="flex items-center gap-1.5">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span>Penjejakan GPS Automatik Sedang Aktif...</span>
                                </div>
                                <span className="text-[9px] font-mono bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-700">Real-Time GPS Watch</span>
                              </div>
                            )}

                            {/* Radar indicator */}
                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-xl">
                              <div className="relative w-12 h-12 flex items-center justify-center">
                                {/* Pulse circles */}
                                <div className={`absolute inset-0 rounded-full opacity-25 animate-ping ${
                                  studentLat !== null
                                    ? isInsideGeofence
                                      ? 'bg-green-400'
                                      : 'bg-amber-400'
                                    : 'bg-blue-400'
                                }`}></div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                                  studentLat !== null
                                    ? isInsideGeofence
                                      ? 'bg-green-500 shadow-green-100'
                                      : 'bg-amber-500 shadow-amber-100'
                                    : 'bg-blue-500 shadow-blue-100'
                                }`}>
                                  <Compass className={`w-5 h-5 ${(isFetchingLocation || isWatchingLocation) ? 'animate-spin' : ''}`} />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {studentLat !== null ? (
                                  <div>
                                    <p className={`text-xs font-bold ${
                                      isInsideGeofence ? 'text-green-600' : 'text-amber-600'
                                    }`}>
                                      {isInsideGeofence ? 'Dalam Sempadan Kelas (Verified)' : 'Di Luar Sempadan Kelas'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Jarak anda: <span className="font-bold text-slate-700">{computedDistance}m</span> dari pusat geofence
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-slate-600">Menunggu Isyarat GPS</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Sistem sedang menjejaki lokasi GPS anda secara automatik.</p>
                                  </div>
                                )}
                              </div>
                            </div>

                             {/* Verification Checklist */}
                            <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Checklist Geolocation API & Permissions</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-4 h-4 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                                  <span>Sokongan Browser API</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {permissionState === 'granted' ? (
                                    <span className="w-4 h-4 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                                  ) : permissionState === 'denied' ? (
                                    <span className="w-4 h-4 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 text-[10px] font-bold animate-pulse">✗</span>
                                  ) : (
                                    <span className="w-4 h-4 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 text-[10px] font-bold animate-bounce">?</span>
                                  )}
                                  <span>Kebenaran GPS: <strong className={`uppercase font-mono text-[9px] px-1 py-0.5 rounded ${
                                    permissionState === 'granted' ? 'bg-green-100 text-green-700' : permissionState === 'denied' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{permissionState || 'Checking'}</strong></span>
                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {studentLat !== null ? (
                                    <span className="w-4 h-4 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                                  ) : (
                                    <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-[10px] font-bold animate-pulse">○</span>
                                  )}
                                  <span>Koordinat GPS Diterima</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {studentLat !== null && gpsAccuracy !== null ? (
                                    <span className="w-4 h-4 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                                  ) : (
                                    <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-[10px] font-bold">○</span>
                                  )}
                                  <span>Isyarat GPS: <strong className="text-slate-700">{gpsAccuracy ? `${gpsAccuracy <= 10 ? 'Cemerlang' : 'Sederhana'}` : 'Menunggu'}</strong></span>
                                </div>

                                <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-slate-600 border-t border-slate-100 pt-2 mt-1">
                                  {studentLat !== null && isInsideGeofence ? (
                                    <span className="w-4 h-4 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-[10px] font-bold">✓</span>
                                  ) : studentLat !== null ? (
                                    <span className="w-4 h-4 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 text-[10px] font-bold animate-pulse">!</span>
                                  ) : (
                                    <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-[10px] font-bold">○</span>
                                  )}
                                  <span>Kedudukan Fizikal: <strong className={studentLat !== null ? (isInsideGeofence ? 'text-green-600' : 'text-rose-600') : 'text-slate-400'}>
                                    {studentLat !== null ? (isInsideGeofence ? 'Di Dalam Kawasan Kuliah' : 'Di Luar Kawasan Kuliah') : 'Menunggu Isyarat GPS'}
                                  </strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Permission Denied Guide */}
                            {permissionState === 'denied' && (
                              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2.5 animate-fade-in text-xs">
                                <p className="text-rose-800 font-extrabold flex items-center gap-1.5">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 animate-bounce" />
                                  <span>Kebenaran Lokasi Disekat (GPS Permission Denied)</span>
                                </p>
                                <p className="text-slate-600 leading-relaxed">
                                  Anda telah menyekat akses lokasi untuk aplikasi ini. Sistem memerlukan koordinat GPS anda untuk mengesahkan bahawa anda berada di dalam bilik kuliah untuk mendaftar kehadiran.
                                </p>
                                <div className="bg-white border border-rose-100 rounded-xl p-3 text-slate-500 space-y-1">
                                  <p className="font-bold text-slate-700 text-[11px]">Cara membenarkan semula akses:</p>
                                  <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                                    <li>Klik ikon mangga/kunci (🔒 atau ℹ️) di sebelah kiri URL browser anda.</li>
                                    <li>Cari menu <strong className="text-slate-700">Location</strong> dan tukar tetapan kepada <strong className="text-green-600">Allow</strong>.</li>
                                    <li>Segarkan (Refresh) halaman web ini dan dapatkan semula isyarat lokasi anda.</li>
                                  </ol>
                                </div>
                              </div>
                            )}

                            {/* Location stats & Accuracy details */}
                            {studentLat !== null && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-white p-2.5 rounded-xl border border-slate-100">
                                  <div>
                                    <p className="font-semibold text-slate-500">YOUR COORDS:</p>
                                    <p className="text-slate-700 mt-0.5 font-bold">{studentLat.toFixed(5)}, {studentLng?.toFixed(5)}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-500">CLASS COORDS:</p>
                                    <p className="text-slate-700 mt-0.5 font-bold">{targetSession?.latitude?.toFixed(5)}, {targetSession?.longitude?.toFixed(5)}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-200/30 p-2 rounded-xl border border-slate-200/40 text-slate-600 font-semibold">
                                  <div className="flex items-center gap-1">
                                    <Wifi className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Ralat GPS: <strong className="text-slate-800">{gpsAccuracy ? `±${gpsAccuracy.toFixed(1)} meter` : '±5.0m'}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Dikemaskini: <strong className="text-slate-800">{lastLocationUpdate || 'Sekarang'}</strong></span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Live Geofence Map */}
                            {targetSession && targetSession.latitude && targetSession.longitude && (
                              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                                <PolikuMap
                                  latitude={targetSession.latitude}
                                  longitude={targetSession.longitude}
                                  radius={targetSession.radius || 50}
                                  interactive={false}
                                  studentLocation={studentLat !== null && studentLng !== null ? [studentLat, studentLng] : null}
                                  height="220px"
                                />
                              </div>
                            )}

                            {/* Geofence warning & Bermasalah status info */}
                            {studentLat !== null && !isInsideGeofence && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-2 text-[11px] leading-relaxed">
                                <p className="text-amber-800 font-extrabold flex items-center gap-1.5 text-xs">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 animate-bounce" />
                                  <span>Amaran: Luar Sempadan Kelas ({computedDistance}m)</span>
                                </p>
                                <p className="text-slate-600">
                                  Geofence kelas dikonfigurasikan pada had <strong>{targetSession?.radius}m</strong>. Jika anda meneruskan untuk mendaftar masuk, sistem akan merekodkan kehadiran anda sebagai <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">Kehadiran Bermasalah</span>.
                                </p>
                                <p className="text-amber-700 font-bold border-t border-amber-200/50 pt-2">
                                  * Anda perlu memuat naik Sijil Sakit (MC) atau Surat Kebenaran Pengecualian Kuliah di tab &quot;History&quot; untuk semakan pensyarah.
                                </p>
                              </div>
                            )}

                            {/* Actions panel */}
                            <div className="w-full">
                              <button
                                type="button"
                                onClick={getStudentLocation}
                                disabled={isFetchingLocation}
                                className="w-full bg-white hover:bg-slate-50 border border-slate-200 active:bg-slate-100 text-slate-700 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Navigation className={`w-4 h-4 text-blue-600 ${isFetchingLocation ? 'animate-spin' : ''}`} />
                                <span>Segarkan GPS (Refresh Coordinates)</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span>This class does not require GPS geofencing verification.</span>
                          </div>
                        )}
                      </div>
                    )}



                    {!selectedSessionId && (
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center text-slate-500 animate-pulse">
                        <Compass className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" style={{ animationDuration: '6s' }} />
                        <p className="text-xs font-black text-slate-700">Sila Pilih Kad Kursus Di Atas</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-70 mx-auto">Tap pada salah satu kad kursus aktif di atas untuk memulakan verifikasi lokasi GPS peranti anda dan menghantar kehadiran.</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedSessionId || isSubmitting || (isGeofenced && (studentLat === null || studentLng === null))}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md shadow-blue-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-99"
                    >
                      {!selectedSessionId ? (
                        <>
                          Sila Pilih Kelas Dahulu <Compass className="w-4 h-4" />
                        </>
                      ) : isSubmitting ? (
                        <>
                          <div className="w-4.5 h-4.5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                          Verifikasi Kehadiran...
                        </>
                      ) : isGeofenced && (studentLat === null || studentLng === null) ? (
                        <>
                          Menunggu Isyarat GPS... <Compass className="w-4 h-4 animate-pulse" />
                        </>
                      ) : (
                        <>
                          Hantar Kehadiran Sekarang <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
            </div>

            {/* Attendance History & Exemption Centre */}
            <div className={`bg-white border border-slate-100 rounded-3xl p-6 shadow-sm ${activeTab === 'history' ? 'block animate-fade-in' : 'hidden'} space-y-6`}>
              <div>
                <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" /> Pusat Kehadiran & Pelepasan
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Semak status rekod kehadiran, hantar Sijil Sakit (MC) atau mohon pelepasan kuliah.</p>
              </div>

              {/* SECTION A: Live check-in history and issues */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span>Rekod Kehadiran Semasa</span>
                  <span className="bg-slate-100 text-slate-600 text-[9px] font-bold py-0.5 px-2 rounded-full">
                    {myRecords.length} Kelas
                  </span>
                </h4>

                <div className="space-y-2.5 max-h-62.5 overflow-y-auto pr-1">
                  {myRecords.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                      <p className="text-xs font-medium">Tiada rekod mendaftar masuk lagi.</p>
                    </div>
                  ) : (
                    myRecords.map((rec) => {
                      const sess = sessions.find(s => s.id === rec.sessionId);
                      const isProblematic = rec.status === 'bermasalah';
                      
                      return (
                        <div key={rec.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 hover:bg-slate-50/80 transition-all">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">{sess ? sess.courseName : 'Course Name'}</p>
                              {sess?.deliveryMode === 'online' && (
                                <span className="flex items-center gap-0.5 text-[8px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">
                                  <Globe className="w-2 h-2" /> Online
                                </span>
                              )}
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded">
                                {sess ? sess.courseCode : 'CODE'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {new Date(rec.timestamp).toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {sess && (
                              <p className="text-[10px] text-blue-600 font-bold mt-1">
                                Week {sess.week || 1} • {sess.hours || 2} Hour{sess.hours && sess.hours > 1 ? 's' : ''} Lecture
                              </p>
                            )}
                            
                            {/* Detailed Geofence issue info */}
                            {isProblematic && !rec.inGeofence && (
                              <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg w-fit border border-amber-100/40">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Luar Geofence ({rec.distanceToCenter ? Math.round(rec.distanceToCenter) : 'N/A'}m)</span>
                              </p>
                            )}

                            {/* Show details of evidence uploaded if available */}
                            {rec.evidenceType && (
                              <div className="mt-2 text-[10px] bg-blue-50/30 border border-blue-100/30 p-2 rounded-lg space-y-1 max-w-sm">
                                <p className="font-semibold text-slate-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  Bukti: {rec.evidenceType === 'sijil_sakit' ? 'Sijil Sakit (MC)' : rec.evidenceType === 'surat_pelepasan' ? 'Surat Pelepasan' : 'Dokumen Lain'}
                                </p>
                                <p className="text-slate-500 italic">&quot; {rec.evidenceNotes} &quot;</p>
                                <p className="text-[9px] text-blue-600 font-mono flex items-center gap-1">
                                  📎 {rec.evidenceFileName}
                                </p>
                              </div>
                            )}

                            {/* Show lecturer notes if approved/rejected */}
                            {rec.approvalNotes && (
                              <div className="mt-2 text-[10px] bg-slate-100/60 p-2 rounded-lg border border-slate-200/50">
                                <p className="font-bold text-slate-700">Catatan Pensyarah:</p>
                                <p className="text-slate-600 italic">&quot; {rec.approvalNotes} &quot;</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {/* Badges for regular states */}
                            {!isProblematic && (
                              <span className={`font-bold px-2.5 py-1 rounded-xl text-[10px] uppercase flex items-center gap-1 ${
                                rec.status === 'present' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                <Check className="w-3 h-3" /> {rec.status === 'present' ? 'HADIR' : 'LEWAT'}
                              </span>
                            )}

                            {/* Badges for Kehadiran Bermasalah */}
                            {isProblematic && (
                              <div className="flex flex-col items-end gap-2">
                                <span className="bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-xl text-[10px] border border-amber-200/60 flex items-center gap-1 shrink-0 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> KEHADIRAN BERMASALAH
                                </span>

                                {/* Context Action Buttons based on approvalStatus */}
                                {rec.approvalStatus === 'none' || !rec.approvalStatus ? (
                                  <button
                                    onClick={() => setSelectedRecordForAppeal(rec)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                                  >
                                    Hantar Bukti / MC
                                  </button>
                                ) : rec.approvalStatus === 'pending' ? (
                                  <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                                    Menunggu Semakan Pensyarah
                                  </span>
                                ) : rec.approvalStatus === 'approved' ? (
                                  <span className="bg-green-50 text-green-700 border border-green-100 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1">
                                    ✓ DILULUSKAN (HADIR)
                                  </span>
                                ) : (
                                  <span className="bg-red-50 text-red-700 border border-red-100 font-extrabold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1">
                                    ✗ DITOLAK (ABSENT)
                                  </span>
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

              {/* SECTION B: Missed classes with no check-in record */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span>Sesi Kelas Tidak Hadir (Missed Class)</span>
                  <span className="bg-red-100 text-red-600 text-[9px] font-bold py-0.5 px-2 rounded-full">
                    {missedSessions.length} Kelas
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {missedSessions.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">
                      <p className="text-[11px] font-medium text-slate-400">Tahniah! Tiada rekod kelas terlepas dalam kelas berdaftar anda.</p>
                    </div>
                  ) : (
                    missedSessions.map((sess) => {
                      return (
                        <div key={sess.id} className="border border-red-100/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/10">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">{sess.courseName}</p>
                              <span className="font-mono text-[9px] bg-red-50 text-red-500 font-extrabold px-1.5 py-0.5 rounded">
                                {sess.courseCode}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Tarikh: {new Date(sess.date).toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Mula: {sess.startTime}
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold mt-1">
                              Week {sess.week || 1} • {sess.hours || 2} Hour{sess.hours && sess.hours > 1 ? 's' : ''} Lecture
                            </p>
                            <p className="text-[9px] font-bold text-red-500 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              Tiada rekod mendaftar masuk (No Check-in)
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              // Create a virtual problematic record for this missed session to let them appeal
                              const mockRec: AttendanceRecord = {
                                id: `rec-missed-${sess.id}-${currentUser?.id}`,
                                sessionId: sess.id,
                                studentId: currentUser?.id || 'unknown',
                                studentName: currentUser?.name || 'Student Name',
                                matricNo: currentUser?.matricNo || '',
                                classGroup: currentUser?.classGroup || '',
                                timestamp: new Date().toISOString(),
                                status: 'bermasalah',
                                inGeofence: 0,
                                approvalStatus: 'none'
                              };
                              setSelectedRecordForAppeal(mockRec);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1 self-end sm:self-center hover:scale-105 active:scale-95"
                          >
                            Mohon Pelepasan
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* POPUP MODAL: Upload Exemption Evidence Form */}
            {selectedRecordForAppeal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden"
                >
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm">Kemukakan Bukti Kehadiran</h4>
                      <p className="text-[10px] text-slate-400">Upload medical certificate or college excuse letters</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRecordForAppeal(null);
                        setEvidenceType('');
                        setEvidenceNotes('');
                        setEvidenceFileName('');
                        setEvidenceFile('');
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <span className="text-xl font-bold">×</span>
                    </button>
                  </div>

                  <form onSubmit={handleSubmitAppeal} className="p-5 space-y-4">
                    <div>
                      <label htmlFor="evidenceType" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Sebab / Jenis Dokumen *
                      </label>
                      <select
                        id="evidenceType"
                        name="evidenceType"
                        required
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer font-bold"
                      >
                        <option value="">-- Sila Pilih Jenis Bukti --</option>
                        <option value="sijil_sakit">Sijil Sakit (MC Klinik/Hospital)</option>
                        <option value="surat_pelepasan">Surat Pelepasan / Kebenaran Pengecualian Kuliah</option>
                        <option value="lain_lain">Sebab-sebab Lain (Kecemasan/Keluarga)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="evidenceNotes" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Nyatakan Alasan / Justifikasi *
                      </label>
                      <textarea
                        id="evidenceNotes"
                        name="evidenceNotes"
                        required
                        rows={3}
                        placeholder="Tulis penerangan ringkas mengenai sebab anda terlepas kuliah atau berada di luar geofence..."
                        value={evidenceNotes}
                        onChange={(e) => setEvidenceNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="evidenceFile" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Muat Naik Sijil / Dokumen Bukti *
                      </label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50/50 transition-all relative">
                        <input
                          id="evidenceFile"
                          name="evidenceFile"
                          type="file"
                          required={!evidenceFile}
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 text-slate-500">
                          <p className="text-xs font-bold text-slate-600">
                            {evidenceFileName ? '✓ File Selected:' : 'Sila Pilih / Seret Fail Sijil'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs mx-auto">
                            {evidenceFileName || 'Sijil_Sakit.pdf, Surat_Sokongan.png (PDF/Image)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordForAppeal(null);
                          setEvidenceType('');
                          setEvidenceNotes('');
                          setEvidenceFileName('');
                          setEvidenceFile('');
                        }}
                        className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingAppeal}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmittingAppeal ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span>
                            Menghantar...
                          </>
                        ) : (
                          'Hantar Permohonan'
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Bottom Navigation Menu for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] flex justify-around items-center pt-2.5 pb-4 px-2">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-16 transition-all cursor-pointer ${
            activeTab === 'checkin' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ClipboardCheck className={`w-5 h-5 mb-1 transition-all ${activeTab === 'checkin' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Check-In</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-16 transition-all cursor-pointer ${
            activeTab === 'courses' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-1 transition-all ${activeTab === 'courses' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Kursus Saya</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-16 transition-all cursor-pointer ${
            activeTab === 'history' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Clock className={`w-5 h-5 mb-1 transition-all ${activeTab === 'history' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Rekod</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-16 transition-all cursor-pointer ${
            activeTab === 'profile' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className={`w-5 h-5 mb-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight">Profil</span>
        </button>
      </div>

      {/* Out of Zone Location Confirmation Modal Overlay */}
      {showOutOfZoneConfirm && targetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-slate-800">Sempadan Kelas Luar (Out of Zone)!</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda dikesan berada di luar sempadan geofence kelas (<span className="text-amber-600 font-bold">{computedDistance}m</span>, had sempadan: <span className="font-bold text-slate-700">{targetSession.radius || 50}m</span>).
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100/60 rounded-2xl p-3 text-[11px] text-amber-800 space-y-1 leading-relaxed">
              <p className="font-bold">Makluman Penting:</p>
              <p>Meneruskan pendaftaran masuk akan merekodkan kehadiran anda sebagai <span className="font-bold bg-amber-100/80 px-1 py-0.5 rounded">Kehadiran Bermasalah</span>.</p>
              <p>Anda <span className="font-bold">wajib</span> mengemukakan Sijil Sakit (MC) atau Surat Pelepasan di bawah tab &quot;History&quot; untuk semakan pensyarah.</p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOutOfZoneConfirm(false);
                  setIsSubmitting(false);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  proceedCheckIn(studentLat, studentLng, computedDistance, isInsideGeofence);
                }}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center shadow-md shadow-amber-100"
              >
                Ya, Daftar Bermasalah
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL: Daftar Kursus � available courses + manual code */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-85vh">
            <div className="p-5 border-b border-slate-100 shrink-0 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Daftar Kursus</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Pilih kursus atau masukkan kod manual</p>
              </div>
              <button onClick={() => { setShowScannerModal(false); setManualCourseCode(''); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold cursor-pointer">�</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <form onSubmit={handleManualEnroll} className="flex gap-2">
                <input id="manualCourseCode" name="manualCourseCode" type="text" required
                  placeholder="Kod kursus e.g. DJF32052"
                  value={manualCourseCode}
                  onChange={(e) => setManualCourseCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                <button type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shrink-0">
                  Daftar
                </button>
              </form>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Kursus Tersedia ({allCourses.filter(c => !enrolledCourseIds.includes(c.id)).length})</p>
                {allCourses.filter(c => !enrolledCourseIds.includes(c.id)).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tiada kursus tersedia.</p>
                ) : (
                  <div className="space-y-2">
                    {allCourses.filter(c => !enrolledCourseIds.includes(c.id)).map((course) => (
                      <button key={course.id} onClick={() => handleEnrollInCourse(course.id)}
                        className="w-full flex items-center justify-between p-3 border border-slate-100 hover:border-blue-200 rounded-xl text-left text-xs cursor-pointer hover:bg-blue-50/30 transition-all">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{course.code} � {course.name}</p>
                          <p className="text-[10px] text-slate-400">{course.location}</p>
                        </div>
                        <span className="bg-blue-600 text-white font-bold text-[10px] px-3 py-1 rounded-lg shrink-0 ml-2">Daftar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <VersionDisplay />
    </div>
  );
}