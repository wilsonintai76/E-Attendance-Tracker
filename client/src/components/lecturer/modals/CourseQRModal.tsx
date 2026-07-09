import React from 'react';
import { motion } from 'motion/react';
import { Course } from '../../../lib/store';

interface CourseQRModalProps {
  show: boolean;
  course: Course | null;
  onClose: () => void;
}

export default function CourseQRModal({ show, course, onClose }: CourseQRModalProps) {
  if (!show || !course) return null;

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="bg-blue-50/50 text-blue-700 rounded-2xl p-3 w-full text-xs font-semibold">
            Kursus: <span className="font-extrabold text-blue-900">{course.code} - {course.name}</span>
          </div>

          {/* Real dynamic QR Code generated via qrserver.com */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-xs relative flex items-center justify-center w-57.5 h-57.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=enroll:${course.id}`}
              alt={`QR Code for ${course.code}`}
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
              <strong className="text-slate-700">{course.code}</strong>
            </p>
            <p className="flex justify-between font-medium">
              <span>Lokasi Rasmi:</span>
              <strong className="text-slate-700">{course.location}</strong>
            </p>
            <p className="flex justify-between font-medium">
              <span>Silibus Kuliah:</span>
              <strong className="text-slate-700">{course.totalContactHours} Jam (14 Minggu)</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
          >
            Tutup (Close)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
