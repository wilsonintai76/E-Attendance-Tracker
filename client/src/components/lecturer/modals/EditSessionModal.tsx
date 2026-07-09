import React from 'react';
import { motion } from 'motion/react';
import { AttendanceSession } from '../../../lib/store';

interface EditSessionModalProps {
  show: boolean;
  editingSession: AttendanceSession | null;
  editSessionWeek: string;
  editSessionDate: string;
  editSessionStatus: 'active' | 'inactive';
  onClose: () => void;
  onSave: () => void;
  setEditSessionWeek: (v: string) => void;
  setEditSessionDate: (v: string) => void;
  setEditSessionStatus: (v: 'active' | 'inactive') => void;
}

export default function EditSessionModal({
  show,
  editingSession,
  editSessionWeek,
  editSessionDate,
  editSessionStatus,
  onClose,
  onSave,
  setEditSessionWeek,
  setEditSessionDate,
  setEditSessionStatus,
}: EditSessionModalProps) {
  if (!show || !editingSession) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h4 className="font-bold text-slate-800 mb-4">Edit Session Details</h4>
        <p className="text-xs text-slate-500 mb-4">{editingSession.courseCode} — Current Week: {editingSession.week}</p>
        
        <div className="space-y-3 mb-5">
          <div>
            <label htmlFor="editSessionWeek" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Week Number</label>
            <select id="editSessionWeek" value={editSessionWeek} onChange={(e) => setEditSessionWeek(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer">
              {Array.from({ length: 14 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="editSessionDate" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
            <input id="editSessionDate" type="date" required value={editSessionDate} onChange={(e) => setEditSessionDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>

          <div>
            <label htmlFor="editSessionStatus" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select id="editSessionStatus" value={editSessionStatus} onChange={(e) => setEditSessionStatus(e.target.value as 'active' | 'inactive')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer font-bold">
              <option value="active">Active (LIVE)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-500 font-semibold py-2 rounded-xl text-xs hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={onSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
}
