import React from 'react';
import MenuItemCard from './MenuItemCard';
import type { LayoutPlan } from './useMenuLayout';
import type { CategoryData } from '../../types/menu-board';

interface MagazineGridProps {
  layout: LayoutPlan;
  categories: CategoryData[];
}

// ── Category header (thin accent bar) ──────────────────────────────────────

const CategoryAccent: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center gap-2 col-span-full px-1 min-h-0">
    <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: 'var(--mb-primary)' }} />
    <span
      className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap"
      style={{ color: 'var(--mb-primary)', fontFamily: 'var(--mb-font-heading, inherit)' }}
    >
      {name}
    </span>
    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--mb-primary)', opacity: 0.15 }} />
  </div>
);

// ── Standard mode: unified photo-card grid ─────────────────────────────────
// For ≤20 items (Ensenada 101). Items in a flat CSS grid with category
// headers spanning all columns. Featured items get hero treatment at 2× width.

const StandardGrid: React.FC<MagazineGridProps> = ({ layout, categories }) => {
  const { columns, gridHeight, featuredIds } = layout;

  // Count total rows needed to compute row height
  let totalCells = 0;
  for (const cat of categories) {
    // header takes a row
    totalCells += columns;
    for (const item of cat.items) {
      totalCells += featuredIds.has(item.id) ? 2 : 1;
    }
  }
  const headerRows = categories.length;
  const itemRows = Math.ceil((totalCells - headerRows * columns) / columns);
  const totalRows = headerRows + itemRows;

  // Header rows are thin (20px), item rows share the rest
  const headerRowH = 20;
  const totalHeaderH = headerRows * headerRowH;
  const totalGaps = Math.max(0, totalRows - 1) * 6;
  const itemRowH = Math.max(80, Math.floor((gridHeight - totalHeaderH - totalGaps) / Math.max(itemRows, 1)));

  // Build flat list of grid children with row sizing
  const children: React.ReactNode[] = [];
  for (const cat of categories) {
    // Category header — thin accent bar
    children.push(
      <div key={`h-${cat.id}`} style={{ gridColumn: '1 / -1', height: headerRowH }} className="flex items-center">
        <CategoryAccent name={cat.name} />
      </div>
    );
    // Items
    for (const item of cat.items) {
      const isFeatured = featuredIds.has(item.id);
      children.push(
        <div
          key={item.id}
          style={{
            gridColumn: isFeatured ? 'span 2' : 'span 1',
            height: itemRowH,
          }}
        >
          <MenuItemCard
            name={item.name}
            price={item.price}
            description={item.description}
            imageUrl={item.imageUrl}
            badges={item.badges}
            variant={isFeatured ? 'hero' : 'standard'}
          />
        </div>
      );
    }
  }

  return (
    <div
      style={{
        height: gridHeight,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: 'auto',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

// ── Compact mode: category columns side-by-side ────────────────────────────
// For >20 items (Juanberto's). Each category gets a vertical column strip
// with a colored header and compact item rows filling downward.

const CompactGrid: React.FC<MagazineGridProps> = ({ layout, categories }) => {
  const { gridHeight } = layout;

  // Find the tallest category (most items) to compute row heights
  const maxItems = Math.max(...categories.map(c => c.items.length), 1);
  const headerH = 28;
  const rowGap = 1;
  const availableForItems = gridHeight - headerH - 8; // 8px pad
  const itemH = Math.max(30, Math.floor((availableForItems - (maxItems - 1) * rowGap) / maxItems));

  return (
    <div
      style={{
        height: gridHeight,
        display: 'flex',
        gap: 8,
        overflow: 'hidden',
      }}
    >
      {categories.map(cat => (
        <div
          key={cat.id}
          className="flex-1 min-w-0 flex flex-col rounded-lg overflow-hidden bg-white/[0.02]"
        >
          {/* Category header */}
          <div
            className="flex items-center gap-1.5 px-2 shrink-0"
            style={{ height: headerH, backgroundColor: 'var(--mb-primary)', opacity: 0.85 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white truncate">
              {cat.name}
            </span>
          </div>
          {/* Items */}
          <div className="flex flex-col px-1 py-0.5 flex-1 min-h-0 overflow-hidden">
            {cat.items.map(item => (
              <div key={item.id} className="shrink-0" style={{ height: itemH }}>
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

// ── Main component ──────────────────────────────────────────────────────

const MagazineGrid: React.FC<MagazineGridProps> = ({ layout, categories }) => {
  if (categories.length === 0) return null;

  switch (layout.mode) {
    case 'standard':
      return <StandardGrid layout={layout} categories={categories} />;
    case 'compact':
      return <CompactGrid layout={layout} categories={categories} />;
  }
};

export default MagazineGrid;
