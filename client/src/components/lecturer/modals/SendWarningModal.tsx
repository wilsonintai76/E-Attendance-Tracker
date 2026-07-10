import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, X, UploadCloud, FileText } from 'lucide-react';

interface SendWarningModalProps {
  show: boolean;
  student: any;
  attendanceThreshold: number;
  onClose: () => void;
  onConfirm: (file?: File) => void;
  isSending: boolean;
}

export default function SendWarningModal({
  show,
  student,
  attendanceThreshold,
  onClose,
  onConfirm,
  isSending,
}: SendWarningModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!show || !student) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Sila muat naik fail dalam format PDF sahaja.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Saiz fail tidak boleh melebihi 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedFile || undefined);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Hantar Surat Amaran</h3>
              <p className="text-[11px] text-slate-400 font-semibold">SPMP Warning Letter</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Maklumat Pelajar</h4>
              <p className="font-bold text-slate-800">{student.studentName}</p>
              <p className="text-xs text-slate-500 mt-1">{student.courseCode} - {student.courseName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500 font-medium">Kehadiran Semasa:</span>
                <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-lg text-xs">
                  {student.rate}%
                </span>
                <span className="text-[10px] text-slate-400">(Ambang: {attendanceThreshold}%)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Lampiran Surat SPMP (Opsyenal)
              </label>
              <div className="mt-1">
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-600 mb-1">Klik untuk muat naik PDF</p>
                      <p className="text-[10px] text-slate-400">Hanya format PDF (Maks 5MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="w-8 h-8 rounded-full hover:bg-blue-100 flex items-center justify-center text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>Menghantar...</>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Pancarkan Amaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
