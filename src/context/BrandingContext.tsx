import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { generatePalette, applyBrandPalette, resetBrandPalette, type BrandPalette } from '../lib/colorUtils';

export interface BrandingConfig {
  primaryColor: string;
  logoUrl?: string;
  restaurantName?: string;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  palette: BrandPalette | null;
  isLoaded: boolean;
  setBranding: (config: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const DEFAULT_PRIMARY = '#dc2626';

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBrandingState] = useState<BrandingConfig | null>(null);
  const [palette, setPalette] = useState<BrandPalette | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Apply branding and generate palette
  const setBranding = useCallback((config: BrandingConfig) => {
    setBrandingState(config);
    const p = generatePalette(config.primaryColor || DEFAULT_PRIMARY);
    setPalette(p);
    applyBrandPalette(p);
  }, []);

  // Fetch branding from server on mount
  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      try {
        const res = await fetch('/api/branding');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.primaryColor) {
            setBranding(data);
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // Server unreachable — use defaults
      }

      // Check localStorage for cached branding
      try {
        const cached = localStorage.getItem('branding');
        if (!cancelled && cached) {
          const parsed = JSON.parse(cached);
          if (parsed.primaryColor) {
            setBranding(parsed);
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // Invalid cache — ignore
      }

      // Fall back to defaults
      if (!cancelled) {
        resetBrandPalette();
        setIsLoaded(true);
      }
    }

    loadBranding();
    return () => { cancelled = true; };
  }, [setBranding]);

  // Cache branding to localStorage whenever it changes
  useEffect(() => {
    if (branding) {
      try {
        localStorage.setItem('branding', JSON.stringify(branding));
      } catch {
        // Storage full — non-critical
      }
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, palette, isLoaded, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};
