import React, { useState } from 'react';
import ItemBadge from './ItemBadge';
import type { Badge } from '../../types/menu-board';

export type MenuItemVariant = 'hero' | 'standard' | 'compact' | 'mini';

interface MenuItemCardProps {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  badges: Badge[];
  variant: MenuItemVariant;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ name, price, description, imageUrl, badges, variant }) => {
  const [imgError, setImgError] = useState(false);
  const priceStr = `$${price}`;
  const showImage = imageUrl && !imgError;
  const initial = name.charAt(0).toUpperCase();

  // ── Mini: text-only dot leader row ───────────────────────────────────────
  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-1 h-full px-1">
        <span className="text-xs text-white/80 truncate shrink-0 max-w-[65%]">{name}</span>
        <span className="flex-1 border-b border-dotted border-white/15 min-w-[12px] translate-y-[-2px]" />
        <span
          className="text-xs font-semibold shrink-0"
          style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
        >
          {priceStr}
        </span>
        {badges.length > 0 && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-0.5" style={{ backgroundColor: 'var(--mb-primary)' }} />
        )}
      </div>
    );
  }

  // ── Compact: small thumbnail + name + price in a row ─────────────────────
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 h-full px-1 group">
        {/* Tiny thumbnail */}
        <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 relative">
          {showImage ? (
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white/30 text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, var(--mb-primary), rgba(0,0,0,0.6))' }}
            >
              {initial}
            </div>
          )}
        </div>
        <span className="text-xs text-white/85 truncate flex-1 min-w-0">{name}</span>
        <span
          className="text-xs font-bold shrink-0"
          style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
        >
          {priceStr}
        </span>
        {badges.length > 0 && (
          <div className="shrink-0">
            <ItemBadge badge={badges[0]} floating />
          </div>
        )}
      </div>
    );
  }

  // ── Hero: large image with name/price overlaid on gradient ───────────────
  if (variant === 'hero') {
    return (
      <div className="rounded-xl overflow-hidden h-full w-full relative group">
        {/* Full bleed image */}
        {showImage ? (
          <img
            src={imageUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, var(--mb-primary), rgba(0,0,0,0.85))' }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {/* Badges top-right */}
        {badges.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {badges.map(b => <ItemBadge key={b.type} badge={b} floating />)}
          </div>
        )}
        {/* Name + price overlaid at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10">
          <div className="font-bold text-sm text-white leading-tight drop-shadow-lg truncate">{name}</div>
          {description && (
            <div className="text-[10px] text-white/50 mt-0.5 line-clamp-1">{description}</div>
          )}
          <div
            className="font-black text-lg mt-1 drop-shadow-lg"
            style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
          >
            {priceStr}
          </div>
        </div>
      </div>
    );
  }

  // ── Standard: square image top, name+price bottom (landscape card) ───────
  return (
    <div className="rounded-xl overflow-hidden bg-white/[0.04] h-full w-full flex flex-col group relative">
      {/* Photo area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {showImage ? (
          <img
            src={imageUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white/20 text-3xl font-black"
            style={{ background: 'linear-gradient(135deg, var(--mb-primary), rgba(0,0,0,0.8))' }}
          >
            {initial}
          </div>
        )}
        {/* Gradient overlay at bottom of photo */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Badges floating top-right */}
        {badges.length > 0 && (
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
            {badges.map(b => <ItemBadge key={b.type} badge={b} floating />)}
          </div>
        )}
      </div>
      {/* Name + price strip at bottom */}
      <div className="px-2.5 py-2 flex items-center justify-between gap-2 shrink-0">
        <span className="font-semibold text-[12px] text-white/90 leading-tight truncate">{name}</span>
        <span
          className="font-bold text-[12px] shrink-0"
          style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
        >
          {priceStr}
        </span>
      </div>
    </div>
  );
};

export default MenuItemCard;
