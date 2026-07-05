'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Compass, Navigation, Info } from 'lucide-react';
import { toast } from 'sonner';

interface PolikuMapInnerProps {
  latitude: number;
  longitude: number;
  radius?: number;
  interactive?: boolean;
  onChange?: (lat: number, lng: number) => void;
  studentLocation?: [number, number] | null;
  height?: string;
}

export default function PolikuMapInner({
  latitude,
  longitude,
  radius = 50,
  interactive = false,
  onChange,
  studentLocation = null,
  height = '350px'
}: PolikuMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create custom SVG icon for classroom center (red/blue pinpoint)
    const classroomIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-blue-600/30 rounded-full animate-ping"></div>
          <div class="w-7 h-7 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2 h-2 bg-blue-600 rotate-45 border-r border-b border-white"></div>
        </div>
      `,
      className: 'custom-classroom-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive
    }).setView([latitude, longitude], 17);

    mapRef.current = map;

    // Use a clean vector map tile style from OpenStreetMap Carto
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add Classroom Geofence Circle
    const circle = L.circle([latitude, longitude], {
      color: '#3b82f6', // blue-500
      fillColor: '#93c5fd', // blue-300
      fillOpacity: 0.35,
      radius: radius
    }).addTo(map);
    circleRef.current = circle;

    // Add Classroom Center Pin
    const marker = L.marker([latitude, longitude], {
      icon: classroomIcon,
      draggable: false
    }).addTo(map);
    markerRef.current = marker;

    // Handle clicks if interactive
    if (interactive && onChange) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateLocation(lat, lng);
      });
    }

    // Fix grey tile rendering issue by forcing a resize trigger
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update location helper
  const updateLocation = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    // Smooth pan to clicked spot
    mapRef.current.panTo([lat, lng]);

    // Update marker position
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    // Update circle position
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    }

    if (onChange) {
      onChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
    }
  };

  // Sync classroom location from props
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current) {
      const currentCenter = markerRef.current.getLatLng();
      if (currentCenter.lat !== latitude || currentCenter.lng !== longitude) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
      }
    }
  }, [latitude, longitude]);

  // Sync radius from props
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // Sync student location from props
  useEffect(() => {
    if (!mapRef.current) return;

    if (studentLocation) {
      const [sLat, sLng] = studentLocation;

      const studentIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-emerald-500/40 rounded-full animate-ping"></div>
            <div class="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z" />
              </svg>
            </div>
          </div>
        `,
        className: 'custom-student-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      if (studentMarkerRef.current) {
        studentMarkerRef.current.setLatLng([sLat, sLng]);
      } else {
        studentMarkerRef.current = L.marker([sLat, sLng], {
          icon: studentIcon
        }).addTo(mapRef.current);
      }

      // Automatically adjust map view to fit both center and student
      const bounds = L.latLngBounds([
        [latitude, longitude],
        [sLat, sLng]
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (studentMarkerRef.current) {
        studentMarkerRef.current.remove();
        studentMarkerRef.current = null;
      }
    }
  }, [studentLocation, latitude, longitude]);

  // GPS Pin current location function (Google Maps function)
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      toast.loading('Detecting your GPS location...', { id: 'gps-locate' });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: currentLat, longitude: currentLng } = position.coords;
          toast.dismiss('gps-locate');
          toast.success('Successfully detected and pinned your current location!');
          
          if (onChange) {
            onChange(parseFloat(currentLat.toFixed(6)), parseFloat(currentLng.toFixed(6)));
          }

          if (mapRef.current) {
            mapRef.current.setView([currentLat, currentLng], 17);
          }
        },
        (error) => {
          toast.dismiss('gps-locate');
          console.error(error);
          toast.error('Could not access GPS. Please ensure browser location permissions are granted, or use the sandbox Mock buttons!');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  // Handle OSM Nominatim Search
  const handleMapSearch = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Append country limits for better local accuracy (Malaysia, Sarawak)
      const q = `${searchQuery.trim()}, Sarawak, Malaysia`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const found = data[0];
        const lat = parseFloat(found.lat);
        const lng = parseFloat(found.lon);
        updateLocation(lat, lng);
        toast.success(`Found location: ${found.display_name.split(',')[0]}`);
      } else {
        // Fallback search without specific restrictions
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`
        );
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const found = fallbackData[0];
          const lat = parseFloat(found.lat);
          const lng = parseFloat(found.lon);
          updateLocation(lat, lng);
          toast.success(`Found: ${found.display_name.split(',')[0]}`);
        } else {
          toast.error('Location not found. Try searching for specific campus block names, or click directly on the map!');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Search service currently unavailable. Please click on the map to pin.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col shadow-xs" style={{ height }}>
      {/* Dynamic search bar inside map for interactive search */}
      {interactive && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search map (e.g. JKM Kuching, Matang)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMapSearch(e);
                }
              }}
              className="w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-700 shadow-md outline-none focus:ring-2 focus:ring-blue-100 transition-all font-semibold"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <button
            type="button"
            onClick={(e) => handleMapSearch(e)}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isSearching ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Search'
            )}
          </button>
        </div>
      )}

      {/* Actual Map Canvas */}
      <div id="poliku-leaflet-map" ref={mapContainerRef} className="flex-1 w-full z-0 h-full" />

      {/* Map Interactive HUD overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 shadow-md flex items-center gap-1.5 border border-slate-100">
        <MapPin className="w-3 h-3 text-blue-600" />
        <span>GPS: <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{latitude.toFixed(5)}, {longitude.toFixed(5)}</code></span>
        {interactive && <span className="text-blue-600 font-extrabold">• Click Map to Re-pin</span>}
      </div>

      {/* Floating GPS locating button (Google Maps Style) */}
      {interactive && (
        <button
          type="button"
          title="Find my current location"
          onClick={handleLocateMe}
          className="absolute bottom-3 right-3 z-[1000] bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 active:scale-95 w-9 h-9 rounded-full shadow-md border border-slate-200 flex items-center justify-center transition-all cursor-pointer group"
        >
          <Navigation className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-all" />
        </button>
      )}
    </div>
  );
}
