import React from 'react';
import { Compass } from 'lucide-react';
import PolikuMapInner from './PolikuMapInner';

interface PolikuMapProps {
  latitude: number;
  longitude: number;
  radius?: number;
  interactive?: boolean;
  onChange?: (lat: number, lng: number) => void;
  studentLocation?: [number, number] | null;
  height?: string;
}

export default function PolikuMap({
  latitude,
  longitude,
  radius,
  interactive,
  onChange,
  studentLocation,
  height,
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
