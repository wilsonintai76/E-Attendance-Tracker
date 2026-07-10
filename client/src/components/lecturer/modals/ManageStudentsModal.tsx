import React, { useState, useEffect } from 'react';
import { X, Users, UserMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../../lib/api';

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  matricNo: string;
  classGroup: string;
  avatar: string;
}

interface Props {
  courseId: string;
  courseCode: string;
  courseName: string;
  onClose: () => void;
  onStudentRemoved: () => void;
}

export default function ManageStudentsModal({ courseId, courseCode, courseName, onClose, onStudentRemoved }: Props) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [courseId]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchCourseStudents(courseId);
      setStudents(data);
    } catch {
      toast.error('Gagal memuatkan senarai pelajar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStudent = async (student: EnrolledStudent) => {
    if (!confirm(`Adakah anda pasti mahu mengeluarkan ${student.name} (${student.matricNo || 'No Matric'}) dari kursus ${courseCode}?`)) return;

    setRemovingId(student.id);
    try {
      await api.removeStudentFromCourse(courseId, student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      toast.success(`${student.name} telah dikeluarkan dari ${courseCode}.`);
      onStudentRemoved();
    } catch {
      toast.error('Gagal mengeluarkan pelajar.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Urus Pelajar
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {courseCode} — {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Tiada pelajar berdaftar</p>
              <p className="text-xs mt-1">Pelajar belum mendaftar untuk kursus ini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                {students.length} Pelajar Berdaftar
              </p>
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={student.avatar || 'https://i.pravatar.cc/150?u=user'}
                      alt=""
                      className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {student.matricNo || 'No Matric'} {student.classGroup ? `• ${student.classGroup}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(student)}
                    disabled={removingId === student.id}
                    className="shrink-0 ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold text-xs py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-transparent hover:border-red-100"
                    title="Keluarkan pelajar"
                  >
                    {removingId === student.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserMinus className="w-3 h-3" />
                    )}
                    Keluar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
