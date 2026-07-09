import React from 'react';
import { motion } from 'motion/react';
import { AttendanceRecord } from '../../../lib/store';

interface AppealSubmissionModalProps {
  show: boolean;
  selectedRecordForAppeal: AttendanceRecord | null;
  evidenceType: string;
  evidenceNotes: string;
  evidenceFileName: string;
  evidenceFile: string;
  isSubmittingAppeal: boolean;
  setEvidenceType: (v: "" | "sijil_sakit" | "surat_pelepasan" | "lain_lain") => void;
  setEvidenceNotes: (v: string) => void;
  setEvidenceFileName: (v: string) => void;
  setEvidenceFile: (v: string) => void;
  onClose: () => void;
  onSubmitAppeal: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AppealSubmissionModal({
  show, selectedRecordForAppeal, evidenceType, evidenceNotes, evidenceFileName, evidenceFile, isSubmittingAppeal,
  setEvidenceType, setEvidenceNotes, setEvidenceFileName, setEvidenceFile,
  onClose, onSubmitAppeal, onFileChange
}: AppealSubmissionModalProps) {
  if (!show || !selectedRecordForAppeal) return null;

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <span className="text-xl font-bold">×</span>
          </button>
        </div>

        <form onSubmit={onSubmitAppeal} className="p-5 space-y-4">
          <div>
            <label htmlFor="evidenceType" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Sebab / Jenis Dokumen *
            </label>
            <select
              id="evidenceType"
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
            <label htmlFor="evidenceNotes" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Nyatakan Alasan / Justifikasi *
            </label>
            <textarea
              id="evidenceNotes"
              required
              rows={3}
              placeholder="Tulis penerangan ringkas mengenai sebab anda terlepas kuliah atau berada di luar geofence..."
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div>
            <label htmlFor="evidenceFile" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Muat Naik Sijil / Dokumen Bukti *
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50/50 transition-all relative">
              <input
                id="evidenceFile"
                type="file"
                required={!evidenceFile}
                accept="image/*,application/pdf"
                onChange={onFileChange}
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
              onClick={onClose}
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
  );
}
