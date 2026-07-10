import React from 'react';
import { motion } from 'motion/react';
import { AttendanceSession } from '../../../lib/store';

interface BulkAttendanceModalProps {
  show: boolean;
  bulkSession: AttendanceSession | null;
  isLoadingStudents: boolean;
  enrolledStudents: any[];
  markedAbsent: Set<string>;
  isSubmittingBulk: boolean;
  onClose: () => void;
  onToggleAbsent: (studentId: string) => void;
  onSubmitBulkAttendance: () => void;
}

export default function BulkAttendanceModal({
  show,
  bulkSession,
  isLoadingStudents,
  enrolledStudents,
  markedAbsent,
  isSubmittingBulk,
  onClose,
  onToggleAbsent,
  onSubmitBulkAttendance
}: BulkAttendanceModalProps) {
  if (!show || !bulkSession) return null;

  // Count: unticked = present, ticked = absent
  const presentCount = enrolledStudents.filter(
    (s: any) => s.record_status !== 'present' && !markedAbsent.has(s.id)
  ).length;
  const absentCount = markedAbsent.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100 shrink-0">
          <h4 className="font-bold text-slate-800">Backdated Attendance</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {bulkSession.courseCode} — Week {bulkSession.week} — {bulkSession.date}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Tick only <strong className="text-red-500">absent</strong> students — the rest will be auto-marked present.
          </p>
        </div>
        <div className="overflow-y-auto p-5 space-y-2">
          {isLoadingStudents ? (
            <div className="text-center py-8 text-slate-400">Loading students...</div>
          ) : enrolledStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No enrolled students found for this class.</div>
          ) : (
            enrolledStudents.map((s: any) => {
              const alreadyRecorded = s.record_status === 'present';
              const isMarkedAbsent = markedAbsent.has(s.id);

              return (
                <label key={s.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    alreadyRecorded ? 'bg-green-50 border-green-100 opacity-60 cursor-default' :
                    isMarkedAbsent ? 'bg-red-50 border-red-200' : 'bg-green-50/30 border-green-100 hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isMarkedAbsent}
                    onChange={() => onToggleAbsent(s.id)}
                    disabled={alreadyRecorded}
                    className="w-4 h-4 rounded accent-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.matric_no || s.email}</p>
                  </div>
                  {alreadyRecorded ? (
                    <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">✓ Hadir</span>
                  ) : isMarkedAbsent ? (
                    <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full shrink-0">✗ Absent</span>
                  ) : (
                    <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">Hadir</span>
                  )}
                </label>
              );
            })
          )}
        </div>
        <div className="p-5 border-t border-slate-100 shrink-0 flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl text-xs cursor-pointer">Cancel</button>
          <button
            onClick={onSubmitBulkAttendance}
            disabled={isSubmittingBulk}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer"
          >
            {isSubmittingBulk ? 'Saving...' : `Simpan: ${presentCount} Hadir, ${absentCount} Absent`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
