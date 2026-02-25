import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Tv, Plus, Pencil, Eye, Save, X, Trash2, RefreshCw,
} from 'lucide-react';
import {
  getVirtualBrands,
  createVirtualBrand,
  updateVirtualBrand,
  getVirtualBrandItems,
  setVirtualBrandItems,
  removeVirtualBrandItem,
  getMenuItems,
  getCategories,
  getDeliveryPlatforms,
} from '../api';
import { formatPrice } from '../utils/currency';
import { usePlan } from '../context/PlanContext';
import { TEMPLATE_LIST, TEMPLATE_REGISTRY } from '../components/menu-board/templates';

interface BrandRow {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  active: number;
  platform_id: number;
  platform_name: string;
  item_count: number;
  display_type: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  dark_bg: string | null;
  slug: string | null;
  show_in_pos: number;
  template_slug: string | null;
}

interface BrandItemRow {
  id: number;
  virtual_brand_id: number;
  menu_item_id: number;
  custom_name: string | null;
  custom_price: number | null;
  active: number;
  original_name: string;
  original_price: number;
  category_name: string;
}

interface MenuItemRow {
  id: number;
  name: string;
  price: number;
  category_id: number;
  active: boolean;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  display_type: string;
  font_family: string;
  primary_color: string;
  secondary_color: string;
  dark_bg: string;
  active: boolean;
  show_in_pos: boolean;
  logo_url: string;
  platform_id: number;
  template_slug: string;
}

interface ItemAssignment {
  menu_item_id: number;
  checked: boolean;
  custom_name: string;
  custom_price: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const DISPLAY_TYPE_OPTIONS = [
  { value: 'delivery', label: 'Delivery Only' },
  { value: 'menu_board', label: 'Menu Board Only' },
  { value: 'both', label: 'Both' },
];

const DEFAULT_FORM: FormData = {
  name: '',
  slug: '',
  description: '',
  display_type: 'menu_board',
  font_family: '',
  primary_color: '#0d9488',
  secondary_color: '#115e59',
  dark_bg: '#171717',
  active: true,
  show_in_pos: true,
  logo_url: '',
  platform_id: 0,
  template_slug: '',
};

export default function MenuBoardManagement() {
  const { t } = useTranslation('admin');
  const { limits } = usePlan();
  const canEdit = limits.menuBoard.canRenameBrands;

  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
  const [itemAssignments, setItemAssignments] = useState<Map<number, ItemAssignment>>(new Map());

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const [brandsData, itemsData, catsData, platsData] = await Promise.all([
        getVirtualBrands(),
        getMenuItems(undefined, true),
        getCategories(),
        getDeliveryPlatforms(),
      ]);
      setBrands(brandsData);
      setMenuItems(itemsData);
      setCategories(catsData);
      setPlatforms(platsData);
    } catch (err) {
      console.error('Failed to load menu board data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const getMenuBoardPlatformId = (): number => {
    const mbPlatform = platforms.find((p: any) => p.name === 'menu_board');
    return mbPlatform?.id || platforms[0]?.id || 1;
  };

  const openEditor = async (brand?: BrandRow) => {
    if (brand) {
      setEditingBrandId(brand.id);
      setFormData({
        name: brand.name,
        slug: brand.slug || slugify(brand.name),
        description: brand.description || '',
        display_type: brand.display_type || 'delivery',
        font_family: brand.font_family || '',
        primary_color: brand.primary_color || '#0d9488',
        secondary_color: brand.secondary_color || '#115e59',
        dark_bg: brand.dark_bg || '#171717',
        active: !!brand.active,
        show_in_pos: !!brand.show_in_pos,
        logo_url: brand.logo_url || '',
        platform_id: brand.platform_id,
        template_slug: brand.template_slug || '',
      });

      // Load existing brand items
      try {
        const brandItems: BrandItemRow[] = await getVirtualBrandItems(brand.id);
        const assignments = new Map<number, ItemAssignment>();
        menuItems.forEach((mi) => {
          const existing = brandItems.find((bi) => bi.menu_item_id === mi.id);
          assignments.set(mi.id, {
            menu_item_id: mi.id,
            checked: !!existing,
            custom_name: existing?.custom_name || '',
            custom_price: existing?.custom_price != null ? String(existing.custom_price) : '',
          });
        });
        setItemAssignments(assignments);
      } catch {
        initEmptyAssignments();
      }
    } else {
      setEditingBrandId(null);
      setFormData({ ...DEFAULT_FORM, platform_id: getMenuBoardPlatformId() });
      initEmptyAssignments();
    }
    setEditorOpen(true);
  };

  const initEmptyAssignments = () => {
    const assignments = new Map<number, ItemAssignment>();
    menuItems.forEach((mi) => {
      assignments.set(mi.id, {
        menu_item_id: mi.id,
        checked: false,
        custom_name: '',
        custom_price: '',
      });
    });
    setItemAssignments(assignments);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingBrandId(null);
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !editingBrandId) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const toggleItem = (itemId: number) => {
    setItemAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId)!;
      next.set(itemId, { ...current, checked: !current.checked });
      return next;
    });
  };

  const updateItemField = (itemId: number, field: 'custom_name' | 'custom_price', value: string) => {
    setItemAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId)!;
      next.set(itemId, { ...current, [field]: value });
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      let brandId = editingBrandId;

      const brandPayload = {
        name: formData.name,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        display_type: formData.display_type,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        font_family: formData.font_family || null,
        dark_bg: formData.dark_bg,
        slug: formData.slug || slugify(formData.name),
        show_in_pos: formData.show_in_pos,
        active: formData.active,
        template_slug: formData.template_slug || null,
      };

      if (brandId) {
        await updateVirtualBrand(brandId, brandPayload);
      } else {
        const result = await createVirtualBrand({
          ...brandPayload,
          platform_id: formData.platform_id || getMenuBoardPlatformId(),
        });
        brandId = result.id;
      }

      // Build items array from checked assignments
      const items = Array.from(itemAssignments.values())
        .filter((a) => a.checked)
        .map((a) => ({
          menu_item_id: a.menu_item_id,
          custom_name: a.custom_name || undefined,
          custom_price: a.custom_price ? parseFloat(a.custom_price) : undefined,
        }));

      await setVirtualBrandItems(brandId!, items);

      // Remove unchecked items that were previously assigned
      if (editingBrandId) {
        const currentItems: BrandItemRow[] = await getVirtualBrandItems(editingBrandId);
        const checkedIds = new Set(items.map((i) => i.menu_item_id));
        for (const bi of currentItems) {
          if (!checkedIds.has(bi.menu_item_id)) {
            await removeVirtualBrandItem(editingBrandId, bi.menu_item_id);
          }
        }
      }

      closeEditor();
      await fetchBrands();
    } catch (err) {
      console.error('Failed to save brand:', err);
    } finally {
      setSaving(false);
    }
  };

  const getDisplayTypeBadge = (type: string | null) => {
    switch (type) {
      case 'menu_board':
        return <span className="px-2 py-0.5 text-xs rounded bg-blue-600/20 text-blue-400">Menu Board</span>;
      case 'both':
        return <span className="px-2 py-0.5 text-xs rounded bg-green-600/20 text-green-400">Both</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-neutral-600/20 text-neutral-400">Delivery</span>;
    }
  };

  // Group menu items by category
  const itemsByCategory = categories
    .map((cat) => ({
      ...cat,
      items: menuItems.filter((mi) => mi.category_id === cat.id && mi.active),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <Tv size={28} className="text-brand-500" />
            <h1 className="text-3xl font-black tracking-tighter">Menu Board Management</h1>
          </div>
          <button
            onClick={fetchBrands}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 animate-pulse">
                <div className="h-32 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Brand cards */}
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden"
              >
                {/* Color swatch bar */}
                <div
                  className="h-3 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${brand.primary_color || '#0d9488'}, ${brand.secondary_color || brand.primary_color || '#115e59'})`,
                  }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{brand.name}</h3>
                      {brand.slug && (
                        <p className="text-xs text-neutral-500 font-mono">/{brand.slug}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getDisplayTypeBadge(brand.display_type)}
                      {brand.template_slug && TEMPLATE_REGISTRY[brand.template_slug] && (
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-600/20 text-purple-400">
                          {TEMPLATE_REGISTRY[brand.template_slug].name}
                        </span>
                      )}
                      {brand.active ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Active" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" title="Inactive" />
                      )}
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{brand.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Color dots */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full border border-neutral-700"
                          style={{ backgroundColor: brand.primary_color || '#0d9488' }}
                          title="Primary"
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-neutral-700"
                          style={{ backgroundColor: brand.secondary_color || '#115e59' }}
                          title="Secondary"
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-neutral-700"
                          style={{ backgroundColor: brand.dark_bg || '#171717' }}
                          title="Background"
                        />
                      </div>
                      <span className="text-sm text-neutral-500">{brand.item_count} items</span>
                    </div>
                    <button
                      onClick={() => openEditor(brand)}
                      disabled={!canEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add brand card */}
            <button
              onClick={() => openEditor()}
              disabled={!canEdit}
              className="bg-neutral-900 rounded-lg border-2 border-dashed border-neutral-700 hover:border-brand-600 transition-colors p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-brand-600/10 flex items-center justify-center">
                <Plus className="text-brand-500" size={24} />
              </div>
              <span className="text-neutral-400 font-medium">Add Brand</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-4xl mx-4 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white">
                {editingBrandId ? 'Edit Brand' : 'New Brand'}
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href="/#/menu-board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Eye size={14} />
                  Preview
                </a>
                <button
                  onClick={closeEditor}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Settings row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
                    placeholder="Brand name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                    placeholder="auto-generated-from-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Display row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Display Type</label>
                  <select
                    value={formData.display_type}
                    onChange={(e) => updateField('display_type', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
                  >
                    {DISPLAY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Font Family</label>
                  <input
                    type="text"
                    value={formData.font_family}
                    onChange={(e) => updateField('font_family', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Inter, Roboto"
                  />
                </div>
              </div>

              {/* Template picker */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Template</label>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {/* Classic (no template) */}
                  <button
                    type="button"
                    onClick={() => updateField('template_slug', '')}
                    className={`shrink-0 w-36 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1.5 p-3 ${
                      !formData.template_slug
                        ? 'border-brand-500 bg-brand-600/10'
                        : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <Tv size={18} className="text-neutral-400" />
                    <span className="text-xs font-medium text-white">Classic</span>
                    <span className="text-[10px] text-neutral-500 text-center leading-tight">Photo grid + list view</span>
                  </button>
                  {/* Template options */}
                  {TEMPLATE_LIST.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => updateField('template_slug', t.slug)}
                      className={`shrink-0 w-36 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1.5 p-3 ${
                        formData.template_slug === t.slug
                          ? 'border-brand-500 bg-brand-600/10'
                          : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                      }`}
                      title={t.description}
                    >
                      <span className="text-xs font-medium text-white">{t.name}</span>
                      <span className="text-[10px] text-neutral-500 text-center leading-tight line-clamp-2">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors row */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Colors</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-10 h-10 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500 mb-1">Primary</p>
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-10 h-10 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500 mb-1">Secondary</p>
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => updateField('secondary_color', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.dark_bg}
                      onChange={(e) => updateField('dark_bg', e.target.value)}
                      className="w-10 h-10 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500 mb-1">Background</p>
                      <input
                        type="text"
                        value={formData.dark_bg}
                        onChange={(e) => updateField('dark_bg', e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white font-mono text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
                {/* Live preview swatch */}
                <div
                  className="mt-3 h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{
                    backgroundColor: formData.dark_bg,
                    color: formData.primary_color,
                    border: `1px solid ${formData.secondary_color}`,
                  }}
                >
                  {formData.name || 'Brand Preview'} — Color Preview
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => updateField('active', e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 text-brand-600 focus:ring-brand-500 bg-neutral-800"
                  />
                  <span className="text-sm text-neutral-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_in_pos}
                    onChange={(e) => updateField('show_in_pos', e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 text-brand-600 focus:ring-brand-500 bg-neutral-800"
                  />
                  <span className="text-sm text-neutral-300">Show in POS</span>
                </label>
              </div>

              {/* Item assignment */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Menu Items ({Array.from(itemAssignments.values()).filter((a) => a.checked).length} selected)
                </label>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {itemsByCategory.map((cat) => (
                    <div key={cat.id}>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                        {cat.name}
                      </h4>
                      <div className="space-y-1">
                        {cat.items.map((mi) => {
                          const assignment = itemAssignments.get(mi.id);
                          if (!assignment) return null;
                          return (
                            <div
                              key={mi.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                assignment.checked ? 'bg-brand-600/10 border border-brand-800/30' : 'hover:bg-neutral-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={assignment.checked}
                                onChange={() => toggleItem(mi.id)}
                                className="w-4 h-4 rounded border-neutral-600 text-brand-600 focus:ring-brand-500 bg-neutral-800 flex-shrink-0"
                              />
                              <span className="text-sm text-white flex-shrink-0 w-40 truncate">{mi.name}</span>
                              <span className="text-xs text-neutral-500 flex-shrink-0 w-16 text-right">
                                {formatPrice(mi.price)}
                              </span>
                              {assignment.checked && (
                                <>
                                  <input
                                    type="text"
                                    value={assignment.custom_name}
                                    onChange={(e) => updateItemField(mi.id, 'custom_name', e.target.value)}
                                    placeholder="Custom name"
                                    className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500 min-w-0"
                                  />
                                  <input
                                    type="text"
                                    value={assignment.custom_price}
                                    onChange={(e) => updateItemField(mi.id, 'custom_price', e.target.value)}
                                    placeholder="Price"
                                    className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
              <button
                onClick={closeEditor}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
