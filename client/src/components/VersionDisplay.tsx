import React from 'react';

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export default function VersionDisplay() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined'
    ? new Date(__BUILD_TIME__).toLocaleString()
    : '';

  return (
    <div className="text-[9px] text-slate-300 font-mono text-center py-1 select-none">
      E-Attendance {version} {buildTime && `• ${buildTime}`}
    </div>
  );
}

// For PWA update check
export function getVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
}
