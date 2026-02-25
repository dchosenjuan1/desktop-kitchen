import React, { useMemo } from 'react';
import MenuBoardClock from '../MenuBoardClock';
import type { TemplateViewProps } from '../../../types/menu-board';
import type { CategoryData, MenuItemData } from '../../../types/menu-board';

/* ── Chalk text-shadow presets ─────────────────────────────────────────────── */
const chalkGlow = '0 0 4px rgba(255,255,255,0.15), 0 0 8px rgba(255,255,255,0.06)';
const chalkGlowStrong = '0 0 6px rgba(255,255,255,0.25), 0 0 12px rgba(255,255,255,0.08)';

/* ── Decorative chalk SVG dividers ─────────────────────────────────────────── */
const ForkDivider: React.FC = () => (
  <svg viewBox="0 0 120 20" className="w-24 h-5 mx-auto opacity-40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <line x1="0" y1="10" x2="35" y2="10" />
    {/* Fork */}
    <line x1="48" y1="3" x2="48" y2="10" />
    <line x1="52" y1="3" x2="52" y2="10" />
    <line x1="56" y1="3" x2="56" y2="10" />
    <rect x="46" y="10" width="12" height="2" rx="1" />
    <line x1="52" y1="12" x2="52" y2="19" />
    <line x1="85" y1="10" x2="120" y2="10" />
  </svg>
);

const LeafDivider: React.FC = () => (
  <svg viewBox="0 0 120 20" className="w-24 h-5 mx-auto opacity-40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <line x1="0" y1="10" x2="40" y2="10" />
    {/* Leaf */}
    <path d="M55 10 Q60 3 65 10 Q60 17 55 10 Z" />
    <line x1="60" y1="6" x2="60" y2="14" />
    <line x1="80" y1="10" x2="120" y2="10" />
  </svg>
);

const SwirlDivider: React.FC = () => (
  <svg viewBox="0 0 120 20" className="w-24 h-5 mx-auto opacity-40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <line x1="0" y1="10" x2="38" y2="10" />
    {/* Swirl */}
    <path d="M48 10 C48 6, 54 4, 58 8 C62 12, 58 16, 54 14 C50 12, 52 8, 56 8" />
    <path d="M64 10 C64 14, 58 16, 54 12" />
    <line x1="72" y1="10" x2="120" y2="10" />
  </svg>
);

const DIVIDERS = [ForkDivider, LeafDivider, SwirlDivider];

/* ── Decorative underline for brand name ───────────────────────────────────── */
const ChalkUnderline: React.FC = () => (
  <svg viewBox="0 0 200 8" className="w-48 h-2 mx-auto mt-1 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M10 4 Q50 1 100 5 Q150 8 190 3" />
  </svg>
);

/* ── Single menu item row with dotted leaders ──────────────────────────────── */
const ChalkMenuItem: React.FC<{ item: MenuItemData }> = ({ item }) => (
  <div className="flex items-baseline gap-1 py-0.5 group">
    <span
      className="shrink-0 text-[clamp(0.75rem,1.3vw,1rem)] text-amber-50/90"
      style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
    >
      {item.name}
    </span>
    {item.badges.length > 0 && (
      <span className="shrink-0 text-[clamp(0.5rem,0.8vw,0.65rem)] text-amber-200/50 uppercase tracking-wider ml-1">
        {item.badges.map(b => b.label).join(' ')}
      </span>
    )}
    {/* Dotted leader */}
    <span className="flex-1 border-b border-dotted border-white/20 min-w-[20px] translate-y-[-3px]" />
    <span
      className="shrink-0 text-[clamp(0.75rem,1.3vw,1rem)] text-amber-100/80 tabular-nums"
      style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
    >
      ${item.price.toFixed(0)}
    </span>
  </div>
);

/* ── Category section with chalk border and corner marks ───────────────────── */
const ChalkCategory: React.FC<{ category: CategoryData; index: number }> = ({ category, index }) => {
  const Divider = DIVIDERS[index % DIVIDERS.length];

  return (
    <div className="relative px-4 py-3">
      {/* Chalk-style dashed border */}
      <div
        className="absolute inset-0 border border-dashed border-white/[0.12] rounded pointer-events-none"
      />
      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/20 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/20 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20 rounded-br" />

      {/* Category heading */}
      <h2
        className="text-center text-[clamp(1rem,2vw,1.5rem)] text-amber-50 mb-1"
        style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, textShadow: chalkGlowStrong }}
      >
        {category.name}
      </h2>

      <div className="text-white mb-2">
        <Divider />
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {category.items.map(item => (
          <ChalkMenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

/* ── Combos special section ────────────────────────────────────────────────── */
const ChalkCombos: React.FC<{ combos: any[] }> = ({ combos }) => {
  if (combos.length === 0) return null;

  return (
    <div className="relative px-4 py-3">
      {/* Double border for combos (special treatment) */}
      <div className="absolute inset-0 border-2 border-dashed border-amber-200/20 rounded pointer-events-none" />
      <div className="absolute inset-[3px] border border-dashed border-amber-200/10 rounded pointer-events-none" />

      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-200/30 rounded-tl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-200/30 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-200/30 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-200/30 rounded-br" />

      <h2
        className="text-center text-[clamp(1.1rem,2.2vw,1.6rem)] text-amber-100 mb-1"
        style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, textShadow: chalkGlowStrong }}
      >
        Combos
      </h2>

      <div className="text-amber-100 mb-2">
        <ForkDivider />
      </div>

      <div className="flex flex-col">
        {combos.map((combo: any) => (
          <div key={combo.id} className="flex items-baseline gap-1 py-0.5">
            <span
              className="shrink-0 text-[clamp(0.75rem,1.3vw,1rem)] text-amber-50/90"
              style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
            >
              {combo.name}
            </span>
            <span className="flex-1 border-b border-dotted border-amber-200/20 min-w-[20px] translate-y-[-3px]" />
            <span
              className="shrink-0 text-[clamp(0.75rem,1.3vw,1rem)] text-amber-100/80 tabular-nums"
              style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
            >
              ${combo.comboPrice?.toFixed(0) ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Column-splitting helper ───────────────────────────────────────────────── */
function splitIntoColumns<T extends { items: any[] }>(sections: T[], columnCount: number): T[][] {
  if (columnCount <= 1) return [sections];

  // Weight each section by number of items + 1 for the header
  const weights = sections.map(s => s.items.length + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const targetPerColumn = totalWeight / columnCount;

  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  let colIdx = 0;
  let colWeight = 0;

  for (let i = 0; i < sections.length; i++) {
    columns[colIdx].push(sections[i]);
    colWeight += weights[i];

    // Move to next column if we've exceeded the target (but not on last column)
    if (colWeight >= targetPerColumn && colIdx < columnCount - 1) {
      colIdx++;
      colWeight = 0;
    }
  }

  return columns;
}

/* ── Chalk grain texture (pure CSS via inline SVG filter) ──────────────────── */
const ChalkGrain: React.FC = () => (
  <div
    className="absolute inset-0 pointer-events-none z-10 opacity-[0.04]"
    style={{ mixBlendMode: 'overlay' }}
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="chalkGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#chalkGrain)" />
    </svg>
  </div>
);

/* ── Smudge marks for realism ──────────────────────────────────────────────── */
const ChalkSmudges: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.02]">
    <div
      className="absolute top-[15%] left-[10%] w-32 h-8 rounded-full bg-white rotate-[-12deg]"
      style={{ filter: 'blur(12px)' }}
    />
    <div
      className="absolute bottom-[20%] right-[15%] w-24 h-6 rounded-full bg-white rotate-[8deg]"
      style={{ filter: 'blur(16px)' }}
    />
    <div
      className="absolute top-[60%] left-[50%] w-20 h-4 rounded-full bg-white rotate-[3deg]"
      style={{ filter: 'blur(10px)' }}
    />
  </div>
);

/* ── Main ChalkboardView ───────────────────────────────────────────────────── */
const ChalkboardView: React.FC<TemplateViewProps> = ({ brand, combos, isPortrait }) => {
  const { theme } = brand;

  const cssVars = {
    '--mb-primary': theme.primaryColor,
    '--mb-secondary': theme.secondaryColor || theme.primaryColor,
    '--mb-dark-bg': theme.darkBg,
  } as React.CSSProperties;

  const columnCount = isPortrait ? 1 : 2;

  const nonComboCategories = brand.categories.filter(
    c => c.name.toLowerCase() !== 'combos'
  );

  // Build sections: combos first (if any), then categories
  const comboSection = combos.length > 0
    ? { id: 'combos', items: combos } as unknown as CategoryData
    : null;

  const columns = useMemo(
    () => splitIntoColumns(nonComboCategories, columnCount),
    [nonComboCategories, columnCount]
  );

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        ...cssVars,
        backgroundColor: theme.darkBg || '#1a1a1a',
        fontFamily: "'Patrick Hand', cursive",
      }}
    >
      {/* Chalk dust / grain texture */}
      <ChalkGrain />
      <ChalkSmudges />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-20 shrink-0 pt-4 pb-2 px-6">
        <div className="flex items-start justify-between">
          {/* Spacer for centering */}
          <div className="w-20" />

          {/* Brand name centered */}
          <div className="flex-1 text-center">
            <h1
              className="text-[clamp(1.5rem,3.5vw,2.8rem)] text-amber-50 leading-tight"
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                textShadow: chalkGlowStrong,
              }}
            >
              {brand.name}
            </h1>
            <div className="text-amber-50">
              <ChalkUnderline />
            </div>
          </div>

          {/* Clock top-right */}
          <div
            className="w-20 flex justify-end pt-1 text-amber-50/60"
            style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
          >
            <MenuBoardClock />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 overflow-hidden px-4 pb-2">
        <div
          className={`h-full ${
            isPortrait
              ? 'flex flex-col gap-3 overflow-y-auto'
              : 'grid grid-cols-2 gap-x-6 gap-y-3 auto-rows-min overflow-y-auto'
          }`}
          style={{
            scrollbarWidth: 'none',
          }}
        >
          {/* Combos at the top */}
          {combos.length > 0 && (
            <div className={isPortrait ? '' : 'col-span-2'}>
              <ChalkCombos combos={combos} />
            </div>
          )}

          {/* Categories distributed across columns */}
          {isPortrait ? (
            // Portrait: single column, all categories stacked
            nonComboCategories.map((cat, idx) => (
              <ChalkCategory key={cat.id} category={cat} index={idx} />
            ))
          ) : (
            // Landscape: two columns
            <>
              <div className="flex flex-col gap-3">
                {columns[0]?.map((cat, idx) => (
                  <ChalkCategory key={cat.id} category={cat} index={idx} />
                ))}
              </div>
              <div className="flex flex-col gap-3">
                {columns[1]?.map((cat, idx) => (
                  <ChalkCategory key={cat.id} category={cat} index={idx + (columns[0]?.length ?? 0)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-20 shrink-0 flex items-center justify-center py-2 border-t border-white/[0.06]">
        <span
          className="text-[clamp(0.5rem,1vw,0.7rem)] uppercase tracking-[0.2em] text-amber-50/30"
          style={{ fontFamily: "'Patrick Hand', cursive", textShadow: chalkGlow }}
        >
          Precios en MXN
        </span>
      </footer>
    </div>
  );
};

export default ChalkboardView;
