import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Compass, Plus, Navigation } from 'lucide-react';
import { Course } from '../../../lib/store';
import { POLIKU_PRESETS, getCurrentCoordinates } from '../../../lib/geoUtils';
import PolikuMap from '../../PolikuMap';
import { toast } from 'sonner';

interface RegisterCourseModalProps {
  show: boolean;
  editingCourse: Course | null;
  onClose: () => void;
  onSave: (courseData: Partial<Course>) => void;
}

export default function RegisterCourseModal({
  show,
  editingCourse,
  onClose,
  onSave
}: RegisterCourseModalProps) {
  const [regCode, setRegCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regClassGroup, setRegClassGroup] = useState('');
  const [regLat, setRegLat] = useState('1.6033');
  const [regLng, setRegLng] = useState('110.3547');
  const [regRadius, setRegRadius] = useState(200);
  const [regStartDate, setRegStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [regTotalHours, setRegTotalHours] = useState('42');
  const [regHoursPerWeek, setRegHoursPerWeek] = useState('3');
  
  const [showCourseGpsModal, setShowCourseGpsModal] = useState(false);
  const [regSelectedPreset, setRegSelectedPreset] = useState('');
  const [isFetchingCourseGPS, setIsFetchingCourseGPS] = useState(false);

  useEffect(() => {
    if (show) {
      if (editingCourse) {
        setRegCode(editingCourse.code);
        setRegName(editingCourse.name);
        setRegLocation(editingCourse.location);
        setRegClassGroup(editingCourse.classGroup || '');
        setRegLat(editingCourse.latitude ? editingCourse.latitude.toString() : '1.6033');
        setRegLng(editingCourse.longitude ? editingCourse.longitude.toString() : '110.3547');
        setRegRadius(editingCourse.radius || 50);
        setRegStartDate(editingCourse.startDate);
        setRegTotalHours(editingCourse.totalContactHours.toString());
        setRegHoursPerWeek(editingCourse.hoursPerWeek.toString());
        setRegSelectedPreset('');
      } else {
        setRegCode('');
        setRegName('');
        setRegLocation('');
        setRegClassGroup('');
        setRegLat('1.6033');
        setRegLng('110.3547');
        setRegRadius(200);
        setRegStartDate(new Date().toISOString().split('T')[0]);
        setRegTotalHours('42');
        setRegHoursPerWeek('3');
        setRegSelectedPreset('');
      }
    }
  }, [show, editingCourse]);

  const handleTotalHoursChange = (val: string) => {
    setRegTotalHours(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const perWeek = Math.round((num / 14) * 10) / 10;
      setRegHoursPerWeek(perWeek.toString());
    } else {
      setRegHoursPerWeek('');
    }
  };

  const handleHoursPerWeekChange = (val: string) => {
    setRegHoursPerWeek(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const total = Math.round(num * 14);
      setRegTotalHours(total.toString());
    } else {
      setRegTotalHours('');
    }
  };

  const handleApplyCoursePreset = (presetName: string) => {
    setRegSelectedPreset(presetName);
    const preset = POLIKU_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setRegLat(preset.latitude.toFixed(6));
      setRegLng(preset.longitude.toFixed(6));
      toast.success(`Applied preset: ${preset.name}`);
    }
  };

  const fetchCurrentCourseLocation = async () => {
    setIsFetchingCourseGPS(true);
    try {
      const coords = await getCurrentCoordinates();
      setRegLat(coords.coords.latitude.toFixed(6));
      setRegLng(coords.coords.longitude.toFixed(6));
      setRegSelectedPreset('');
      toast.success('Course GPS coordinates captured successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get GPS location');
    } finally {
      setIsFetchingCourseGPS(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCode || !regName || !regLocation) {
      toast.error('Please fill in Course Code, Name and Location');
      return;
    }

    onSave({
      code: regCode.toUpperCase().trim(),
      name: regName.trim(),
      location: regLocation.trim(),
      classGroup: regClassGroup.toUpperCase().trim(),
      latitude: regLat ? parseFloat(regLat) : undefined,
      longitude: regLng ? parseFloat(regLng) : undefined,
      radius: regRadius,
      startDate: regStartDate,
      totalContactHours: parseFloat(regTotalHours) || 0,
      hoursPerWeek: parseFloat(regHoursPerWeek) || 0,
    });
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
            <div>
              <h4 className="font-bold text-sm">{editingCourse ? 'Edit Course' : 'Register New Course'}</h4>
              <p className="text-[10px] text-slate-400">{editingCourse ? 'Update curriculum specifications and GPS boundaries' : 'Set curriculum specifications, location, and standard Politeknik contact hours.'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div>
                <label htmlFor="regCode" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Code *</label>
                <input
                  id="regCode"
                  type="text"
                  required
                  placeholder="e.g. DKM5012"
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="regName" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Name *</label>
                <input
                  id="regName"
                  type="text"
                  required
                  placeholder="e.g. Thermodynamics II"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="regLocation" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classroom Location *</label>
                <input
                  id="regLocation"
                  type="text"
                  required
                  placeholder="e.g. JKM Bilik Kuliah 1"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="regClassGroup" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Class / Group *</label>
                <input
                  id="regClassGroup"
                  type="text"
                  required
                  placeholder="e.g. DKM5A"
                  value={regClassGroup}
                  onChange={(e) => setRegClassGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Geofencing Location GPS Config */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase">GPS Geofence Boundary</span>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-blue-100">
                    {regRadius}m Radius
                  </span>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400 font-bold block uppercase text-[8px]">Current Boundary:</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {parseFloat(regLat || '1.6033').toFixed(4)}, {parseFloat(regLng || '110.3547').toFixed(4)}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setShowCourseGpsModal(true)}
                      className="bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-150 py-1.5 px-3 rounded-xl text-[10px] font-bold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1"
                    >
                      📍 Configure GPS & Map
                    </button>
                  </div>
                </div>
              </div>

              {/* Start Date & Hours Calculator */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="w-4.5 h-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase">Syllabus & Hours Calculator</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="regStartDate" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">First Class Start Date *</label>
                    <input
                      id="regStartDate"
                      type="date"
                      required
                      value={regStartDate}
                      onChange={(e) => setRegStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    />
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100/50 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="regTotalHours" className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Total Contact Hours</label>
                        <input
                          id="regTotalHours"
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 42"
                          value={regTotalHours}
                          onChange={(e) => handleTotalHoursChange(e.target.value)}
                          className="w-full bg-white border border-blue-200/60 rounded-xl py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="regHoursPerWeek" className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1.5">Hours Per Week</label>
                        <input
                          id="regHoursPerWeek"
                          type="number"
                          required
                          step="0.1"
                          min="0.5"
                          placeholder="e.g. 3"
                          value={regHoursPerWeek}
                          onChange={(e) => handleHoursPerWeekChange(e.target.value)}
                          className="w-full bg-white border border-blue-200/60 rounded-xl py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-blue-600/80 font-semibold leading-relaxed">
                      <span>Calculated for a standard <strong>14-week</strong> Politeknik lecture semester. Setting either value will automatically solve the other.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 rounded-b-3xl">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Register Course
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* POPUP SUB-MODAL: Course GPS Geofence Configuration */}
      {showCourseGpsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Configure Course GPS Geofence</h4>
                <p className="text-[10px] text-slate-400">Set standard attendance boundary for this course</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseGpsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg font-bold transition-all cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="campusPreset" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campus Location Preset</label>
                <select
                  id="campusPreset"
                  value={regSelectedPreset}
                  onChange={(e) => handleApplyCoursePreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-700 focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Custom Coordinates --</option>
                  {POLIKU_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="regLat" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                  <input
                    id="regLat"
                    type="number"
                    step="0.000001"
                    required
                    value={regLat}
                    onChange={(e) => setRegLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="regLng" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                  <input
                    id="regLng"
                    type="number"
                    step="0.000001"
                    required
                    value={regLng}
                    onChange={(e) => setRegLng(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCurrentCourseLocation}
                disabled={isFetchingCourseGPS}
                className="w-full bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isFetchingCourseGPS ? 'animate-spin text-blue-600' : ''}`} />
                {isFetchingCourseGPS ? 'Fetching GPS...' : 'Capture My GPS Coordinates'}
              </button>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="regRadius" className="block text-[10px] font-bold text-slate-400 uppercase">Geofence Radius: {regRadius}m</label>
                </div>
                <input
                  id="regRadius"
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={regRadius}
                  onChange={(e) => setRegRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium px-1 mt-0.5">
                  <span>10m (Room)</span>
                  <span>100m (Hall)</span>
                  <span>300m (Campus)</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                  Interactive Map Picker
                </label>
                <PolikuMap
                  latitude={parseFloat(regLat) || 1.6033}
                  longitude={parseFloat(regLng) || 110.3547}
                  radius={regRadius}
                  interactive={true}
                  onChange={(lat, lng) => {
                    setRegLat(lat.toString());
                    setRegLng(lng.toString());
                  }}
                  height="200px"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCourseGpsModal(false);
                  toast.success(`Course geofence boundary saved!`);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center"
              >
                Confirm & Save Location
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
