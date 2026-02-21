import { useMemo } from 'react';
import type { CategoryData, MenuItemData } from '../../types/menu-board';

// ── Types ──────────────────────────────────────────────────────────────────

export type LayoutMode = 'standard' | 'compact';
export type CardVariant = 'hero' | 'standard' | 'compact' | 'mini';

export interface LayoutPlan {
  mode: LayoutMode;
  /** IDs of items that should get featured/hero treatment (standard mode only) */
  featuredIds: Set<number>;
  /** Total available height for the content area below the header (px) */
  gridHeight: number;
  /** Combo row height (px) */
  comboRowHeight: number;
  /** Columns for standard mode grid */
  columns: number;
  /** Categories for the left sidebar (lower-priced / simpler items) */
  sidebarCategories: CategoryData[];
  /** Categories for the main photo grid area */
  mainCategories: CategoryData[];
  /** Whether the sidebar should be rendered */
  hasSidebar: boolean;
}

interface UseMenuLayoutParams {
  categories: CategoryData[];
  viewportHeight: number;
  viewportWidth: number;
  hasCombos: boolean;
  isPortrait: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const HEADER_H = 48;
const FOOTER_H = 28;
const CONTENT_PAD = 20;

// ── Featured item selection ────────────────────────────────────────────────

function selectFeaturedItems(categories: CategoryData[], maxFeatured: number): Set<number> {
  const featured = new Set<number>();

  for (const cat of categories) {
    for (const item of cat.items) {
      if (featured.size >= maxFeatured) return featured;
      if (item.badges.some(b => b.type === 'bestseller') && item.imageUrl) {
        featured.add(item.id);
      }
    }
  }
  for (const cat of categories) {
    for (const item of cat.items) {
      if (featured.size >= maxFeatured) return featured;
      if (item.badges.some(b => b.type === 'popular-now') && item.imageUrl && !featured.has(item.id)) {
        featured.add(item.id);
      }
    }
  }
  for (const cat of categories) {
    if (featured.size >= maxFeatured) return featured;
    const withImage = cat.items.find(i => i.imageUrl && !featured.has(i.id));
    if (withImage) featured.add(withImage.id);
  }

  return featured;
}

// ── Sidebar / main split ───────────────────────────────────────────────────
// Dynamically splits categories: lower-avg-price categories go to the sidebar,
// higher-priced "main dish" categories stay in the main grid.

function splitCategories(
  categories: CategoryData[],
  isPortrait: boolean,
): { sidebar: CategoryData[]; main: CategoryData[] } {
  // Don't use sidebar in portrait or with very few categories
  if (isPortrait || categories.length < 4) {
    return { sidebar: [], main: categories };
  }

  // Compute avg price per category
  const withAvg = categories.map(cat => {
    const avg = cat.items.reduce((s, i) => s + i.price, 0) / Math.max(cat.items.length, 1);
    return { cat, avg };
  });

  // Sort by avg price ascending
  withAvg.sort((a, b) => a.avg - b.avg);

  // Take the bottom ~30% of categories (by count) as sidebar candidates
  const sidebarCount = Math.max(1, Math.floor(categories.length * 0.35));
  const sidebarCandidates = withAvg.slice(0, sidebarCount).map(x => x.cat);
  const mainCandidates = withAvg.slice(sidebarCount).map(x => x.cat);

  const sidebarItems = sidebarCandidates.reduce((s, c) => s + c.items.length, 0);
  const mainItems = mainCandidates.reduce((s, c) => s + c.items.length, 0);

  // Only use sidebar if it has enough items and main still has enough
  if (sidebarItems < 4 || mainItems < 4) {
    return { sidebar: [], main: categories };
  }

  // Restore original category order within each group
  const sidebarIds = new Set(sidebarCandidates.map(c => c.id));
  const sidebar = categories.filter(c => sidebarIds.has(c.id));
  const main = categories.filter(c => !sidebarIds.has(c.id));

  return { sidebar, main };
}

// ── Main hook ──────────────────────────────────────────────────────────────

export function useMenuLayout({
  categories,
  viewportHeight,
  viewportWidth,
  hasCombos,
  isPortrait,
}: UseMenuLayoutParams): LayoutPlan {
  return useMemo(() => {
    const { sidebar, main } = splitCategories(categories, isPortrait);
    const hasSidebar = sidebar.length > 0;

    const mainItems = main.reduce((sum, c) => sum + c.items.length, 0);

    // Mode is based on main area items only (sidebar always renders compact)
    const mode: LayoutMode = mainItems <= 20 ? 'standard' : 'compact';

    // Combo row: ~16% of viewport, capped
    const comboRowHeight = hasCombos
      ? Math.min(Math.round(viewportHeight * 0.16), isPortrait ? 130 : 170)
      : 0;

    // Available height for the grid
    const footerH = isPortrait ? FOOTER_H : 0;
    const comboGap = hasCombos ? 8 : 0;
    const gridHeight = Math.max(100, viewportHeight - HEADER_H - footerH - comboRowHeight - comboGap - CONTENT_PAD);

    // Featured items for standard mode (from main categories only)
    const featuredIds = mode === 'standard' ? selectFeaturedItems(main, 3) : new Set<number>();

    // Columns for standard mode — fewer when sidebar present to give cards more room
    const columns = isPortrait ? 3 : (hasSidebar ? 3 : 4);

    return {
      mode,
      featuredIds,
      gridHeight,
      comboRowHeight,
      columns,
      sidebarCategories: sidebar,
      mainCategories: main,
      hasSidebar,
    };
  }, [categories, viewportHeight, viewportWidth, hasCombos, isPortrait]);
}
