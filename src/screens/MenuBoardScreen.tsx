import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GrainOverlay, BrandView, BrandTransition, MenuListView } from '../components/menu-board';
import type { ComboData } from '../components/menu-board/ComboHero';
import type { BrandData } from '../types/menu-board';

interface MenuBoardResponse {
  brands: BrandData[];
  combos: ComboData[];
  lastUpdated: string;
}

// Each brand gets 2 slides: photo cards, then full list
interface Slide {
  brand: BrandData;
  view: 'photo' | 'list';
}

const ROTATE_INTERVAL = 12_000; // 12s per slide
const REFETCH_INTERVAL = 5 * 60_000; // 5 min
const CURSOR_HIDE_DELAY = 3_000;

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MenuBoardScreen: React.FC = () => {
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorTimer = useRef<number | null>(null);
  const fontsLoaded = useRef(false);

  // Build slides array: for each brand, photo view then list view
  const slides: Slide[] = brands.flatMap(brand => [
    { brand, view: 'photo' as const },
    { brand, view: 'list' as const },
  ]);

  // Fetch menu data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/menu-board/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MenuBoardResponse = await res.json();
      setBrands(data.brands);
      setCombos(data.combos || []);
      setError(null);

      if (!fontsLoaded.current && data.brands.some(b => b.slug === 'ensenada-101')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
        fontsLoaded.current = true;
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFETCH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % slides.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(id);
  }, [slides.length]);

  // Orientation detection
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    setIsPortrait(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hide cursor after inactivity
  useEffect(() => {
    const resetCursor = () => {
      setCursorHidden(false);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = window.setTimeout(() => setCursorHidden(true), CURSOR_HIDE_DELAY);
    };
    resetCursor();
    window.addEventListener('mousemove', resetCursor);
    window.addEventListener('touchstart', resetCursor);
    return () => {
      window.removeEventListener('mousemove', resetCursor);
      window.removeEventListener('touchstart', resetCursor);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    };
  }, []);

  // Hide scrollbars globally
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .menu-board-root, .menu-board-root * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .menu-board-root ::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white/30 text-lg animate-pulse">Loading menu...</div>
      </div>
    );
  }

  if (error || brands.length === 0) {
    return (
      <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white/30 text-lg">{error || 'No menu data available'}</div>
      </div>
    );
  }

  return (
    <div
      className={`menu-board-root w-screen h-screen bg-neutral-950 overflow-hidden relative ${cursorHidden ? 'cursor-none' : ''}`}
    >
      <GrainOverlay />

      {slides.map((slide, i) => (
        <BrandTransition key={`${slide.brand.id}-${slide.view}`} isActive={i === activeSlideIndex}>
          {slide.view === 'photo' ? (
            <BrandView brand={slide.brand} combos={combos} isPortrait={isPortrait} />
          ) : (
            <MenuListView brand={slide.brand} combos={combos} isPortrait={isPortrait} />
          )}
        </BrandTransition>
      ))}

      {/* Slide indicator dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
          {slides.map((slide, i) => (
            <button
              key={`${slide.brand.id}-${slide.view}`}
              onClick={() => setActiveSlideIndex(i)}
              className={`transition-all duration-500 ${
                i === activeSlideIndex
                  ? 'bg-white/60 scale-110'
                  : 'bg-white/20'
              } ${slide.view === 'list' ? 'w-4 h-2 rounded-sm' : 'w-2 h-2 rounded-full'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuBoardScreen;
