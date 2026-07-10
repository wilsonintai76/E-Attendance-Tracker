import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { AttendanceSession } from '../lib/store';

interface Props {
  sessions: AttendanceSession[];
  onEditSession: (sess: AttendanceSession) => void;
  onBulkAttendance: (sess: AttendanceSession) => void;
}

export default function PreviousWeeksPanel({ sessions, onEditSession, onBulkAttendance }: Props) {
  const [show, setShow] = useState(false);

  if (sessions.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      <button onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between text-left cursor-pointer">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-amber-500" /> Previous Weeks — Manual Attendance
          <span className="text-[10px] font-normal text-slate-400 ml-1">({sessions.length} sessions)</span>
        </h4>
        <span className="text-slate-400 text-lg">{show ? '▾' : '▸'}</span>
      </button>
      {show && (
        <div className="mt-4 space-y-1.5 max-h-100 overflow-y-auto">
          {sessions.map(sess => (
            <div key={sess.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-bold text-slate-600 w-14 shrink-0">{sess.courseCode}</span>
                <span className="text-slate-500 w-14 shrink-0">Week {sess.week || '?'}</span>
                <span className="text-slate-400 w-20 shrink-0">{sess.date}</span>
                <span className="text-slate-400 hidden sm:inline">{sess.studentCount || 0} checked-in</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEditSession(sess)}
                  className="text-slate-400 hover:text-blue-500 px-2 py-1.5 text-xs cursor-pointer rounded-lg hover:bg-blue-50" title="Edit date">✏️</button>
                <button onClick={() => onBulkAttendance(sess)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold px-2.5 py-1.5 rounded-lg text-xs cursor-pointer">Mark Present</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
