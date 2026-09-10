import React from "react";

export default function BackgroundOverlay() {
  return (
    <div id="cyber-bg-overlay" className="fixed inset-0 -z-10 bg-[#07070a] overflow-hidden pointer-events-none">
      {/* 1. Subtle, professional tech background grid */}
      <div 
        id="cyber-grid"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] opacity-80"
      />

      {/* 2. Soft, non-flashy dark purple ambient radial depth spot */}
      <div 
        id="bg-ambient-glow"
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-950/15 blur-[120px] pointer-events-none"
      />
      <div 
        id="bg-ambient-glow-2"
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-950/10 blur-[150px] pointer-events-none"
      />
    </div>
  );
}

