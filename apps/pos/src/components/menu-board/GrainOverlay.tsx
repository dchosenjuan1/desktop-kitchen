import React from 'react';

const GrainOverlay: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
    style={{ mixBlendMode: 'overlay' }}
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </div>
);

export default GrainOverlay;
