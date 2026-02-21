import React, { useState, useEffect, useCallback } from 'react';
import ComboHero from './ComboHero';
import MagazineGrid from './MagazineGrid';
import MenuItemCard from './MenuItemCard';
import MenuBoardClock from './MenuBoardClock';
import { useMenuLayout } from './useMenuLayout';
import type { ComboData } from './ComboHero';
import type { BrandData, CategoryData } from '../../types/menu-board';

interface BrandViewProps {
  brand: BrandData;
  combos: ComboData[];
  isPortrait: boolean;
}

function getComboHeroImage(combo: ComboData, categories: CategoryData[]): string | null {
  for (const slot of combo.slots) {
    if (slot.itemImage) return slot.itemImage;
  }
  for (const slot of combo.slots) {
    if (slot.categoryId) {
      const cat = categories.find(c => c.id === slot.categoryId);
      if (cat) {
        for (const item of cat.items) {
          if (item.imageUrl) return item.imageUrl;
        }
      }
    }
  }
  return null;
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

// ── Sidebar: compact list with small pics ──────────────────────────────────

const SidebarPanel: React.FC<{ categories: CategoryData[]; height: number }> = ({ categories, height }) => {
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const headerCount = categories.length;
  const headerH = 26;
  const gap = 6;
  const availableForItems = height - (headerCount * headerH) - ((headerCount - 1) * gap) - 8;
  const itemH = Math.max(32, Math.floor(availableForItems / Math.max(totalItems, 1)));

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg bg-white/[0.02] border border-white/[0.04]"
      style={{ height, gap }}
    >
      {categories.map((cat, catIdx) => (
        <div key={cat.id} className="flex flex-col min-h-0">
          {/* Category label */}
          <div
            className="flex items-center px-2.5 shrink-0 rounded-t-md"
            style={{
              height: headerH,
              background: catIdx === 0
                ? 'var(--mb-primary)'
                : 'linear-gradient(90deg, var(--mb-primary), transparent)',
              opacity: catIdx === 0 ? 0.85 : 0.5,
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white truncate">
              {cat.name}
            </span>
          </div>
          {/* Items */}
          <div className="flex flex-col px-1">
            {cat.items.map(item => (
              <div key={item.id} style={{ height: itemH }}>
                <MenuItemCard
                  name={item.name}
                  price={item.price}
                  description={item.description}
                  imageUrl={item.imageUrl}
                  badges={item.badges}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const BrandView: React.FC<BrandViewProps> = ({ brand, combos, isPortrait }) => {
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

  const nonComboCategories = brand.categories.filter(
    c => c.name.toLowerCase() !== 'combos'
  );

  const { width: vw, height: vh } = useViewportSize();
  const hasCombos = combos.length > 0;

  const layout = useMenuLayout({
    categories: nonComboCategories,
    viewportHeight: vh,
    viewportWidth: vw,
    hasCombos,
    isPortrait,
  });

  if (isPortrait) {
    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: `var(--mb-font-body)` }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
            <h1 className="text-lg font-black uppercase tracking-wide text-white" style={{ fontFamily: `var(--mb-font-heading)` }}>
              {brand.name}
            </h1>
          </div>
          <MenuBoardClock />
        </div>

        <div className="flex-1 overflow-hidden px-5 py-2 flex flex-col gap-2 min-h-0">
          {hasCombos && (
            <div className="flex flex-col gap-2 shrink-0" style={{ height: layout.comboRowHeight }}>
              {combos.map(combo => (
                <ComboHero
                  key={combo.id}
                  combo={combo}
                  isPortrait
                  heroImage={getComboHeroImage(combo, brand.categories)}
                  height={Math.floor(layout.comboRowHeight / combos.length) - (combos.length > 1 ? 4 : 0)}
                />
              ))}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <MagazineGrid layout={layout} categories={layout.mainCategories} />
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-1.5 border-t border-white/[0.06] text-white/30 shrink-0">
          <span className="text-[9px] uppercase tracking-widest">Precios en MXN</span>
        </div>
      </div>
    );
  }

  // ── Landscape layout ─────────────────────────────────────────────────────
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: `var(--mb-font-body)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <h1 className="text-lg font-black uppercase tracking-wider text-white" style={{ fontFamily: `var(--mb-font-heading)` }}>
            {brand.name}
          </h1>
          {brand.description && (
            <span className="text-[10px] text-white/30 uppercase tracking-widest ml-2 hidden sm:inline">
              {brand.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-white/30">
          <MenuBoardClock />
          <span className="text-[9px] uppercase tracking-widest">MXN</span>
        </div>
      </div>

      {/* Content: optional sidebar + main area */}
      <div className="flex-1 overflow-hidden px-6 py-2 flex gap-4 min-h-0">
        {/* Left sidebar */}
        {layout.hasSidebar && (
          <div className="shrink-0" style={{ width: '20%', minWidth: 180, maxWidth: 280 }}>
            <SidebarPanel categories={layout.sidebarCategories} height={layout.gridHeight} />
          </div>
        )}

        {/* Main content: combos + grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
          {hasCombos && (
            <div className="flex gap-4 shrink-0" style={{ height: layout.comboRowHeight }}>
              {combos.map(combo => (
                <ComboHero
                  key={combo.id}
                  combo={combo}
                  isPortrait={false}
                  heroImage={getComboHeroImage(combo, brand.categories)}
                  height={layout.comboRowHeight}
                />
              ))}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <MagazineGrid layout={layout} categories={layout.mainCategories} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandView;
