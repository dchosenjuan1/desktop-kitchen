import React from 'react';
import MenuBoardClock from '../MenuBoardClock';
import type { TemplateViewProps } from '../../../types/menu-board';
import type { CategoryData, MenuItemData } from '../../../types/menu-board';

/* ── Ornamental flourish SVG (centered scroll/diamond motif) ─────────── */
const OrnamentalDivider: React.FC<{ color: string }> = ({ color }) => (
  <div className="flex items-center justify-center w-full my-4">
    <div className="flex-1 h-px" style={{ backgroundColor: `${color}33` }} />
    <svg
      width="48"
      height="16"
      viewBox="0 0 48 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-3 shrink-0"
    >
      {/* Left scroll */}
      <path
        d="M2 8C2 8 6 2 10 2C14 2 14 8 10 8C6 8 6 14 10 14C14 14 18 8 18 8"
        stroke={color}
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
      {/* Center diamond */}
      <path
        d="M24 2L28 8L24 14L20 8Z"
        stroke={color}
        strokeWidth="0.8"
        fill={`${color}22`}
      />
      <path
        d="M24 5L26 8L24 11L22 8Z"
        fill={color}
        opacity="0.4"
      />
      {/* Right scroll (mirrored) */}
      <path
        d="M46 8C46 8 42 2 38 2C34 2 34 8 38 8C42 8 42 14 38 14C34 14 30 8 30 8"
        stroke={color}
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
    </svg>
    <div className="flex-1 h-px" style={{ backgroundColor: `${color}33` }} />
  </div>
);

/* ── Thin decorative rule ────────────────────────────────────────────── */
const ThinRule: React.FC<{ color: string; className?: string }> = ({ color, className = '' }) => (
  <div
    className={`w-48 mx-auto h-px ${className}`}
    style={{ backgroundColor: `${color}44` }}
  />
);

/* ── Single menu item row with dotted leader ─────────────────────────── */
const ElegantItem: React.FC<{ item: MenuItemData; primaryColor: string }> = ({ item, primaryColor }) => (
  <div className="mb-2">
    <div className="flex items-baseline gap-2">
      <span
        className="shrink-0 text-[0.95rem] font-semibold tracking-wide"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: '#faf8f5' }}
      >
        {item.name}
      </span>
      <span
        className="flex-1 border-b border-dotted min-w-[2rem]"
        style={{ borderColor: `${primaryColor}30`, marginBottom: '0.25em' }}
      />
      <span
        className="shrink-0 text-[0.95rem] font-semibold tabular-nums"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: primaryColor }}
      >
        ${item.price.toFixed(2)}
      </span>
    </div>
    {item.description && (
      <p
        className="text-[0.7rem] italic leading-snug mt-0.5 ml-0.5"
        style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.4)' }}
      >
        {item.description}
      </p>
    )}
  </div>
);

/* ── Category block ──────────────────────────────────────────────────── */
const CategoryBlock: React.FC<{
  category: CategoryData;
  primaryColor: string;
  showDivider: boolean;
}> = ({ category, primaryColor, showDivider }) => (
  <div className="mb-2">
    {showDivider && <OrnamentalDivider color={primaryColor} />}
    <h2
      className="text-center uppercase tracking-[0.3em] text-sm font-semibold mb-3"
      style={{ fontFamily: "'Cormorant Garamond', serif", color: primaryColor }}
    >
      {category.name}
    </h2>
    <div>
      {category.items.map(item => (
        <ElegantItem key={item.id} item={item} primaryColor={primaryColor} />
      ))}
    </div>
  </div>
);

/* ── Combo featured section ──────────────────────────────────────────── */
const ComboSection: React.FC<{
  combos: any[];
  primaryColor: string;
}> = ({ combos, primaryColor }) => (
  <div className="mb-2">
    <OrnamentalDivider color={primaryColor} />
    <h2
      className="text-center uppercase tracking-[0.3em] text-sm font-semibold mb-3"
      style={{ fontFamily: "'Cormorant Garamond', serif", color: primaryColor }}
    >
      Featured Selections
    </h2>
    <div className="space-y-3">
      {combos.map((combo: any) => (
        <div
          key={combo.id}
          className="border rounded-md px-4 py-3 text-center"
          style={{ borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}08` }}
        >
          <h3
            className="text-base font-bold tracking-wide mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: '#faf8f5' }}
          >
            {combo.name}
          </h3>
          <div className="flex items-center justify-center gap-3">
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: primaryColor }}
            >
              ${Number(combo.comboPrice).toFixed(2)}
            </span>
            {combo.savings > 0 && (
              <span
                className="text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: "'Lora', serif",
                  color: primaryColor,
                  border: `1px solid ${primaryColor}44`,
                }}
              >
                Save ${Number(combo.savings).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Main component ──────────────────────────────────────────────────── */
const ClassicElegantView: React.FC<TemplateViewProps> = ({ brand, combos, isPortrait }) => {
  const { theme } = brand;
  const primaryColor = theme.primaryColor;
  const secondaryColor = theme.secondaryColor || primaryColor;

  const cssVars = {
    '--mb-primary': primaryColor,
    '--mb-secondary': secondaryColor,
  } as React.CSSProperties;

  const categories = brand.categories.filter(
    c => c.name.toLowerCase() !== 'combos'
  );

  const hasCombos = combos.length > 0;

  /* Split categories into two columns for landscape */
  const splitCategories = (): [CategoryData[], CategoryData[]] => {
    const totalItems = categories.reduce((sum, c) => sum + c.items.length + 1, 0);
    let leftCount = 0;
    let splitIdx = categories.length;
    for (let i = 0; i < categories.length; i++) {
      leftCount += categories[i].items.length + 1;
      if (leftCount >= totalItems / 2) {
        splitIdx = i + 1;
        break;
      }
    }
    return [categories.slice(0, splitIdx), categories.slice(splitIdx)];
  };

  const [leftCats, rightCats] = splitCategories();

  /* ── Portrait layout ──────────────────────────────────────────────── */
  if (isPortrait) {
    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden relative"
        style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: "'Lora', serif" }}
      >
        {/* Background watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="text-[12vw] font-bold uppercase whitespace-nowrap"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: 'rgba(255,255,255,0.03)',
              letterSpacing: '0.15em',
            }}
          >
            {brand.name}
          </span>
        </div>

        {/* Header */}
        <div className="shrink-0 pt-5 pb-3 px-6 text-center relative z-10">
          <div className="flex justify-end mb-2">
            <MenuBoardClock />
          </div>
          <ThinRule color={primaryColor} className="mb-3" />
          <h1
            className="text-3xl font-bold uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: '#faf8f5' }}
          >
            {brand.name}
          </h1>
          {brand.description && (
            <p
              className="text-[0.7rem] italic mt-1"
              style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.4)' }}
            >
              {brand.description}
            </p>
          )}
          <ThinRule color={primaryColor} className="mt-3" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 relative z-10 min-h-0">
          {hasCombos && <ComboSection combos={combos} primaryColor={primaryColor} />}
          {categories.map((cat, idx) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              primaryColor={primaryColor}
              showDivider={idx > 0 || hasCombos}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 py-2 text-center relative z-10 border-t" style={{ borderColor: `${primaryColor}1a` }}>
          <span
            className="text-[0.6rem] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'rgba(255,255,255,0.35)' }}
          >
            Precios en MXN
          </span>
        </div>
      </div>
    );
  }

  /* ── Landscape layout (two columns) ───────────────────────────────── */
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ ...cssVars, backgroundColor: theme.darkBg, fontFamily: "'Lora', serif" }}
    >
      {/* Background watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <span
          className="text-[10vw] font-bold uppercase whitespace-nowrap"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: 'rgba(255,255,255,0.03)',
            letterSpacing: '0.15em',
          }}
        >
          {brand.name}
        </span>
      </div>

      {/* Header */}
      <div className="shrink-0 pt-4 pb-2 px-8 relative z-10">
        <div className="flex items-start justify-between">
          <div />
          <div className="text-center flex-1">
            <ThinRule color={primaryColor} className="mb-2" />
            <h1
              className="text-2xl font-bold uppercase tracking-[0.25em]"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#faf8f5' }}
            >
              {brand.name}
            </h1>
            {brand.description && (
              <p
                className="text-[0.65rem] italic mt-0.5"
                style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.4)' }}
              >
                {brand.description}
              </p>
            )}
            <ThinRule color={primaryColor} className="mt-2" />
          </div>
          <div className="pt-1">
            <MenuBoardClock />
          </div>
        </div>
      </div>

      {/* Two-column content */}
      <div className="flex-1 overflow-hidden px-8 pb-2 flex gap-8 min-h-0 relative z-10">
        {/* Left column */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {hasCombos && <ComboSection combos={combos} primaryColor={primaryColor} />}
          {leftCats.map((cat, idx) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              primaryColor={primaryColor}
              showDivider={idx > 0 || hasCombos}
            />
          ))}
        </div>

        {/* Center divider */}
        <div className="shrink-0 flex flex-col items-center py-2">
          <div
            className="flex-1 w-px"
            style={{ backgroundColor: `${primaryColor}22` }}
          />
        </div>

        {/* Right column */}
        <div className="flex-1 overflow-y-auto min-h-0 pl-2">
          {rightCats.map((cat, idx) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              primaryColor={primaryColor}
              showDivider={idx > 0}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 py-1.5 text-center relative z-10 border-t" style={{ borderColor: `${primaryColor}1a` }}>
        <span
          className="text-[0.55rem] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: 'rgba(255,255,255,0.35)' }}
        >
          Precios en MXN
        </span>
      </div>
    </div>
  );
};

export default ClassicElegantView;
