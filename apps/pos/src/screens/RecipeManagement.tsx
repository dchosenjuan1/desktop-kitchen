import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Check,
  X,
  Flame,
} from 'lucide-react';
import {
  getRecipeSummary,
  getItemRecipe,
  updateItemRecipe,
  getInventory,
  logWaste,
  getWasteReport,
} from '../api';
import { RecipeSummaryItem, RecipeIngredient, InventoryItem, WasteReport } from '../types';
import BrandLogo from '../components/BrandLogo';

interface EditingRecipe {
  menuItemId: number;
  menuItemName: string;
  menuItemPrice: number;
  ingredients: {
    inventory_item_id: number;
    quantity_used: number;
    ingredient_name: string;
    unit: string;
    cost_price: number;
  }[];
  dirty: boolean;
}

export default function RecipeManagement() {
  const { t } = useTranslation('inventory');

  const WASTE_REASONS = [
    { value: 'spoilage', label: t('recipe.wasteReasons.spoilage'), color: 'text-orange-400' },
    { value: 'prep_error', label: t('recipe.wasteReasons.prep_error'), color: 'text-red-400' },
    { value: 'dropped', label: t('recipe.wasteReasons.dropped'), color: 'text-yellow-400' },
    { value: 'expired', label: t('recipe.wasteReasons.expired'), color: 'text-purple-400' },
    { value: 'other', label: t('recipe.wasteReasons.other'), color: 'text-neutral-400' },
  ] as const;

  const [items, setItems] = useState<RecipeSummaryItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'has-recipe' | 'missing'>('all');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditingRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  // Waste logging state
  const [wasteIngredientId, setWasteIngredientId] = useState<number | null>(null);
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState<string>('prep_error');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteSubmitting, setWasteSubmitting] = useState(false);
  const [wasteReport, setWasteReport] = useState<WasteReport | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, invData, wReport] = await Promise.all([
        getRecipeSummary(),
        getInventory(),
        getWasteReport({ start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] }).catch(() => null),
      ]);
      setItems(summaryData);
      setInventoryItems(invData);
      if (wReport) setWasteReport(wReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('recipe.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categories = Array.from(new Set(items.map(i => i.category_name))).sort();

  const filtered = items.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && item.category_name !== filterCategory) return false;
    if (filterStatus === 'has-recipe' && item.ingredient_count === 0) return false;
    if (filterStatus === 'missing' && item.ingredient_count > 0) return false;
    return true;
  });

  const totalItems = items.length;
  const withRecipe = items.filter(i => i.ingredient_count > 0).length;
  const missingRecipe = totalItems - withRecipe;
  const avgMargin = items.filter(i => i.ingredient_count > 0 && i.price > 0).length > 0
    ? items.filter(i => i.ingredient_count > 0 && i.price > 0)
        .reduce((sum, i) => sum + ((i.price - i.cost_per_unit) / i.price) * 100, 0)
      / items.filter(i => i.ingredient_count > 0 && i.price > 0).length
    : 0;

  const handleExpand = async (itemId: number) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
      setEditing(null);
      return;
    }
    setExpandedItem(itemId);

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      const recipe = await getItemRecipe(itemId);
      setEditing({
        menuItemId: itemId,
        menuItemName: item.name,
        menuItemPrice: item.price,
        ingredients: recipe.map(r => ({
          inventory_item_id: r.inventory_item_id,
          quantity_used: r.quantity_used,
          ingredient_name: r.ingredient_name,
          unit: r.unit,
          cost_price: r.cost_price,
        })),
        dirty: false,
      });
    } catch {
      setEditing({
        menuItemId: itemId,
        menuItemName: item.name,
        menuItemPrice: item.price,
        ingredients: [],
        dirty: false,
      });
    }
  };

  const handleAddIngredient = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      ingredients: [
        ...editing.ingredients,
        { inventory_item_id: 0, quantity_used: 0, ingredient_name: '', unit: '', cost_price: 0 },
      ],
      dirty: true,
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      ingredients: editing.ingredients.filter((_, i) => i !== index),
      dirty: true,
    });
  };

  const handleIngredientChange = (index: number, field: 'inventory_item_id' | 'quantity_used', value: number) => {
    if (!editing) return;
    const updated = [...editing.ingredients];
    if (field === 'inventory_item_id') {
      const inv = inventoryItems.find(i => i.id === value);
      updated[index] = {
        ...updated[index],
        inventory_item_id: value,
        ingredient_name: inv?.name || '',
        unit: inv?.unit || '',
        cost_price: Number(inv?.cost_price) || 0,
      };
    } else {
      updated[index] = { ...updated[index], quantity_used: value };
    }
    setEditing({ ...editing, ingredients: updated, dirty: true });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = editing.ingredients
        .filter(ing => ing.inventory_item_id > 0 && ing.quantity_used > 0)
        .map(ing => ({
          inventory_item_id: ing.inventory_item_id,
          quantity_used: ing.quantity_used,
        }));
      await updateItemRecipe(editing.menuItemId, payload);
      setEditing({ ...editing, dirty: false });
      setSuccess(t('recipe.recipeSavedFor', { name: editing.menuItemName }));
      setTimeout(() => setSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('recipe.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const openWasteForm = (inventoryItemId: number) => {
    setWasteIngredientId(inventoryItemId);
    setWasteQty('');
    setWasteReason('prep_error');
    setWasteNotes(editing ? t('recipe.fromRecipe', { name: editing.menuItemName }) : '');
  };

  const closeWasteForm = () => {
    setWasteIngredientId(null);
    setWasteQty('');
    setWasteNotes('');
  };

  const handleLogWaste = async () => {
    if (!wasteIngredientId || !wasteQty || parseFloat(wasteQty) <= 0) return;
    setWasteSubmitting(true);
    setError(null);
    try {
      await logWaste({
        inventory_item_id: wasteIngredientId,
        quantity: parseFloat(wasteQty),
        reason: wasteReason,
        notes: wasteNotes || undefined,
      });
      const inv = inventoryItems.find(i => i.id === wasteIngredientId);
      setSuccess(t('recipe.wasteLogged', { qty: wasteQty, unit: inv?.unit || '', name: inv?.name || 'item' }));
      setTimeout(() => setSuccess(null), 3000);
      closeWasteForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('recipe.failedLogWaste'));
    } finally {
      setWasteSubmitting(false);
    }
  };

  // Waste lookup: get waste cost for an ingredient from the 7-day report
  const getIngredientWaste = (inventoryItemId: number) => {
    if (!wasteReport?.by_item) return null;
    return wasteReport.by_item.find(w => w.inventory_item_id === inventoryItemId) || null;
  };

  const recipeCost = (ingredients: EditingRecipe['ingredients']) =>
    ingredients.reduce((sum, ing) => sum + ing.quantity_used * Number(ing.cost_price || 0), 0);

  const margin = (price: number, cost: number) =>
    price > 0 ? ((price - cost) / price) * 100 : 0;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <BookOpen size={28} className="text-brand-500" />
            <h1 className="text-3xl font-black tracking-tighter">{t('recipe.title')}</h1>
          </div>
          <BrandLogo className="h-10" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <p className="text-neutral-400 text-sm">{t('recipe.totalItems')}</p>
            <p className="text-2xl font-bold text-white">{totalItems}</p>
          </div>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <p className="text-neutral-400 text-sm">{t('recipe.withRecipe')}</p>
            <p className="text-2xl font-bold text-green-400">{withRecipe}</p>
          </div>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <p className="text-neutral-400 text-sm">{t('recipe.missingRecipe')}</p>
            <p className="text-2xl font-bold text-amber-400">{missingRecipe}</p>
          </div>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <p className="text-neutral-400 text-sm">{t('recipe.avgFoodMargin')}</p>
            <p className="text-2xl font-bold text-brand-400">{avgMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <p className="text-neutral-400 text-sm">{t('recipe.waste7Days')}</p>
            <p className="text-2xl font-bold text-red-400">
              ${wasteReport ? Number(wasteReport.summary.total_waste_cost || 0).toFixed(0) : '—'}
            </p>
            {wasteReport && (
              <p className="text-xs text-neutral-500 mt-1">{wasteReport.summary.total_entries} {t('recipe.events')}</p>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-4 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={20} /></button>
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 mb-4 flex items-center gap-2">
            <Check size={20} className="text-green-400" />
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={t('recipe.searchMenuItems')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">{t('recipe.allCategories')}</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">{t('recipe.allItems')}</option>
            <option value="has-recipe">{t('recipe.hasRecipe')}</option>
            <option value="missing">{t('recipe.missingRecipe')}</option>
          </select>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              <div className="col-span-4">{t('recipe.item')}</div>
              <div className="col-span-2">{t('recipe.category')}</div>
              <div className="col-span-1 text-right">{t('recipe.price')}</div>
              <div className="col-span-1 text-right">{t('recipe.cogs')}</div>
              <div className="col-span-1 text-right">{t('recipe.margin')}</div>
              <div className="col-span-2 text-center">{t('recipe.ingredients')}</div>
              <div className="col-span-1" />
            </div>

            {filtered.map(item => {
              const isExpanded = expandedItem === item.id;
              const cost = item.cost_per_unit;
              const mgn = margin(item.price, cost);
              const hasMissing = item.ingredient_count === 0;

              return (
                <div key={item.id} className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                  {/* Item Row */}
                  <button
                    onClick={() => handleExpand(item.id)}
                    className="w-full grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-800/50 transition-colors text-left"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      {hasMissing && <AlertTriangle size={16} className="text-amber-400 shrink-0" />}
                      <span className={`font-medium ${item.active ? 'text-white' : 'text-neutral-500 line-through'}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-neutral-400 text-sm">{item.category_name}</div>
                    <div className="col-span-1 text-right text-white font-mono text-sm">${item.price.toFixed(2)}</div>
                    <div className="col-span-1 text-right text-neutral-400 font-mono text-sm">
                      {item.ingredient_count > 0 ? `$${cost.toFixed(2)}` : '-'}
                    </div>
                    <div className={`col-span-1 text-right font-mono text-sm ${
                      item.ingredient_count === 0 ? 'text-neutral-500' :
                      mgn >= 70 ? 'text-green-400' :
                      mgn >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {item.ingredient_count > 0 ? `${mgn.toFixed(0)}%` : '-'}
                    </div>
                    <div className="col-span-2 text-center">
                      {item.ingredient_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs">
                          {t('recipe.ingredientCount', { count: item.ingredient_count })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded text-xs">
                          {t('recipe.notSet')}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {isExpanded ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
                    </div>
                  </button>

                  {/* Expanded Recipe Editor */}
                  {isExpanded && editing && editing.menuItemId === item.id && (
                    <div className="border-t border-neutral-800 p-4 bg-neutral-950/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">
                          {t('recipe.recipeFor', { name: editing.menuItemName })}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-neutral-400">
                            {t('recipe.cost')} <span className="text-white font-mono">${recipeCost(editing.ingredients).toFixed(2)}</span>
                            {' / '}
                            {t('recipe.margin')} <span className={`font-mono ${
                              margin(editing.menuItemPrice, recipeCost(editing.ingredients)) >= 70 ? 'text-green-400' :
                              margin(editing.menuItemPrice, recipeCost(editing.ingredients)) >= 50 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {margin(editing.menuItemPrice, recipeCost(editing.ingredients)).toFixed(1)}%
                            </span>
                          </div>
                          <button
                            onClick={handleAddIngredient}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white hover:bg-neutral-700 transition-colors"
                          >
                            <Plus size={16} />
                            {t('recipe.addIngredient')}
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving || !editing.dirty}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 rounded-lg text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                          >
                            <Save size={16} />
                            {saving ? t('recipe.saving') : t('recipe.saveRecipe')}
                          </button>
                        </div>
                      </div>

                      {editing.ingredients.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                          <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                          <p>{t('recipe.noIngredients')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Ingredient Header */}
                          <div className="grid grid-cols-12 gap-3 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            <div className="col-span-4">{t('recipe.ingredient')}</div>
                            <div className="col-span-1">{t('recipe.qtyUsed')}</div>
                            <div className="col-span-1">{t('recipe.unit')}</div>
                            <div className="col-span-1 text-right">{t('recipe.costPerUnit')}</div>
                            <div className="col-span-1 text-right">{t('recipe.lineCost')}</div>
                            <div className="col-span-2 text-right">{t('recipe.waste7d')}</div>
                            <div className="col-span-2" />
                          </div>

                          {editing.ingredients.map((ing, idx) => {
                            const lineCost = ing.quantity_used * Number(ing.cost_price || 0);
                            const waste = ing.inventory_item_id ? getIngredientWaste(ing.inventory_item_id) : null;
                            const isWasteFormOpen = wasteIngredientId === ing.inventory_item_id;
                            return (
                              <React.Fragment key={idx}>
                                <div className="grid grid-cols-12 gap-3 items-center bg-neutral-900 rounded-lg px-2 py-2 border border-neutral-800">
                                  <div className="col-span-4">
                                    <select
                                      value={ing.inventory_item_id || ''}
                                      onChange={e => handleIngredientChange(idx, 'inventory_item_id', Number(e.target.value))}
                                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-brand-500"
                                    >
                                      <option value="">{t('recipe.selectIngredient')}</option>
                                      {inventoryItems.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                          {inv.name} ({inv.unit})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={ing.quantity_used || ''}
                                      onChange={e => handleIngredientChange(idx, 'quantity_used', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono focus:outline-none focus:border-brand-500"
                                    />
                                  </div>
                                  <div className="col-span-1 text-neutral-400 text-sm">{ing.unit || '-'}</div>
                                  <div className="col-span-1 text-right text-neutral-400 text-sm font-mono">
                                    ${Number(ing.cost_price || 0).toFixed(2)}
                                  </div>
                                  <div className="col-span-1 text-right text-white text-sm font-mono">
                                    ${lineCost.toFixed(2)}
                                  </div>
                                  <div className="col-span-2 text-right">
                                    {waste ? (
                                      <span className="text-xs text-red-400 font-mono">
                                        {Number(waste.total_quantity).toFixed(1)} {ing.unit} / ${Number(waste.total_cost).toFixed(0)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-neutral-600">{t('recipe.none')}</span>
                                    )}
                                  </div>
                                  <div className="col-span-2 flex justify-end gap-1">
                                    {ing.inventory_item_id > 0 && (
                                      <button
                                        onClick={() => isWasteFormOpen ? closeWasteForm() : openWasteForm(ing.inventory_item_id)}
                                        className={`p-1.5 rounded transition-colors ${isWasteFormOpen ? 'bg-red-900/30 text-red-400' : 'text-neutral-500 hover:text-orange-400'}`}
                                        title={t('recipe.logWaste')}
                                      >
                                        <Flame size={16} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveIngredient(idx)}
                                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                                      title={t('buttons.remove', { ns: 'common' })}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline waste form */}
                                {isWasteFormOpen && (
                                  <div className="ml-4 bg-red-950/20 border border-red-900/40 rounded-lg p-3 flex flex-wrap items-end gap-3">
                                    <div className="text-xs font-medium text-red-400 w-full mb-1 flex items-center gap-1.5">
                                      <Flame size={14} />
                                      {t('recipe.logWasteFor', { name: ing.ingredient_name })}
                                    </div>
                                    <div className="flex-1 min-w-[100px] max-w-[140px]">
                                      <label className="block text-xs text-neutral-500 mb-1">{t('recipe.quantityUnit', { unit: ing.unit })}</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={wasteQty}
                                        onChange={e => setWasteQty(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono focus:outline-none focus:border-red-500"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="min-w-[130px]">
                                      <label className="block text-xs text-neutral-500 mb-1">{t('recipe.reason')}</label>
                                      <select
                                        value={wasteReason}
                                        onChange={e => setWasteReason(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                                      >
                                        {WASTE_REASONS.map(r => (
                                          <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                      <label className="block text-xs text-neutral-500 mb-1">{t('recipe.notes')}</label>
                                      <input
                                        type="text"
                                        value={wasteNotes}
                                        onChange={e => setWasteNotes(e.target.value)}
                                        placeholder={t('recipe.optionalNotes')}
                                        className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                                      />
                                    </div>
                                    <button
                                      onClick={handleLogWaste}
                                      disabled={wasteSubmitting || !wasteQty || parseFloat(wasteQty) <= 0}
                                      className="px-3 py-1.5 bg-red-600 rounded text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {wasteSubmitting ? t('recipe.logging') : t('recipe.logWaste')}
                                    </button>
                                    <button
                                      onClick={closeWasteForm}
                                      className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* Totals */}
                          <div className="grid grid-cols-12 gap-3 px-2 pt-2 border-t border-neutral-700">
                            <div className="col-span-5 text-sm font-medium text-neutral-300">{t('recipe.totalRecipeCost')}</div>
                            <div className="col-span-5" />
                            <div className="col-span-1 text-right text-white font-mono font-bold text-sm">
                              ${recipeCost(editing.ingredients).toFixed(2)}
                            </div>
                            <div className="col-span-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-lg">{t('recipe.noMatchFilters')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
