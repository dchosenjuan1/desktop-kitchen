import React from 'react';

interface BrandTransitionProps {
  isActive: boolean;
  children: React.ReactNode;
}

const BrandTransition: React.FC<BrandTransitionProps> = ({ isActive, children }) => (
  <div
    className="absolute inset-0"
    style={{
      opacity: isActive ? 1 : 0,
      transform: isActive ? 'scale(1)' : 'scale(0.98)',
      transition: 'opacity 1s ease-in-out, transform 1s ease-in-out',
      pointerEvents: isActive ? 'auto' : 'none',
    }}
  >
    {children}
  </div>
);

export default BrandTransition;
