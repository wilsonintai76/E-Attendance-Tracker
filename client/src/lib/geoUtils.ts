/**
 * Utility functions for Geolocation and Geofencing calculations
 */

// Calculate distance between two coordinates in meters using the Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export interface LocationPreset {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

// POLIKU Campus Presets for easy testing
export const POLIKU_PRESETS: LocationPreset[] = [
  {
    name: "POLIKU Jabatan Kejuruteraan Mekanikal (JKM)",
    latitude: 1.6033,
    longitude: 110.3547,
    description: "Mechanical Engineering Department Classrooms"
  },
  {
    name: "POLIKU Block A (Administration)",
    latitude: 1.6042,
    longitude: 110.3551,
    description: "Main Administrative Building & Central Hall"
  },
  {
    name: "POLIKU Dewan Serbaguna",
    latitude: 1.6025,
    longitude: 110.3542,
    description: "Multipurpose Sports and Exam Hall"
  },
  {
    name: "POLIKU Perpustakaan (Library)",
    latitude: 1.6038,
    longitude: 110.3559,
    description: "Main Academic Library Block"
  },
  {
    name: "Mock Home Location (Test)",
    latitude: 1.6050,
    longitude: 110.3520,
    description: "Nearby student housing (approx 350m away - testing out-of-bounds)"
  }
];

// Fallback current position fetch wrapped in a Promise
export function getCurrentCoordinates(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
