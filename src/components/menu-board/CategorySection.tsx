import React from 'react';
import MenuItemCard from './MenuItemCard';
import type { MenuItemData } from '../../types/menu-board';

interface CategorySectionProps {
  name: string;
  items: MenuItemData[];
  isPortrait: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ name, items, isPortrait }) => {
  if (isPortrait) {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h3
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--mb-primary)' }}
          >
            {name}
          </h3>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--mb-primary)', opacity: 0.2 }} />
        </div>
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {items.map(item => (
            <MenuItemCard key={item.id} {...item} variant="compact" />
          ))}
        </div>
      </div>
    );
  }

  // Landscape: photo grid — 4 cards per row max
  return (
    <div className="mb-6">
      <h3
        className="text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-60"
        style={{ color: 'var(--mb-primary)', fontFamily: 'var(--mb-font-heading, inherit)' }}
      >
        {name}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => (
          <MenuItemCard key={item.id} {...item} variant="standard" />
        ))}
      </div>
    </div>
  );
};

export default CategorySection;
