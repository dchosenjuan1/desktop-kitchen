import React, { useMemo } from 'react';
import type { TemplateViewProps } from '../../../types/menu-board';
import type { MenuItemData } from '../../../types/menu-board';
import MenuBoardClock from '../MenuBoardClock';
import ItemBadge from '../ItemBadge';

/* ------------------------------------------------------------------ */
/*  Inline SVG brush-stroke accents                                    */
/* ------------------------------------------------------------------ */

const BrushStrokeTopLeft: React.FC<{ color: string }> = ({ color }) => (
  <svg
    className="absolute top-0 left-0 w-[28vw] h-auto opacity-30 pointer-events-none"
    viewBox="0 0 400 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M-20 40C30 10 120-15 200 25C280 65 310 120 380 90C420 75 400 160 340 180C260 208 140 190 60 210C-10 226-40 160-20 120C0 80-20 60-20 40Z"
      fill={color}
      fillOpacity="0.55"
    />
    <path
      d="M10 10C60-5 150 5 210 40C260 70 270 110 330 100C370 94 380 150 320 170C240 198 130 175 70 195C20 210-10 150 10 110C30 70 10 30 10 10Z"
      fill={color}
      fillOpacity="0.35"
    />
  </svg>
);

const BrushStrokeBottomRight: React.FC<{ color: string }> = ({ color }) => (
  <svg
    className="absolute bottom-0 right-0 w-[26vw] h-auto opacity-25 pointer-events-none"
    viewBox="0 0 400 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M420 170C380 200 280 225 200 185C130 150 110 90 30 115C-10 128 10 50 70 30C140 4 260 20 340 0C400-14 440 50 420 90C400 130 420 150 420 170Z"
      fill={color}
      fillOpacity="0.5"
    />
    <path
      d="M400 190C360 210 270 210 210 175C160 145 150 100 90 110C50 118 40 60 100 42C170 18 280 35 350 18C400 6 430 60 410 100C390 140 400 170 400 190Z"
      fill={color}
      fillOpacity="0.3"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Star decoration for subtitle                                       */
/* ------------------------------------------------------------------ */

const StarDecoration: React.FC = () => (
  <span className="inline-block mx-3 text-[var(--mb-secondary)] opacity-70 select-none">
    &#10038;
  </span>
);

/* ------------------------------------------------------------------ */
/*  Pick top 3 featured items                                          */
/* ------------------------------------------------------------------ */

function pickFeaturedItems(
  categories: { items: MenuItemData[] }[],
): MenuItemData[] {
  const allItems = categories.flatMap((c) => c.items);

  // Separate items with images from those without
  const withImages = allItems.filter((item) => item.imageUrl);
  const withoutImages = allItems.filter((item) => !item.imageUrl);

  // Sort: prefer items with badges first, then by price descending
  const sortFn = (a: MenuItemData, b: MenuItemData) => {
    const aBadges = a.badges?.length ?? 0;
    const bBadges = b.badges?.length ?? 0;
    if (bBadges !== aBadges) return bBadges - aBadges;
    return b.price - a.price;
  };

  withImages.sort(sortFn);
  withoutImages.sort(sortFn);

  // Take up to 3 from items with images, fill remainder from without
  const featured: MenuItemData[] = [];
  for (const item of withImages) {
    if (featured.length >= 3) break;
    featured.push(item);
  }
  for (const item of withoutImages) {
    if (featured.length >= 3) break;
    featured.push(item);
  }

  return featured;
}

/* ------------------------------------------------------------------ */
/*  Format price                                                       */
/* ------------------------------------------------------------------ */

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(0)}`;
}

/* ------------------------------------------------------------------ */
/*  Featured Item Row                                                  */
/* ------------------------------------------------------------------ */

interface FeaturedRowProps {
  item: MenuItemData;
  index: number;
  isPortrait: boolean;
}

const FeaturedRow: React.FC<FeaturedRowProps> = ({
  item,
  index,
  isPortrait,
}) => {
  const isEven = index % 2 === 1; // 0-indexed: first is odd-display (image left)

  const imageBlock = item.imageUrl ? (
    <div className="relative flex-shrink-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="rounded-2xl shadow-2xl object-cover"
        style={{
          width: isPortrait
            ? 'clamp(140px, 36vw, 320px)'
            : 'clamp(160px, 22vw, 380px)',
          height: isPortrait
            ? 'clamp(140px, 36vw, 320px)'
            : 'clamp(160px, 22vw, 380px)',
        }}
      />
      {item.badges?.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.badges.map((badge, bi) => (
            <ItemBadge key={bi} badge={badge} floating />
          ))}
        </div>
      )}
    </div>
  ) : (
    <div
      className="flex-shrink-0 rounded-2xl flex items-center justify-center"
      style={{
        width: isPortrait
          ? 'clamp(140px, 36vw, 320px)'
          : 'clamp(160px, 22vw, 380px)',
        height: isPortrait
          ? 'clamp(140px, 36vw, 320px)'
          : 'clamp(160px, 22vw, 380px)',
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <span className="text-white/20 font-[var(--mb-font-heading)] text-4xl uppercase">
        {item.name.charAt(0)}
      </span>
    </div>
  );

  const textBlock = (
    <div
      className={`flex flex-col justify-center ${isEven ? 'items-end text-right' : 'items-start text-left'}`}
    >
      {!item.imageUrl && item.badges?.length > 0 && (
        <div className="flex gap-1.5 mb-2">
          {item.badges.map((badge, bi) => (
            <ItemBadge key={bi} badge={badge} />
          ))}
        </div>
      )}
      <h3
        className="font-[var(--mb-font-heading)] font-black uppercase text-white tracking-wide leading-tight"
        style={{
          fontSize: isPortrait
            ? 'clamp(1.3rem, 4.5vw, 2.8rem)'
            : 'clamp(1.4rem, 3vw, 3rem)',
        }}
      >
        {item.name}
      </h3>
      {item.description && (
        <p
          className="font-[var(--mb-font-body)] text-white/60 mt-1 max-w-[50ch] leading-relaxed"
          style={{
            fontSize: isPortrait
              ? 'clamp(0.75rem, 2.2vw, 1.1rem)'
              : 'clamp(0.8rem, 1.3vw, 1.15rem)',
          }}
        >
          {item.description}
        </p>
      )}
      <p
        className="font-[var(--mb-font-heading)] font-black mt-2"
        style={{
          fontSize: isPortrait
            ? 'clamp(1.8rem, 6vw, 3.5rem)'
            : 'clamp(2rem, 4vw, 4rem)',
          color: 'var(--mb-secondary)',
        }}
      >
        {formatPrice(item.price)}
      </p>
    </div>
  );

  return (
    <div
      className={`flex items-center gap-6 ${isPortrait ? 'gap-5 px-6' : 'gap-8 px-10'} ${isEven ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ width: '100%' }}
    >
      {imageBlock}
      {textBlock}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Template                                                      */
/* ------------------------------------------------------------------ */

const DarkEditorialView: React.FC<TemplateViewProps> = ({
  brand,
  isPortrait,
}) => {
  const { theme, name, description, categories } = brand;

  const headingFont = 'Playfair Display';
  const bodyFont = 'Inter';
  const fonts = `'${headingFont}', 'Inter', sans-serif`;

  const cssVars = {
    '--mb-primary': theme.primaryColor,
    '--mb-secondary': theme.secondaryColor || theme.primaryColor,
    '--mb-dark-bg': theme.darkBg,
    '--mb-font': fonts,
    '--mb-font-heading': `'${headingFont}', sans-serif`,
    '--mb-font-body': `'${bodyFont}', sans-serif`,
  } as React.CSSProperties;

  const featured = useMemo(() => pickFeaturedItems(categories), [categories]);

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col"
      style={{ ...cssVars, backgroundColor: 'var(--mb-dark-bg)' }}
    >
      {/* Brush stroke accents */}
      <BrushStrokeTopLeft color={theme.primaryColor} />
      <BrushStrokeBottomRight
        color={theme.secondaryColor || theme.primaryColor}
      />

      {/* Clock - top right */}
      <div className="absolute top-4 right-5 z-10 text-white">
        <MenuBoardClock />
      </div>

      {/* Header */}
      <header
        className={`relative z-10 flex flex-col items-center ${isPortrait ? 'pt-10 pb-4' : 'pt-6 pb-3'}`}
      >
        <h1
          className="font-[var(--mb-font-heading)] font-black text-white text-center uppercase tracking-widest leading-none"
          style={{
            fontSize: isPortrait
              ? 'clamp(2rem, 7vw, 4.5rem)'
              : 'clamp(2rem, 4.5vw, 4.5rem)',
          }}
        >
          {name}
        </h1>
        {description && (
          <p
            className="font-[var(--mb-font-body)] text-white/50 text-center mt-1 flex items-center"
            style={{
              fontSize: isPortrait
                ? 'clamp(0.7rem, 2vw, 1rem)'
                : 'clamp(0.7rem, 1.2vw, 1rem)',
            }}
          >
            <StarDecoration />
            <span>{description}</span>
            <StarDecoration />
          </p>
        )}
        {/* Decorative line */}
        <div
          className="mt-3 h-[2px] rounded-full opacity-40"
          style={{
            width: isPortrait ? '60%' : '40%',
            background: `linear-gradient(90deg, transparent, var(--mb-secondary), transparent)`,
          }}
        />
      </header>

      {/* Featured items */}
      <main
        className={`relative z-10 flex-1 flex flex-col justify-evenly ${isPortrait ? 'py-2' : 'py-3'}`}
      >
        {featured.map((item, idx) => (
          <FeaturedRow
            key={item.id}
            item={item}
            index={idx}
            isPortrait={isPortrait}
          />
        ))}
      </main>

      {/* Footer */}
      <footer
        className={`relative z-10 text-center ${isPortrait ? 'pb-6 pt-2' : 'pb-4 pt-1'}`}
      >
        <p
          className="font-[var(--mb-font-body)] text-white/30 uppercase tracking-[0.25em]"
          style={{
            fontSize: isPortrait
              ? 'clamp(0.55rem, 1.6vw, 0.8rem)'
              : 'clamp(0.55rem, 0.9vw, 0.8rem)',
          }}
        >
          Precios en MXN
        </p>
      </footer>
    </div>
  );
};

export default DarkEditorialView;
