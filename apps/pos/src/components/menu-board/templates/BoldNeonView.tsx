import React, { useEffect, useRef } from 'react';
import MenuBoardClock from '../MenuBoardClock';
import type { TemplateViewProps } from '../../../types/menu-board';
import type { CategoryData, MenuItemData } from '../../../types/menu-board';

// ── Neon flicker keyframes (injected once) ──────────────────────────────────

const NEON_STYLE_ID = 'bold-neon-keyframes';

const NEON_KEYFRAMES = `
@keyframes neonFlicker {
  0%, 100% { opacity: 1; }
  4% { opacity: 0.9; }
  6% { opacity: 1; }
  12% { opacity: 0.85; }
  14% { opacity: 1; }
  50% { opacity: 1; }
  52% { opacity: 0.92; }
  54% { opacity: 1; }
  78% { opacity: 1; }
  80% { opacity: 0.88; }
  82% { opacity: 1; }
}
`;

// ── Neon Item Card ──────────────────────────────────────────────────────────

const NeonItemCard: React.FC<{
  item: MenuItemData;
  primaryColor: string;
  secondaryColor: string;
}> = ({ item, primaryColor, secondaryColor }) => {
  const priceGlow = `0 0 4px ${secondaryColor}, 0 0 11px ${secondaryColor}, 0 0 22px ${secondaryColor}`;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-transform hover:scale-[1.01]"
      style={{
        borderTopWidth: 2,
        borderTopColor: primaryColor,
        boxShadow: `0 0 8px ${primaryColor}33, 0 0 2px ${primaryColor}22`,
      }}
    >
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        {/* Badges */}
        {item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-0.5">
            {item.badges.map((badge, i) => (
              <span
                key={i}
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${primaryColor}33`,
                  color: primaryColor,
                  border: `1px solid ${primaryColor}55`,
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <h3
          className="font-bold text-white text-sm leading-tight truncate"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          {item.name}
        </h3>

        {item.description && (
          <p className="text-white/50 text-[10px] leading-snug line-clamp-2" style={{ fontFamily: "'Exo 2', sans-serif" }}>
            {item.description}
          </p>
        )}

        <div className="mt-auto pt-1">
          <span
            className="font-bold text-base"
            style={{
              color: secondaryColor,
              textShadow: priceGlow,
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            ${item.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Neon Combo Card ─────────────────────────────────────────────────────────

const NeonComboCard: React.FC<{
  combo: any;
  primaryColor: string;
  secondaryColor: string;
}> = ({ combo, primaryColor, secondaryColor }) => {
  const nameGlow = `0 0 4px ${primaryColor}, 0 0 14px ${primaryColor}, 0 0 28px ${primaryColor}`;
  const priceGlow = `0 0 4px ${secondaryColor}, 0 0 11px ${secondaryColor}, 0 0 22px ${secondaryColor}`;

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center overflow-hidden"
      style={{
        borderColor: primaryColor,
        boxShadow: `0 0 12px ${primaryColor}55, inset 0 0 20px ${primaryColor}11`,
        background: `radial-gradient(ellipse at center, ${primaryColor}08 0%, transparent 70%)`,
      }}
    >
      <span
        className="font-black uppercase text-lg tracking-wider"
        style={{
          color: primaryColor,
          textShadow: nameGlow,
          fontFamily: "'Orbitron', sans-serif",
          animation: 'neonFlicker 4s ease-in-out infinite',
        }}
      >
        {combo.name}
      </span>
      {combo.description && (
        <p className="text-white/40 text-[10px] mt-1 max-w-xs" style={{ fontFamily: "'Exo 2', sans-serif" }}>
          {combo.description}
        </p>
      )}
      {combo.price != null && (
        <span
          className="font-bold text-xl mt-2"
          style={{
            color: secondaryColor,
            textShadow: priceGlow,
            fontFamily: "'Orbitron', sans-serif",
          }}
        >
          ${Number(combo.price).toFixed(2)}
        </span>
      )}
    </div>
  );
};

// ── Category Header ─────────────────────────────────────────────────────────

const NeonCategoryHeader: React.FC<{
  name: string;
  primaryColor: string;
}> = ({ name, primaryColor }) => {
  const glow = `0 0 4px ${primaryColor}, 0 0 10px ${primaryColor}, 0 0 20px ${primaryColor}`;
  const lineGlow = `0 0 4px ${primaryColor}, 0 0 8px ${primaryColor}`;

  return (
    <div className="flex flex-col items-start gap-1 mb-2 mt-4 first:mt-0">
      <h2
        className="font-black uppercase tracking-[0.2em] text-base"
        style={{
          color: primaryColor,
          textShadow: glow,
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        {name}
      </h2>
      <div
        className="h-[1px] w-20 rounded-full"
        style={{
          backgroundColor: primaryColor,
          boxShadow: lineGlow,
        }}
      />
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const BoldNeonView: React.FC<TemplateViewProps> = ({ brand, combos, isPortrait }) => {
  const { theme, categories } = brand;
  const primaryColor = theme.primaryColor;
  const secondaryColor = theme.secondaryColor || theme.primaryColor;
  const darkBg = theme.darkBg || '#0a0a0a';

  const styleInjected = useRef(false);

  // Inject keyframes once
  useEffect(() => {
    if (styleInjected.current) return;
    if (document.getElementById(NEON_STYLE_ID)) {
      styleInjected.current = true;
      return;
    }
    const style = document.createElement('style');
    style.id = NEON_STYLE_ID;
    style.textContent = NEON_KEYFRAMES;
    document.head.appendChild(style);
    styleInjected.current = true;
    return () => {
      const el = document.getElementById(NEON_STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  const nonComboCategories = categories.filter(
    (c: CategoryData) => c.name.toLowerCase() !== 'combos'
  );

  const gridCols = isPortrait ? 2 : 3;
  const hasCombos = combos.length > 0;

  const nameGlow = `0 0 6px ${primaryColor}, 0 0 16px ${primaryColor}, 0 0 32px ${primaryColor}`;

  const cssVars = {
    '--mb-primary': primaryColor,
    '--mb-secondary': secondaryColor,
  } as React.CSSProperties;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        ...cssVars,
        backgroundColor: darkBg,
        fontFamily: "'Exo 2', sans-serif",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-white/[0.06]">
        <h1
          className="font-black uppercase tracking-[0.15em] text-xl text-white"
          style={{
            textShadow: nameGlow,
            fontFamily: "'Orbitron', sans-serif",
            animation: 'neonFlicker 5s ease-in-out infinite',
          }}
        >
          {brand.name}
        </h1>
        <div className="text-white">
          <MenuBoardClock />
        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {/* Combo "neon sign" cards */}
        {hasCombos && (
          <div className="mb-6">
            <div
              className={`grid gap-4 ${
                isPortrait ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              {combos.map((combo: any) => (
                <NeonComboCard
                  key={combo.id}
                  combo={combo}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Categories + Items */}
        {nonComboCategories.map((category: CategoryData) => (
          <div key={category.id}>
            <NeonCategoryHeader name={category.name} primaryColor={primaryColor} />
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }}
            >
              {category.items.map((item: MenuItemData) => (
                <NeonItemCard
                  key={item.id}
                  item={item}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-2 border-t border-white/[0.06] shrink-0">
        <span
          className="text-[9px] uppercase tracking-[0.25em] text-white/30"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Precios en MXN
        </span>
      </div>
    </div>
  );
};

export default BoldNeonView;
