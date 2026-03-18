import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Tv, Plus, Pencil, Eye, Save, X, Trash2, RefreshCw, Image, ImageOff,
  Monitor, Copy, Check, ExternalLink, Settings2, QrCode, Clock, DollarSign,
  MessageSquare, Type, Layers, Printer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getVirtualBrands,
  createVirtualBrand,
  updateVirtualBrand,
  deleteVirtualBrand,
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
  board_settings: Record<string, any> | null;
}

interface BrandItemRow {
  id: number;
  virtual_brand_id: number;
  menu_item_id: number;
  custom_name: string | null;
  custom_price: number | null;
  show_image: boolean;
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
  image_url?: string;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface BoardSettingsForm {
  showCombos: boolean;
  showLogo: boolean;
  showClock: boolean;
  showPrices: boolean;
  showQrCode: boolean;
  qrCodeUrl: string;
  qrCodeLabel: string;
  slideDuration: number;
  footerText: string;
  announcementText: string;
  showDescription: boolean;
  qrRequirePayment: boolean;
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
  board_settings: BoardSettingsForm;
}

interface ItemAssignment {
  menu_item_id: number;
  checked: boolean;
  custom_name: string;
  custom_price: string;
  show_image: boolean;
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

const DEFAULT_BOARD_SETTINGS: BoardSettingsForm = {
  showCombos: true,
  showLogo: true,
  showClock: true,
  showPrices: true,
  showQrCode: false,
  qrCodeUrl: '',
  qrCodeLabel: 'Scan to Order',
  slideDuration: 12,
  footerText: 'Precios en MXN',
  announcementText: '',
  showDescription: true,
  qrRequirePayment: false,
};

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
  board_settings: { ...DEFAULT_BOARD_SETTINGS },
};

/* ==================== Table QR Code Generator ==================== */

function TableQRGenerator() {
  const [tableCount, setTableCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const baseUrl = `${window.location.origin}/#/order`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrHtml = Array.from({ length: tableCount }, (_, i) => {
      const tableNum = i + 1;
      const url = `${baseUrl}?table=${tableNum}`;
      return `
        <div style="display:inline-block;text-align:center;margin:16px;page-break-inside:avoid;">
          <div id="qr-${tableNum}" style="width:200px;height:200px;"></div>
          <p style="font-weight:bold;font-size:18px;margin:8px 0 2px;">Table ${tableNum}</p>
          <p style="font-size:10px;color:#666;">${url}</p>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table QR Codes</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; }
          @media print {
            body { padding: 0; }
            h1 { font-size: 16px; margin-bottom: 8px; }
          }
        </style>
      </head>
      <body>
        <h1>Table QR Codes</h1>
        <div style="display:flex;flex-wrap:wrap;">${qrHtml}</div>
        <script>
          document.querySelectorAll('[id^="qr-"]').forEach(el => {
            const num = el.id.split('-')[1];
            QRCode.toCanvas(document.createElement('canvas'), '${baseUrl}?table=' + num, { width: 200 }, (err, canvas) => {
              if (!err) el.appendChild(canvas);
            });
          });
          setTimeout(() => window.print(), 500);
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="mt-8 bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <QrCode size={20} className="text-brand-500" />
          <h2 className="text-lg font-bold text-white">Table QR Codes</h2>
        </div>
        <ChevronDown
          size={20}
          className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-neutral-800 pt-4">
          <p className="text-sm text-neutral-400 mb-4">
            Generate QR codes for each table. Customers scan to open the ordering page with their table number pre-filled.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Number of tables</label>
              <input
                type="number"
                min={1}
                max={100}
                value={tableCount || ''}
                onChange={e => setTableCount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-28 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                placeholder="e.g. 10"
              />
            </div>
            {tableCount > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 mt-4 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Printer size={16} />
                Print All ({tableCount})
              </button>
            )}
          </div>

          {tableCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: tableCount }, (_, i) => {
                const tableNum = i + 1;
                const url = `${baseUrl}?table=${tableNum}`;
                return (
                  <div key={tableNum} className="bg-neutral-800 rounded-lg p-4 flex flex-col items-center">
                    <div className="bg-white rounded-lg p-2 mb-2">
                      <QRCodeSVG value={url} size={120} />
                    </div>
                    <p className="text-white font-bold text-sm">Table {tableNum}</p>
                    <p className="text-neutral-500 text-[10px] truncate max-w-full mt-0.5">{url}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Chevron icon for QR section ==================== */
function ChevronDown({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

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
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
  const [itemAssignments, setItemAssignments] = useState<Map<number, ItemAssignment>>(new Map());

  // Connect to screen state
  const [screenModalOpen, setScreenModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const getMenuBoardPlatformId = (): number | null => {
    const mbPlatform = platforms.find((p: any) => p.name === 'menu_board');
    return mbPlatform?.id || platforms[0]?.id || null;
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
        board_settings: {
          ...DEFAULT_BOARD_SETTINGS,
          ...(typeof brand.board_settings === 'object' && brand.board_settings !== null
            ? Object.fromEntries(Object.entries(brand.board_settings).filter(([k]) => !/^\d+$/.test(k)))
            : {}),
        },
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
            show_image: existing ? existing.show_image !== false : true,
          });
        });
        setItemAssignments(assignments);
      } catch {
        initEmptyAssignments();
      }
    } else {
      setEditingBrandId(null);
      setFormData({ ...DEFAULT_FORM, platform_id: getMenuBoardPlatformId() || 0 });
      initEmptyAssignments();
    }
    setSaveError(null);
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
        show_image: true,
      });
    });
    setItemAssignments(assignments);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingBrandId(null);
  };

  const handleDelete = async (brand: BrandRow) => {
    if (!window.confirm(`Delete "${brand.name}"? This will remove the brand and all its item assignments. This cannot be undone.`)) {
      return;
    }
    try {
      await deleteVirtualBrand(brand.id);
      await fetchBrands();
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
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

  const toggleItemImage = (itemId: number) => {
    setItemAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId)!;
      next.set(itemId, { ...current, show_image: !current.show_image });
      return next;
    });
  };

  const updateSetting = (key: keyof BoardSettingsForm, value: any) => {
    setFormData((prev) => ({
      ...prev,
      board_settings: { ...prev.board_settings, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    setSaveError(null);
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
        board_settings: formData.board_settings,
      };

      if (brandId) {
        await updateVirtualBrand(brandId, brandPayload);
      } else {
        // Menu board brands don't strictly need a platform_id
        const platformId = formData.platform_id || getMenuBoardPlatformId();
        const result = await createVirtualBrand({
          ...brandPayload,
          platform_id: platformId as number,
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
          show_image: a.show_image,
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
    } catch (err: any) {
      console.error('Failed to save brand:', err);
      setSaveError(err?.message || 'Failed to save. Please try again.');
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
          <div className="flex items-center gap-2">
            <a
              href="/#/menu-board"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 text-neutral-300 text-sm rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <Eye size={16} />
              Preview
            </a>
            <button
              onClick={() => setScreenModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Monitor size={16} />
              Connect to Screen
            </button>
            <button
              onClick={fetchBrands}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          </div>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(brand)}
                        disabled={!canEdit}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-400 text-sm rounded-lg hover:bg-red-600/10 transition-colors disabled:opacity-50"
                        title="Delete brand"
                      >
                        <Trash2 size={14} />
                      </button>
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

        {/* QR Code Table Generator */}
        <TableQRGenerator />
      </div>

      {/* Connect to Screen Modal */}
      {screenModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setScreenModalOpen(false)}>
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <Monitor size={24} className="text-brand-500" />
                <h2 className="text-xl font-bold text-white">Connect to Screen</h2>
              </div>
              <button onClick={() => setScreenModalOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-neutral-400">
                Open this URL on any TV, tablet, or display in your restaurant to show your menu board. The display updates automatically when you make changes.
              </p>

              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Menu Board URL</label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white text-sm font-mono truncate select-all">
                    {`${window.location.origin}/#/menu-board`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/#/menu-board`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-neutral-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Setup Instructions</h3>
                <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
                  <li>Open a web browser on your TV or display device</li>
                  <li>Paste the URL above and navigate to it</li>
                  <li>Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-xs text-white">F11</kbd> for fullscreen mode</li>
                  <li>The menu rotates automatically and refreshes every 5 minutes</li>
                </ol>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="/#/menu-board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <ExternalLink size={14} />
                  Open preview in new tab
                </a>
                <button
                  onClick={() => setScreenModalOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* Board Settings */}
              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-neutral-800/50 border-b border-neutral-800">
                  <Settings2 size={16} className="text-brand-400" />
                  <span className="text-sm font-semibold text-white">Board Display Settings</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Toggle grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {([
                      { key: 'showCombos' as const, label: 'Show Combos', icon: Layers },
                      { key: 'showClock' as const, label: 'Show Clock', icon: Clock },
                      { key: 'showPrices' as const, label: 'Show Prices', icon: DollarSign },
                      { key: 'showDescription' as const, label: 'Show Descriptions', icon: Type },
                      { key: 'showLogo' as const, label: 'Show Logo', icon: Image },
                      { key: 'showQrCode' as const, label: 'Show QR Code', icon: QrCode },
                    ]).map(({ key, label, icon: Icon }) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                          formData.board_settings[key]
                            ? 'bg-brand-600/10 border-brand-700/40'
                            : 'bg-neutral-800/30 border-neutral-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!formData.board_settings[key]}
                          onChange={(e) => updateSetting(key, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-neutral-600 text-brand-600 focus:ring-brand-500 bg-neutral-800"
                        />
                        <Icon size={14} className={formData.board_settings[key] ? 'text-brand-400' : 'text-neutral-500'} />
                        <span className="text-xs text-neutral-300">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* QR Code settings (conditional) */}
                  {formData.board_settings.showQrCode && (
                    <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-brand-600/30">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">QR Code URL</label>
                        <input
                          type="text"
                          value={formData.board_settings.qrCodeUrl}
                          onChange={(e) => updateSetting('qrCodeUrl', e.target.value)}
                          placeholder="Leave blank to auto-link to /#/order"
                          className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">QR Label</label>
                        <input
                          type="text"
                          value={formData.board_settings.qrCodeLabel}
                          onChange={(e) => updateSetting('qrCodeLabel', e.target.value)}
                          placeholder="Scan to Order"
                          className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors border border-neutral-700 bg-neutral-800 hover:border-neutral-600">
                          <input
                            type="checkbox"
                            checked={formData.board_settings.qrRequirePayment}
                            onChange={(e) => updateSetting('qrRequirePayment', e.target.checked)}
                            className="accent-brand-600"
                          />
                          <div>
                            <span className="text-xs text-neutral-300">Require payment on phone</span>
                            <p className="text-[10px] text-neutral-600">When off, customers pay at counter (default)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Slide duration + footer */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Slide Duration (seconds)</label>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={formData.board_settings.slideDuration}
                        onChange={(e) => updateSetting('slideDuration', Math.max(5, Math.min(120, parseInt(e.target.value) || 12)))}
                        className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Footer Text</label>
                      <input
                        type="text"
                        value={formData.board_settings.footerText}
                        onChange={(e) => updateSetting('footerText', e.target.value)}
                        placeholder="Precios en MXN"
                        className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Announcement banner */}
                  <div>
                    <label className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                      <MessageSquare size={12} />
                      Announcement Banner
                    </label>
                    <input
                      type="text"
                      value={formData.board_settings.announcementText}
                      onChange={(e) => updateSetting('announcementText', e.target.value)}
                      placeholder="e.g. Happy Hour 4-7 PM — 2x1 on all drinks!"
                      className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-brand-500"
                    />
                    {formData.board_settings.announcementText && (
                      <div
                        className="mt-2 py-1.5 px-3 rounded text-center text-xs font-semibold text-white"
                        style={{ backgroundColor: `${formData.primary_color}ee` }}
                      >
                        {formData.board_settings.announcementText}
                      </div>
                    )}
                  </div>
                </div>
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
                          const hasImage = !!mi.image_url;
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
                                  {hasImage && (
                                    <button
                                      type="button"
                                      onClick={() => toggleItemImage(mi.id)}
                                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                                        assignment.show_image
                                          ? 'text-brand-400 bg-brand-600/20 hover:bg-brand-600/30'
                                          : 'text-neutral-500 bg-neutral-800 hover:bg-neutral-700'
                                      }`}
                                      title={assignment.show_image ? 'Image visible — click to hide' : 'Image hidden — click to show'}
                                    >
                                      {assignment.show_image ? <Image size={14} /> : <ImageOff size={14} />}
                                    </button>
                                  )}
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
            <div className="p-6 border-t border-neutral-800">
              {saveError && (
                <div className="mb-3 px-4 py-2 bg-red-600/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {saveError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
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
        </div>
      )}
    </div>
  );
}
