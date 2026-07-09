import React from 'react';
import { motion } from 'motion/react';
import { AttendanceRecord } from '../../../lib/store';

interface ReviewAppealModalProps {
  show: boolean;
  selectedRecordForReview: AttendanceRecord | null;
  lecturerNotes: string;
  setLecturerNotes: (v: string) => void;
  onClose: () => void;
  onReviewAppeal: (status: 'approved' | 'rejected') => void;
}

export default function ReviewAppealModal({
  show,
  selectedRecordForReview,
  lecturerNotes,
  setLecturerNotes,
  onClose,
  onReviewAppeal
}: ReviewAppealModalProps) {
  if (!show || !selectedRecordForReview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-sm">Semakan Bukti Kehadiran Pelajar</h4>
            <p className="text-[10px] text-slate-400">Review submitted medical certificates or letters of justification</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <span className="text-xl font-bold">×</span>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Student Metadata */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Nama Pelajar:</span>
              <strong className="text-slate-800 text-[13px]">{selectedRecordForReview.studentName}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">No Matrik:</span>
              <strong className="text-slate-800 font-mono">{selectedRecordForReview.matricNo}</strong>
            </div>
            <div className="mt-1">
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Kumpulan Kelas:</span>
              <strong className="text-slate-800">{selectedRecordForReview.classGroup}</strong>
            </div>
            <div className="mt-1">
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Jenis Pelepasan:</span>
              <strong className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                {selectedRecordForReview.evidenceType === 'sijil_sakit' 
                  ? 'Sijil Sakit (MC)' 
                  : selectedRecordForReview.evidenceType === 'surat_pelepasan' 
                  ? 'Surat Pelepasan Kuliah' 
                  : 'Sebab-sebab Lain'}
              </strong>
            </div>
          </div>

          {/* Reason / Justification notes */}
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block uppercase text-[9px]">Alasan Pelajar:</span>
            <div className="bg-amber-50/40 border border-amber-100/50 p-3 rounded-xl text-xs text-slate-700 italic">
              &quot; {selectedRecordForReview.evidenceNotes || 'Tiada catatan sebab disediakan.'} &quot;
            </div>
          </div>

          {/* Render simulated file / scanned image */}
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block uppercase text-[9px]">Dokumen Lampiran:</span>
            {selectedRecordForReview.evidenceFileKey ? (
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-100/30 flex flex-col items-center gap-2">
                {selectedRecordForReview.evidenceFileKey.startsWith('data:image/') ? (
                  <div className="relative w-full max-h-40 overflow-hidden rounded-xl border border-slate-200 flex justify-center items-center bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedRecordForReview.evidenceFileKey} 
                      alt="Evidence document" 
                      className="object-contain max-h-40"
                    />
                  </div>
                ) : (
                  <div className="w-full py-4 px-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-slate-700 truncate max-w-50">{selectedRecordForReview.evidenceFileName || 'dokumen_sokongan.pdf'}</p>
                        <p className="text-[9px] text-slate-400">Document File (Simulated Preview)</p>
                      </div>
                    </div>
                    <a 
                      href={selectedRecordForReview.evidenceFileKey} 
                      download={selectedRecordForReview.evidenceFileName || 'sijil_sakit.pdf'}
                      className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    >
                      Muat Turun
                    </a>
                  </div>
                )}
                <span className="text-[9px] font-mono text-slate-400">Nama Fail: {selectedRecordForReview.evidenceFileName}</span>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                Tiada fail dokumen dijumpai.
              </div>
            )}
          </div>

          {/* Decision and Review Comments */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Catatan / Ulasan Pensyarah (Disimpan bersama keputusan)
            </label>
            <textarea
              rows={2}
              placeholder="Sila masukkan catatan maklumbalas mengenai permohonan ini..."
              value={lecturerNotes}
              onChange={(e) => setLecturerNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onReviewAppeal('rejected')}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              ✗ Tolak (Absent)
            </button>
            <button
              type="button"
              onClick={() => onReviewAppeal('approved')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              ✓ Luluskan Kehadiran
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
