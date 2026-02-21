import React, { useState, useEffect, useCallback } from 'react';
import MenuBoardClock from './MenuBoardClock';
import type { ComboData } from './ComboHero';

interface Badge {
  type: string;
  label: string;
}

interface MenuItemData {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  badges: Badge[];
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

// ── Balance categories into columns ────────────────────────────────────────

interface ColumnData {
  categories: CategoryData[];
  itemCount: number;
}

function distributeColumns(categories: CategoryData[], numCols: number): ColumnData[] {
  const columns: ColumnData[] = Array.from({ length: numCols }, () => ({
    categories: [],
    itemCount: 0,
  }));

  const sorted = [...categories].sort((a, b) => b.items.length - a.items.length);

  for (const cat of sorted) {
    let minIdx = 0;
    for (let i = 1; i < columns.length; i++) {
      if (columns[i].itemCount < columns[minIdx].itemCount) minIdx = i;
    }
    columns[minIdx].categories.push(cat);
    columns[minIdx].itemCount += cat.items.length + 1; // +1 for header
  }

  return columns;
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

// ── Main component ─────────────────────────────────────────────────────────

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

  const { height: vh } = useViewportSize();

  // All categories including combos as a virtual category
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

  const numCols = isPortrait ? 2 : 3;
  const columns = distributeColumns(allCategories, numCols);

  // Dynamic sizing: compute row height to fill the screen
  const headerH = 48;
  const footerH = 28;
  const paddingY = 32;
  const availableH = vh - headerH - footerH - paddingY;

  // The tallest column determines the row count
  const maxRows = Math.max(...columns.map(c => c.itemCount), 1);

  // Compute font size and row height to fill exactly
  const categoryHeaderH = Math.max(20, Math.floor(availableH * 0.035));
  const totalCatHeaders = Math.max(...columns.map(c => c.categories.length), 1);
  const headerSpace = totalCatHeaders * categoryHeaderH;
  const itemRowH = Math.max(18, Math.floor((availableH - headerSpace) / (maxRows - totalCatHeaders)));

  // Scale font size proportionally to row height (baseline 13px at 28px row)
  const fontSize = Math.max(12, Math.min(22, Math.floor(itemRowH * 0.52)));
  const catFontSize = Math.max(10, Math.min(18, Math.floor(categoryHeaderH * 0.55)));

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: `var(--mb-font-body)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <h1
            className="text-lg font-black uppercase tracking-wider text-white"
            style={{ fontFamily: `var(--mb-font-heading)` }}
          >
            {brand.name}
          </h1>
          <span className="text-[10px] text-white/25 uppercase tracking-widest ml-2">
            Full Menu
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/30">
          <MenuBoardClock />
          <span className="text-[9px] uppercase tracking-widest">MXN</span>
        </div>
      </div>

      {/* Multi-column list — fills remaining space */}
      <div
        className="flex-1 overflow-hidden px-6 py-3 flex min-h-0"
        style={{ gap: isPortrait ? 16 : 32 }}
      >
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
            {col.categories.map(cat => (
              <div key={cat.id} className="flex flex-col">
                {/* Category header */}
                <div
                  className="flex items-center gap-2 px-1"
                  style={{ height: categoryHeaderH, marginBottom: 2 }}
                >
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: Math.max(3, catFontSize * 0.25),
                      height: categoryHeaderH * 0.6,
                      backgroundColor: 'var(--mb-primary)',
                    }}
                  />
                  <span
                    className="font-black uppercase truncate"
                    style={{
                      fontSize: catFontSize,
                      letterSpacing: '0.2em',
                      color: 'var(--mb-primary)',
                      fontFamily: 'var(--mb-font-heading, inherit)',
                    }}
                  >
                    {cat.name}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--mb-primary)', opacity: 0.2 }} />
                </div>
                {/* Items */}
                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-baseline gap-1 px-1 opacity-90"
                    style={{ height: itemRowH }}
                  >
                    <span
                      className="text-white/90 truncate shrink-0"
                      style={{ fontSize, maxWidth: '72%' }}
                    >
                      {item.name}
                    </span>
                    <span className="flex-1 border-b border-dotted border-white/10 min-w-[8px] translate-y-[-3px]" />
                    <span
                      className="font-semibold shrink-0"
                      style={{ fontSize, color: 'var(--mb-secondary, var(--mb-primary))' }}
                    >
                      ${item.price}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-5 py-1.5 border-t border-white/[0.06] text-white/30 shrink-0">
        <span className="text-[9px] uppercase tracking-widest">Precios en MXN · IVA incluido</span>
      </div>
    </div>
  );
};

export default MenuListView;
