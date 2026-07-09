import React from 'react';
import { motion } from 'motion/react';
import { AttendanceSession } from '../../../lib/store';

interface BulkAttendanceModalProps {
  show: boolean;
  bulkSession: AttendanceSession | null;
  isLoadingStudents: boolean;
  enrolledStudents: any[];
  absentChecked: Set<string>;
  isSubmittingBulk: boolean;
  onClose: () => void;
  onToggleAbsentCheck: (studentId: string) => void;
  onSubmitBulkAttendance: () => void;
}

export default function BulkAttendanceModal({
  show,
  bulkSession,
  isLoadingStudents,
  enrolledStudents,
  absentChecked,
  isSubmittingBulk,
  onClose,
  onToggleAbsentCheck,
  onSubmitBulkAttendance
}: BulkAttendanceModalProps) {
  if (!show || !bulkSession) return null;

  return (
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
                <input type="checkbox" checked={absentChecked.has(s.id)} onChange={() => onToggleAbsentCheck(s.id)}
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
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl text-xs cursor-pointer">Cancel</button>
          <button onClick={onSubmitBulkAttendance} disabled={absentChecked.size === 0 || isSubmittingBulk}
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer">
            {isSubmittingBulk ? 'Saving...' : `Mark ${absentChecked.size} Present`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
