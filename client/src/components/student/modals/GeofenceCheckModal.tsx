import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { AttendanceSession } from '../../../lib/store';

interface GeofenceCheckModalProps {
  show: boolean;
  targetSession: AttendanceSession | null | undefined;
  computedDistance: number | null;
  isInsideGeofence: boolean;
  studentLat: number | null;
  studentLng: number | null;
  onClose: () => void;
  onProceedCheckIn: (lat: number, lng: number, distance: number, isInside: boolean) => void;
}

export default function GeofenceCheckModal({
  show, targetSession, computedDistance, isInsideGeofence, studentLat, studentLng,
  onClose, onProceedCheckIn
}: GeofenceCheckModalProps) {
  if (!show || !targetSession) return null;

  return (
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
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onProceedCheckIn(studentLat || 0, studentLng || 0, computedDistance || 0, isInsideGeofence)}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center shadow-md shadow-amber-100"
          >
            Ya, Daftar Bermasalah
          </button>
        </div>
      </div>
    </div>
  );
}
