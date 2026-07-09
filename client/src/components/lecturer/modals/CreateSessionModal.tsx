import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, BookOpen, User } from 'lucide-react';
import { Course, AttendanceSession } from '../../../lib/store';
import { toast } from 'sonner';

interface CreateSessionModalProps {
  show: boolean;
  courses: Course[];
  sessions: AttendanceSession[];
  selectedCourseId: string;
  courseCode: string;
  courseName: string;
  classGroup: string;
  useGeofencing: boolean;
  latitude: string;
  longitude: string;
  radius: number;
  overrideGeofencing: boolean;
  sessionWeek: string;
  sessionDate: string;
  sessionHours: string;
  deliveryMode: 'f2f' | 'online';
  createFullSemester: boolean;

  setSelectedCourseId: (id: string) => void;
  setCourseCode: (code: string) => void;
  setCourseName: (name: string) => void;
  setClassGroup: (group: string) => void;
  setUseGeofencing: (use: boolean) => void;
  setLatitude: (lat: string) => void;
  setLongitude: (lng: string) => void;
  setRadius: (r: number) => void;
  setOverrideGeofencing: (override: boolean) => void;
  setSessionWeek: (week: string) => void;
  setSessionDate: (date: string) => void;
  setSessionHours: (hours: string) => void;
  setDeliveryMode: (mode: 'f2f' | 'online') => void;
  setCreateFullSemester: (create: boolean) => void;

  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onNavigateToCourses: () => void;
}

export default function CreateSessionModal({
  show, courses, sessions,
  selectedCourseId, courseCode, courseName, classGroup, useGeofencing, latitude, longitude, radius,
  overrideGeofencing, sessionWeek, sessionDate, sessionHours, deliveryMode, createFullSemester,
  setSelectedCourseId, setCourseCode, setCourseName, setClassGroup, setUseGeofencing, setLatitude,
  setLongitude, setRadius, setOverrideGeofencing, setSessionWeek, setSessionDate, setSessionHours,
  setDeliveryMode, setCreateFullSemester,
  onClose, onSubmit, onNavigateToCourses
}: CreateSessionModalProps) {
  if (!show) return null;

  return (
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
              onClick={onClose}
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
              onClick={onNavigateToCourses}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-100"
            >
              Go to Course Management First
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full border border-slate-200 text-slate-500 font-semibold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
          </div>
        ) : (
          <form id="create-session-form" onSubmit={onSubmit} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-3.5">
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
                      setClassGroup(selectedCourse.classGroup || '');
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
                onClick={onClose}
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
  );
}
