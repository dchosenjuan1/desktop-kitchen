import React from 'react';
import type { TemplateViewProps } from '../../../types/menu-board';
import type { MenuItemData, CategoryData } from '../../../types/menu-board';
import MenuBoardClock from '../MenuBoardClock';

/* ------------------------------------------------------------------ */
/*  Item Card                                                         */
/* ------------------------------------------------------------------ */

const ItemCard: React.FC<{ item: MenuItemData }> = ({ item }) => (
  <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
    {item.imageUrl && (
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
      />
    )}

    <div className="flex flex-1 flex-col gap-1 min-w-0">
      <span className="text-[15px] font-medium leading-snug text-[#1a1a1a] truncate">
        {item.name}
      </span>

      {item.description && (
        <span className="text-xs leading-relaxed text-[#525252] line-clamp-2">
          {item.description}
        </span>
      )}

      {item.badges.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {item.badges.map((b) => (
            <span
              key={b.type}
              className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500"
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>

    <span
      className="flex-shrink-0 text-sm font-semibold tabular-nums"
      style={{ color: 'var(--mb-primary)' }}
    >
      ${Number(item.price).toFixed(2)}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Combo Card                                                        */
/* ------------------------------------------------------------------ */

const ComboCard: React.FC<{ combo: any }> = ({ combo }) => (
  <div
    className="relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
  >
    {combo.savings > 0 && (
      <span
        className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 text-[11px] font-semibold text-white"
        style={{ backgroundColor: 'var(--mb-primary)' }}
      >
        Ahorra ${Number(combo.savings).toFixed(0)}
      </span>
    )}

    <div>
      <h3 className="text-base font-semibold text-[#1a1a1a]">{combo.name}</h3>
      {combo.description && (
        <p className="mt-1 text-xs text-[#525252] line-clamp-2">
          {combo.description}
        </p>
      )}
    </div>

    <span
      className="mt-3 text-lg font-bold tabular-nums"
      style={{ color: 'var(--mb-primary)' }}
    >
      ${Number(combo.comboPrice ?? combo.price ?? 0).toFixed(2)}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Category Section                                                  */
/* ------------------------------------------------------------------ */

const CategorySection: React.FC<{
  category: CategoryData;
  columns: number;
}> = ({ category, columns }) => (
  <section className="mb-10">
    {/* Category heading */}
    <div className="mb-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        {category.name}
      </h2>
      <div
        className="mt-1.5 h-px w-10"
        style={{ backgroundColor: 'var(--mb-primary)' }}
      />
    </div>

    {/* Items grid */}
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {category.items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Main Template View                                                */
/* ------------------------------------------------------------------ */

const ModernMinimalistView: React.FC<TemplateViewProps> = ({
  brand,
  combos,
  isPortrait,
}) => {
  const { theme, categories } = brand;
  const columns = isPortrait ? 2 : 3;

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden"
      style={
        {
          '--mb-primary': theme.primaryColor,
          backgroundColor: '#fafafa',
          fontFamily: "'DM Sans', sans-serif",
        } as React.CSSProperties
      }
    >
      {/* ---------------------------------------------------------- */}
      {/*  Header                                                    */}
      {/* ---------------------------------------------------------- */}
      <header className="flex items-center justify-between px-10 py-6">
        {/* Brand name with accent dot */}
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--mb-primary)' }}
          />
          <span className="text-lg font-bold tracking-tight text-[#1a1a1a]">
            {brand.name}
          </span>
        </div>

        {/* Clock */}
        <div className="text-neutral-400">
          <MenuBoardClock />
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/*  Content                                                   */}
      {/* ---------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto px-10 pb-6">
        {/* Combos */}
        {combos.length > 0 && (
          <section className="mb-10">
            <div className="mb-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Combos
              </h2>
              <div
                className="mt-1.5 h-px w-10"
                style={{ backgroundColor: 'var(--mb-primary)' }}
              />
            </div>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {combos.map((combo: any) => (
                <ComboCard key={combo.id ?? combo.name} combo={combo} />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.map((cat) => (
          <CategorySection key={cat.id} category={cat} columns={columns} />
        ))}
      </main>

      {/* ---------------------------------------------------------- */}
      {/*  Footer                                                    */}
      {/* ---------------------------------------------------------- */}
      <footer className="px-10 py-4">
        <p className="text-center text-[11px] tracking-wide text-neutral-400">
          Precios en MXN
        </p>
      </footer>
    </div>
  );
};

export default ModernMinimalistView;
