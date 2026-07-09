'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Compass } from 'lucide-react';

interface PolikuMapProps {
  latitude: number;
  longitude: number;
  radius?: number;
  interactive?: boolean;
  onChange?: (lat: number, lng: number) => void;
  studentLocation?: [number, number] | null;
  height?: string;
}

// Dynamically import the map component with SSR disabled
const PolikuMapInner = dynamic(() => import('./PolikuMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-3 shadow-2xs" style={{ height: '350px' }}>
      <Compass className="w-10 h-10 animate-spin text-blue-500 opacity-70" />
      <span className="text-xs font-semibold text-slate-500 animate-pulse">Loading POLIKU Geofence Engine...</span>
    </div>
  )
});

export default function PolikuMap({
  latitude,
  longitude,
  radius,
  interactive,
  onChange,
  studentLocation,
  height
}: PolikuMapProps) {
  return (
    <PolikuMapInner
      latitude={latitude}
      longitude={longitude}
      radius={radius}
      interactive={interactive}
      onChange={onChange}
      studentLocation={studentLocation}
      height={height}
    />
  );
}
