import React, { useState, useEffect, useCallback } from 'react';
import MenuBoardClock from './MenuBoardClock';
import type { ComboData } from './ComboHero';

interface MenuItemData {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  badges: { type: string; label: string }[];
}

interface CategoryData {
  id: number;
  name: string;
  items: MenuItemData[];
}

interface BrandTheme {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  darkBg: string;
}

interface BrandData {
  id: number;
  name: string;
  slug: string;
  description?: string;
  theme: BrandTheme;
  categories: CategoryData[];
}

interface MenuListViewProps {
  brand: BrandData;
  combos: ComboData[];
  isPortrait: boolean;
}

function useViewportSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const handleResize = useCallback(() => {
    setSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  return size;
}

const MenuListView: React.FC<MenuListViewProps> = ({ brand, combos, isPortrait }) => {
  const { theme } = brand;
  const fonts = theme.fontFamily || 'system-ui, -apple-system, sans-serif';
  const fontParts = fonts.split(',').map(f => f.trim().replace(/'/g, ''));
  const headingFont = fontParts[0] || 'system-ui';
  const bodyFont = fontParts[1] || fontParts[0] || 'system-ui';

  const cssVars = {
    '--mb-primary': theme.primaryColor,
    '--mb-secondary': theme.secondaryColor || theme.primaryColor,
    '--mb-dark-bg': theme.darkBg,
    '--mb-font': fonts,
    '--mb-font-heading': `'${headingFont}', sans-serif`,
    '--mb-font-body': `'${bodyFont}', sans-serif`,
  } as React.CSSProperties;

  const { height: vh, width: vw } = useViewportSize();

  // Build all categories, adding combos as a virtual one
  const allCategories: CategoryData[] = [
    ...brand.categories.filter(c => c.name.toLowerCase() !== 'combos'),
  ];
  if (combos.length > 0) {
    allCategories.push({
      id: -1,
      name: 'Combos',
      items: combos.map(c => ({
        id: c.id + 100000,
        name: c.name,
        price: c.comboPrice,
        badges: [],
      })),
    });
  }

  // Adaptive sizing based on viewport
  const totalItems = allCategories.reduce((s, c) => s + c.items.length, 0);
  const colCount = isPortrait ? 2 : (totalItems > 25 ? 3 : 2);

  // Scale typography to viewport
  const scale = Math.min(vh / 1080, vw / 1920) * (isPortrait ? 1.1 : 1);
  const itemFont = Math.max(14, Math.min(24, Math.round(18 * scale)));
  const priceFont = Math.max(14, Math.min(22, Math.round(17 * scale)));
  const catFont = Math.max(11, Math.min(16, Math.round(13 * scale)));
  const itemPad = Math.max(4, Math.round(8 * scale));
  const catGap = Math.max(12, Math.round(24 * scale));

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: `var(--mb-font-body)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <h1
            className="text-xl font-black uppercase tracking-wider text-white"
            style={{ fontFamily: `var(--mb-font-heading)` }}
          >
            {brand.name}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-white/30">
          <MenuBoardClock />
          <span className="text-[10px] uppercase tracking-widest">Precios en MXN</span>
        </div>
      </div>

      {/* Flowing multi-column content — newspaper style */}
      <div
        className="flex-1 overflow-hidden px-8 py-5"
        style={{
          columnCount: colCount,
          columnGap: isPortrait ? 24 : 48,
          columnRule: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {allCategories.map((cat, catIdx) => (
          <div
            key={cat.id}
            style={{
              breakInside: 'avoid',
              WebkitColumnBreakInside: 'avoid',
              paddingBottom: catGap,
            } as React.CSSProperties}
          >
            {/* Centered decorative category header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, var(--mb-primary), transparent)`, opacity: 0.3 }} />
              <span
                className="font-black uppercase tracking-[0.25em] shrink-0"
                style={{
                  fontSize: catFont,
                  color: 'var(--mb-primary)',
                  fontFamily: 'var(--mb-font-heading, inherit)',
                }}
              >
                {cat.name}
              </span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, var(--mb-primary), transparent)`, opacity: 0.3 }} />
            </div>

            {/* Items — clean, spacious rows */}
            {cat.items.map((item, itemIdx) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between"
                style={{
                  paddingTop: itemPad,
                  paddingBottom: itemPad,
                  paddingLeft: 4,
                  paddingRight: 4,
                  borderBottom: itemIdx < cat.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                }}
              >
                <span
                  className="text-white/90 truncate"
                  style={{ fontSize: itemFont, maxWidth: '75%' }}
                >
                  {item.name}
                </span>
                <span
                  className="font-bold shrink-0 ml-3"
                  style={{ fontSize: priceFont, color: 'var(--mb-secondary, var(--mb-primary))' }}
                >
                  ${item.price}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuListView;
