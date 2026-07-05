'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, AttendanceRecord, AttendanceSession } from '@/lib/store';
import { 
  LogOut, ShieldCheck, CheckCircle2, Award, ClipboardCheck, 
  MapPin, HelpCircle, Save, ArrowRight, BookOpen, Clock,
  Navigation, Compass, AlertTriangle, Info, Check, User
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { calculateDistance, getCurrentCoordinates } from '@/lib/geoUtils';
import PolikuMap from './PolikuMap';

export default function StudentDashboard() {
  const { currentUser, setCurrentUser, sessions, setSessions, records, setRecords, logout } = useAppStore();
  
  // Active Tab for mobile bottom menu
  const [activeTab, setActiveTab] = useState<'checkin' | 'history' | 'profile'>('checkin');

  // Checking state
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedInSession, setCheckedInSession] = useState<AttendanceSession | null>(null);

  // Edit profile info (Matric & Class)
  const [isEditingProfile, setIsEditingProfile] = useState(!currentUser?.matricNo || !currentUser?.classGroup);
  const [matricNo, setMatricNo] = useState(currentUser?.matricNo || '');
  const [classGroup, setClassGroup] = useState(currentUser?.classGroup || '');

  // GPS & Geofencing states
  const [studentLat, setStudentLat] = useState<number | null>(null);
  const [studentLng, setStudentLng] = useState<number | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [bypassGeofence, setBypassGeofence] = useState(false);
  const [showOutOfZoneConfirm, setShowOutOfZoneConfirm] = useState(false);

  // Appeal & Evidence States
  const [selectedRecordForAppeal, setSelectedRecordForAppeal] = useState<AttendanceRecord | null>(null);
  const [evidenceType, setEvidenceType] = useState<'sijil_sakit' | 'surat_pelepasan' | 'lain_lain' | ''>('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<string>('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const getStudentLocation = async () => {
    setIsFetchingLocation(true);
    setLocationError(null);
    try {
      const pos = await getCurrentCoordinates();
      setStudentLat(pos.coords.latitude);
      setStudentLng(pos.coords.longitude);
      toast.success('Successfully retrieved your current GPS location!');
    } catch (err: any) {
      console.error(err);
      setLocationError(err.message || 'Could not access GPS. Please ensure location permissions are enabled.');
      toast.error('Could not get GPS coordinates. Sandbox environments might restrict access, use "Mock Location" to test!');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const mockStudentLocation = (isInside: boolean) => {
    if (isInside) {
      // 1.60333, 110.35471 is very close to POLIKU JKM coordinates (1.6033, 110.3547)
      setStudentLat(1.60333);
      setStudentLng(110.35471);
      setLocationError(null);
      toast.success('Mock location set: INSIDE classroom geofence (POLIKU JKM)!');
    } else {
      // 1.6050, 110.3520 is about 350 meters away (Student Housing)
      setStudentLat(1.6050);
      setStudentLng(110.3520);
      setLocationError(null);
      toast.warning('Mock location set: OUTSIDE classroom geofence (Student Housing)!');
    }
  };

  // Reset GPS states when selected session changes
  useEffect(() => {
    if (selectedSessionId) {
      setBypassGeofence(false);
      // Attempt auto-location capture
      getStudentLocation().catch(() => {});
    } else {
      setStudentLat(null);
      setStudentLng(null);
    }
  }, [selectedSessionId]);

  // Auto-switch to profile tab on mobile if registration is incomplete
  useEffect(() => {
    if (isEditingProfile) {
      setActiveTab('profile');
    }
  }, [isEditingProfile]);

  // Handle saving profile info
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricNo || !classGroup) {
      toast.error('Both Matric No. and Class/Group are required');
      return;
    }

    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        matricNo: matricNo.toUpperCase(),
        classGroup: classGroup.toUpperCase()
      });
      setIsEditingProfile(false);
      toast.success('Student profile updated successfully!');
    }
  };

  // Find active live sessions
  const activeSessions = sessions.filter(s => s.status === 'active');

  const targetSession = sessions.find(s => s.id === selectedSessionId);
  const isGeofenced = !!(targetSession?.latitude && targetSession?.longitude);
  
  const computedDistance = (studentLat !== null && studentLng !== null && targetSession?.latitude && targetSession?.longitude)
    ? calculateDistance(studentLat, studentLng, targetSession.latitude, targetSession.longitude)
    : null;
    
  const isInsideGeofence = (computedDistance !== null && targetSession?.radius)
    ? computedDistance <= targetSession.radius
    : true;

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
        toast.error('GPS Location check failed. This class requires GPS location verification. Please enable GPS/location services on your device and try again, or use the "Mock Location" tools.');
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

    // Show warning confirmation if student is out-of-zone
    if (isGeofenced && !finalIsInside) {
      setShowOutOfZoneConfirm(true);
      return;
    }

    // Proceed to register check-in
    proceedCheckIn(finalLat, finalLng, finalDistance, finalIsInside);
  };

  const proceedCheckIn = (
    finalLat: number | null, 
    finalLng: number | null, 
    finalDistance: number | null, 
    finalIsInside: boolean
  ) => {
    setIsSubmitting(true);
    setShowOutOfZoneConfirm(false);

    // Simulate database write
    setTimeout(() => {
      const actualIsInside = isGeofenced ? finalIsInside : true;

      // 1. Create check-in record
      const newRecord: AttendanceRecord = {
        id: `rec-${Date.now()}`,
        sessionId: selectedSessionId,
        studentId: currentUser?.id || 'unknown',
        studentName: currentUser?.name || 'Student Name',
        matricNo: currentUser?.matricNo || matricNo.toUpperCase(),
        classGroup: currentUser?.classGroup || classGroup.toUpperCase(),
        timestamp: new Date().toISOString(),
        status: actualIsInside ? 'present' : 'bermasalah', // Flagged if outside geofence boundary
        latitude: finalLat || undefined,
        longitude: finalLng || undefined,
        distanceToCenter: finalDistance || undefined,
        inGeofence: actualIsInside,
        approvalStatus: actualIsInside ? 'none' : 'none' // Outstanding submission required
      };

      // 2. Increment check-in count on session
      const updatedSessions = sessions.map(s => {
        if (s.id === selectedSessionId) {
          return { ...s, studentCount: s.studentCount + 1 };
        }
        return s;
      });

      setRecords([newRecord, ...records]);
      setSessions(updatedSessions);
      setCheckedInSession(targetSession);
      setIsSubmitting(false);

      if (actualIsInside) {
        toast.success(`Berjaya! Kehadiran disahkan di dalam kelas untuk ${targetSession?.courseCode}`);
      } else {
        toast.error(`Perhatian: Anda berada di luar sempadan kelas (${finalDistance}m). Kehadiran didaftarkan sebagai "Kehadiran Bermasalah". Sila kemukakan bukti/sijil sakit untuk mendapatkan kelulusan pensyarah!`);
      }
    }, 1200);
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
              evidenceFile: evidenceFile || 'data:application/pdf;base64,mockpdf...',
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
          evidenceFile: evidenceFile || 'data:application/pdf;base64,mockpdf...',
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

  // Find completed or active sessions of student's class group that they haven't checked in for yet
  const studentClassGroup = (currentUser?.classGroup || '').toUpperCase();
  const missedSessions = sessions.filter(sess => {
    const isForStudentClass = sess.classGroup.toUpperCase() === studentClassGroup;
    const hasRecord = records.some(r => r.sessionId === sess.id && r.studentId === currentUser?.id);
    return isForStudentClass && !hasRecord && (sess.status === 'completed' || sess.status === 'active');
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-xs">
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

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
              <p className="text-xs text-slate-400 font-mono text-right">{currentUser?.matricNo || 'No Matric'}</p>
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
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Profile Setup / Details Column */}
          <div className={`md:col-span-2 space-y-6 ${activeTab === 'profile' ? 'block' : 'hidden'} md:block`}>
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matric Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20DKM21F1012"
                      value={matricNo}
                      onChange={(e) => setMatricNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class / Group *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DKM5A"
                      value={classGroup}
                      onChange={(e) => setClassGroup(e.target.value)}
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
                      <span className="text-slate-600 font-medium text-[11px] truncate max-w-[150px]">{currentUser?.email}</span>
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

          {/* Core Check-in Card Column */}
          <div className="md:col-span-3 space-y-6">
            
            <div className={`${activeTab === 'checkin' ? 'block' : 'hidden'} md:block space-y-6`}>
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
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Live Class *</label>
                      <select
                        required
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Choose Live Class --</option>
                        {activeSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.courseCode} ({s.classGroup}) - {s.courseName} {s.week ? `[Week ${s.week}]` : ''} - {s.date} ({s.hours || 2} Hrs)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSessionId && targetSession && (
                      <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-3 flex justify-between items-center text-xs text-slate-600">
                        <div>
                          <span className="font-bold text-slate-700">Date:</span> {targetSession.date}
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div>
                          <span className="font-bold text-slate-700">Week:</span> {targetSession.week || '1'}
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
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
                            <span>GPS Geofence Verification</span>
                          </div>

                          {studentLat !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 border ${
                              isInsideGeofence
                                ? 'bg-green-100 text-green-700 border-green-200/80'
                                : 'bg-rose-100 text-rose-700 border-rose-200/80 animate-pulse'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInsideGeofence ? 'bg-green-500' : 'bg-rose-500'}`} />
                              {isInsideGeofence ? 'WITHIN RANGE' : 'OUT OF ZONE'}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-medium ml-auto">Class limit: {targetSession?.radius || 50}m</span>
                        </div>

                        {isGeofenced ? (
                          <div className="space-y-3">
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
                                  <Compass className={`w-5 h-5 ${isFetchingLocation ? 'animate-spin' : ''}`} />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {studentLat !== null ? (
                                  <div>
                                    <p className={`text-xs font-bold ${
                                      isInsideGeofence ? 'text-green-600' : 'text-amber-600'
                                    }`}>
                                      {isInsideGeofence ? 'Inside Classroom Boundary' : 'Outside Classroom Boundary'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Your distance: <span className="font-bold text-slate-700">{computedDistance}m</span> away
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-slate-600">Awaiting GPS Location</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Click retrieve or use mock location</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Location stats */}
                            {studentLat !== null && (
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-white p-2.5 rounded-xl border border-slate-100">
                                <div>
                                  <p className="font-semibold text-slate-400">YOUR COORDS:</p>
                                  <p className="text-slate-600 mt-0.5">{studentLat.toFixed(5)}, {studentLng?.toFixed(5)}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-400">CLASS COORDS:</p>
                                  <p className="text-slate-600 mt-0.5">{targetSession?.latitude?.toFixed(5)}, {targetSession?.longitude?.toFixed(5)}</p>
                                </div>
                              </div>
                            )}

                            {/* Live Geofence Map (Google Maps equivalent) */}
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
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={getStudentLocation}
                                disabled={isFetchingLocation}
                                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 active:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Navigation className={`w-3.5 h-3.5 ${isFetchingLocation ? 'animate-spin' : ''}`} />
                                {studentLat !== null ? 'Refresh GPS' : 'Retrieve My Location'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span>This class does not require GPS geofencing verification.</span>
                          </div>
                        )}

                        {/* Developer Simulation / Mocking helper */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-blue-700 uppercase">
                            <span>POLIKU Sandbox Simulation</span>
                            <span className="bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded text-[9px]">Developer Tool</span>
                          </div>
                          <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                            Iframe sandbox environments can restrict actual browser GPS access. Use these controls to simulate checking-in:
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => mockStudentLocation(true)}
                              className="bg-white hover:bg-green-50 border border-green-200 hover:border-green-300 text-green-700 font-semibold py-1.5 px-2 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Mock Inside Range
                            </button>
                            <button
                              type="button"
                              onClick={() => mockStudentLocation(false)}
                              className="bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-300 text-amber-700 font-semibold py-1.5 px-2 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Mock Outside Range
                            </button>
                          </div>
                        </div>
                      </div>
                    )}



                    <button
                      type="submit"
                      disabled={isSubmitting || (isGeofenced && (studentLat === null || studentLng === null))}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                          Verifying attendance...
                        </>
                      ) : isGeofenced && (studentLat === null || studentLng === null) ? (
                        <>
                          Awaiting GPS Location... <Compass className="w-4 h-4 animate-pulse" />
                        </>
                      ) : (
                        <>
                          Check-In Now <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
            </div>

            {/* Attendance History & Exemption Centre */}
            <div className={`bg-white border border-slate-100 rounded-3xl p-6 shadow-sm ${activeTab === 'history' ? 'block' : 'hidden'} md:block space-y-6`}>
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

                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
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
                                inGeofence: false,
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Sebab / Jenis Dokumen *
                      </label>
                      <select
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Nyatakan Alasan / Justifikasi *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Tulis penerangan ringkas mengenai sebab anda terlepas kuliah atau berada di luar geofence..."
                        value={evidenceNotes}
                        onChange={(e) => setEvidenceNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Muat Naik Sijil / Dokumen Bukti *
                      </label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50/50 transition-all relative">
                        <input
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] flex justify-around items-center pt-2.5 pb-4 px-4">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`flex flex-col items-center justify-center py-1 px-3 min-w-[72px] transition-all cursor-pointer ${
            activeTab === 'checkin' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ClipboardCheck className={`w-5.5 h-5.5 mb-1 transition-all ${activeTab === 'checkin' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-tight">Check-In</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-3 min-w-[72px] transition-all cursor-pointer ${
            activeTab === 'history' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Clock className={`w-5.5 h-5.5 mb-1 transition-all ${activeTab === 'history' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-tight">History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 min-w-[72px] transition-all cursor-pointer ${
            activeTab === 'profile' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className={`w-5.5 h-5.5 mb-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-tight">Profile</span>
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
    </div>
  );
}
