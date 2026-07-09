import React from 'react';
import { motion } from 'motion/react';
import { Course } from '../../../lib/store';

interface CourseEnrollmentModalProps {
  show: boolean;
  manualCourseCode: string;
  allCourses: Course[];
  enrolledCourseIds: string[];
  setManualCourseCode: (v: string) => void;
  onClose: () => void;
  onManualEnroll: (e: React.FormEvent) => void;
  onEnrollInCourse: (courseId: string) => void;
}

export default function CourseEnrollmentModal({
  show, manualCourseCode, allCourses, enrolledCourseIds,
  setManualCourseCode, onClose, onManualEnroll, onEnrollInCourse
}: CourseEnrollmentModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100 shrink-0 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Daftar Kursus</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Pilih kursus atau masukkan kod manual</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold cursor-pointer">×</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <form onSubmit={onManualEnroll} className="flex gap-2">
            <input id="manualCourseCode" type="text" required
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
                  <button key={course.id} onClick={() => onEnrollInCourse(course.id)}
                    className="w-full flex items-center justify-between p-3 border border-slate-100 hover:border-blue-200 rounded-xl text-left text-xs cursor-pointer hover:bg-blue-50/30 transition-all">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{course.code} — {course.name}</p>
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
  );
}
