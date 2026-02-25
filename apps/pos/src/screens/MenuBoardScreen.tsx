import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GrainOverlay, BrandView, BrandTransition, MenuListView, TemplateRenderer } from '../components/menu-board';
import { TEMPLATE_REGISTRY } from '../components/menu-board/templates';
import type { ComboData } from '../components/menu-board/ComboHero';
import type { BrandData } from '../types/menu-board';

interface MenuBoardResponse {
  brands: BrandData[];
  combos: ComboData[];
  lastUpdated: string;
}

// Each brand gets slides: template brands get 1 slide, others get photo + list
interface Slide {
  brand: BrandData;
  view: 'photo' | 'list' | 'template';
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

  // Build slides array: template brands get 1 slide, others get photo + list
  const slides: Slide[] = brands.flatMap((brand): Slide[] => {
    if (brand.templateSlug && TEMPLATE_REGISTRY[brand.templateSlug]) {
      return [{ brand, view: 'template' }];
    }
    return [
      { brand, view: 'photo' },
      { brand, view: 'list' },
    ];
  });

  // Fetch menu data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/menu-board/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MenuBoardResponse = await res.json();
      setBrands(data.brands);
      setCombos(data.combos || []);
      setError(null);

      // Load fonts for templates and special brands
      if (!fontsLoaded.current) {
        const fontUrls: string[] = [];
        // Legacy: Ensenada 101 brand
        if (data.brands.some(b => b.slug === 'ensenada-101')) {
          fontUrls.push('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        }
        // Template fonts
        for (const brand of data.brands) {
          if (brand.templateSlug && TEMPLATE_REGISTRY[brand.templateSlug]?.fontsUrl) {
            const url = TEMPLATE_REGISTRY[brand.templateSlug].fontsUrl!;
            if (!fontUrls.includes(url)) fontUrls.push(url);
          }
        }
        for (const url of fontUrls) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }
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
          {slide.view === 'template' ? (
            <TemplateRenderer brand={slide.brand} combos={combos} isPortrait={isPortrait} />
          ) : slide.view === 'photo' ? (
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
              } ${
                slide.view === 'list'
                  ? 'w-4 h-2 rounded-sm'
                  : slide.view === 'template'
                    ? 'w-3 h-3 rounded-md'
                    : 'w-2 h-2 rounded-full'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuBoardScreen;
