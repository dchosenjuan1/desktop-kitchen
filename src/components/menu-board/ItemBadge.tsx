import React from 'react';
import type { Badge } from '../../types/menu-board';

const BADGE_STYLES: Record<string, string> = {
  bestseller: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
  'popular-now': 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
  'chef-pick': 'bg-purple-500/25 text-purple-200 border-purple-400/40',
  'try-it': 'bg-orange-500/25 text-orange-200 border-orange-400/40',
};

interface ItemBadgeProps {
  badge: Badge;
  /** Floating style for overlaying on images */
  floating?: boolean;
}

const ItemBadge: React.FC<ItemBadgeProps> = ({ badge, floating }) => {
  const style = BADGE_STYLES[badge.type] || 'bg-white/15 text-white/80 border-white/25';

  if (floating) {
    return (
      <span
        className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border backdrop-blur-sm shadow-lg ${style}`}
      >
        {badge.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${style}`}
    >
      {badge.label}
    </span>
  );
};

export default ItemBadge;
