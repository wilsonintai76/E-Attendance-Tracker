import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceSession, Course } from '../lib/store';
import * as api from '../lib/api';

interface Props {
  course: Course;
  sessions: AttendanceSession[];
  onSessionsChange: (sessions: AttendanceSession[]) => void;
  onEditSession: (sess: AttendanceSession) => void;
  onBulkAttendance: (sess: AttendanceSession) => void;
}

export default function CourseSessionCard({
  course, sessions, onSessionsChange, onEditSession, onBulkAttendance,
}: Props) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickWeek, setQuickWeek] = useState(() => {
    const max = sessions.reduce((m, s) => Math.max(m, s.week || 0), 0);
    return String(Math.min(14, max + 1));
  });
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickHours, setQuickHours] = useState('2');
  const [quickMode, setQuickMode] = useState<'f2f' | 'online'>('f2f');

  const hasActive = sessions.some(s => s.status === 'active');
  const totalStudents = sessions.reduce((sum, s) => sum + (s.studentCount || 0), 0);

  const handleQuickAdd = () => {
    const hoursPerSession = parseInt(quickHours) || 2;
    const hoursPerWeek = course.hoursPerWeek || hoursPerSession;
    const sessionsPerWeek = Math.max(1, Math.round(hoursPerWeek / hoursPerSession));
    const splitLabels = ['A', 'B', 'C', 'D'];

    const newSessions: AttendanceSession[] = Array.from({ length: sessionsPerWeek }, (_, s) => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      return {
        id: `sess-${Date.now()}-${s}`,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        classGroup: sessions[0]?.classGroup || '',
        date: quickDate,
        startTime: s === 0
          ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
          : '10:30',
        code,
        status: s === 0 ? 'active' : 'inactive',
        lecturerId: '',
        studentCount: 0,
        latitude: course.latitude,
        longitude: course.longitude,
        radius: course.radius,
        week: parseInt(quickWeek),
        hours: hoursPerSession,
        deliveryMode: quickMode,
      };
    });

    onSessionsChange([...newSessions, ...sessions]);
    newSessions.forEach(sess =>
      api.createSession({
        courseId: sess.courseId, courseCode: sess.courseCode, courseName: sess.courseName,
        classGroup: sess.classGroup, date: sess.date, startTime: sess.startTime,
        code: sess.code, latitude: sess.latitude, longitude: sess.longitude,
        radius: sess.radius, week: sess.week, hours: sess.hours, deliveryMode: sess.deliveryMode,
      }).catch(() => {})
    );
    setShowQuickAdd(false);
    setQuickWeek(String(Math.min(14, parseInt(quickWeek) + 1)));
    const splitNote = sessionsPerWeek > 1
      ? ` (${sessionsPerWeek} split sessions, code A: ${newSessions[0].code})`
      : ` Code: ${newSessions[0].code}`;
    toast.success(`Week ${quickWeek} added to ${course.code}!${splitNote}`);
  };

  return (
    <div className={`bg-white border rounded-3xl p-5 shadow-sm transition-all ${
      hasActive ? 'border-blue-200 shadow-blue-50' : 'border-slate-100'
    }`}>
      {/* Course Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {course.code.substring(0, 3)}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{course.code} — {course.name}</h4>
            <p className="text-[10px] text-slate-400">
              {course.location} • {totalStudents} check-ins • {sessions.length} sessions
            </p>
          </div>
        </div>
        {hasActive && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Session Rows */}
      {sessions.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-100 rounded-xl">
          No sessions yet. Add your first week below.
        </p>
      ) : (
        <div className="space-y-1.5 mb-3 max-h-[300px] overflow-y-auto">
          {sessions.map((sess) => (
            <div key={sess.id} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
              sess.status === 'active' ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'
            }`}>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <span className="font-extrabold text-blue-600 w-14 shrink-0">Week {sess.week || '?'}</span>
                <span className="text-slate-500 w-20 shrink-0 text-[11px]">{sess.date}</span>
                <span className="text-slate-400 hidden sm:inline">{sess.hours || 2}h</span>
                <span className="text-slate-400 hidden sm:inline">{sess.deliveryMode === 'online' ? '🌐' : '👥'}</span>
                {sess.status === 'active' && (
                  <span className="font-mono font-bold text-green-700 bg-white px-1.5 py-0.5 rounded text-[10px] border border-green-200 shrink-0">
                    {sess.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="text-[10px] text-slate-400 w-8 text-right">{sess.studentCount || 0}</span>
                {sess.status === 'active' ? (
                  <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                ) : (
                  <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">INACTIVE</span>
                )}
                <span className="flex items-center gap-1">
                  <button onClick={() => onEditSession(sess)}
                    className="text-slate-400 hover:text-blue-500 px-1 py-0.5 rounded text-[10px] cursor-pointer" title="Edit date">✏️</button>
                  <button onClick={() => onBulkAttendance(sess)}
                    className="text-slate-400 hover:text-amber-500 px-1 py-0.5 rounded text-[10px] cursor-pointer" title="Attendance">✅</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add */}
      {showQuickAdd ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">Week*</label>
              <select value={quickWeek} onChange={e => setQuickWeek(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold cursor-pointer">
                {Array.from({ length: 14 }, (_, i) => i + 1).map(w => <option key={w} value={w}>W{w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">Date*</label>
              <input type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px]" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">Hours</label>
              <select value={quickHours} onChange={e => setQuickHours(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold cursor-pointer">
                {[1,2,3,4].map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">Mode</label>
              <select value={quickMode} onChange={e => setQuickMode(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold cursor-pointer">
                <option value="f2f">F2F</option><option value="online">Online</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowQuickAdd(false)}
              className="flex-1 border border-slate-200 text-slate-500 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer">Cancel</button>
            <button onClick={handleQuickAdd}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-[10px] font-bold cursor-pointer">Start Session</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowQuickAdd(true)}
          className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Week / Session
        </button>
      )}
    </div>
  );
}
