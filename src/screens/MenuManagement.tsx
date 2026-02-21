import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Plus,
  Edit2,
  X,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getCategories,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItem,
  createCategory,
  updateCategory,
  toggleCategory,
  getModifierGroups,
  getModifierGroupsForItem,
  assignModifierGroupToItem,
  removeModifierGroupFromItem,
} from '../api';
import { MenuCategory, MenuItem, ModifierGroup } from '../types';
import { invalidateMenuCache } from '../lib/menuCache';
import { formatPrice } from '../utils/currency';

type ModalMode = 'add' | 'edit' | null;
type View = 'items' | 'categories';
type ItemSubTab = 'live' | 'pre-menu';

interface FormData {
  name: string;
  price: string;
  description: string;
  category_id: string;
  image_url: string;
}

interface CategoryFormData {
  name: string;
  sort_order: string;
}

export default function MenuManagement() {
  const { t } = useTranslation('inventory');
  const [view, setView] = useState<View>('items');
  const [itemSubTab, setItemSubTab] = useState<ItemSubTab>('live');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    description: '',
    category_id: '',
    image_url: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Modifier assignment state
  const [allModifierGroups, setAllModifierGroups] = useState<ModifierGroup[]>([]);
  const [assignedGroupIds, setAssignedGroupIds] = useState<Set<number>>(new Set());
  const [modifierLoading, setModifierLoading] = useState(false);

  // Category management state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({ name: '', sort_order: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory && view === 'items') {
      fetchMenuItems(selectedCategory);
    }
  }, [selectedCategory, view]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetchCategories'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (categoryId: number) => {
    try {
      setError(null);
      const data = await getMenuItems(String(categoryId), true);
      setMenuItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetchMenuItems'));
    }
  };

  const liveItems = menuItems.filter(i => i.active);
  const preMenuItems = menuItems.filter(i => !i.active);
  const displayedItems = itemSubTab === 'live' ? liveItems : preMenuItems;

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      errors.name = t('menu.form.itemNameRequired');
    }

    if (!formData.price) {
      errors.price = t('menu.form.priceRequired');
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      errors.price = t('menu.form.pricePositive');
    }

    if (!formData.category_id) {
      errors.category_id = t('menu.form.categoryRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleToggleModifierGroup = async (groupId: number) => {
    const isAssigned = assignedGroupIds.has(groupId);
    const newSet = new Set(assignedGroupIds);

    if (isAssigned) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setAssignedGroupIds(newSet);

    // For existing items (edit mode), call API immediately
    if (editingId) {
      try {
        if (isAssigned) {
          await removeModifierGroupFromItem(editingId, groupId);
        } else {
          await assignModifierGroupToItem(editingId, groupId);
        }
      } catch {
        // Revert on failure
        setAssignedGroupIds(assignedGroupIds);
      }
    }
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;
    setActionLoading(true);
    try {
      setError(null);
      const newItem = await createMenuItem({
        category_id: parseInt(formData.category_id),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
      });
      // Assign selected modifier groups to the new item
      if (assignedGroupIds.size > 0 && newItem?.id) {
        await Promise.all(
          Array.from(assignedGroupIds).map(gId =>
            assignModifierGroupToItem(newItem.id, gId).catch(() => {})
          )
        );
      }
      await invalidateMenuCache();
      // Refresh items for the category the item was added to
      const targetCategory = parseInt(formData.category_id);
      if (targetCategory === selectedCategory) {
        await fetchMenuItems(targetCategory);
      } else {
        setSelectedCategory(targetCategory);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.addItem'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingId) return;
    if (!validateForm()) return;

    setActionLoading(true);
    try {
      setError(null);
      await updateMenuItem(editingId, {
        category_id: parseInt(formData.category_id),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
      });
      await invalidateMenuCache();
      const targetCategory = parseInt(formData.category_id);
      if (selectedCategory) {
        await fetchMenuItems(selectedCategory);
      }
      // If category changed, also refresh the target category
      if (targetCategory !== selectedCategory) {
        setSelectedCategory(targetCategory);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.editItem'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItem = async (id: number) => {
    if (!selectedCategory) return;
    try {
      setError(null);
      await toggleMenuItem(id);
      // Bust SW + IndexedDB caches so POS screen picks up changes
      await invalidateMenuCache();
      await fetchMenuItems(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.toggleItem'));
    }
  };

  const openAddModal = async () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category_id: selectedCategory ? String(selectedCategory) : '',
      image_url: '',
    });
    setFormErrors({});
    setEditingId(null);
    setAssignedGroupIds(new Set());
    setModalMode('add');

    // Fetch modifier groups for assignment after creation
    try {
      const allGroups = await getModifierGroups();
      setAllModifierGroups(allGroups.filter(g => g.active));
    } catch {
      setAllModifierGroups([]);
    }
  };

  const openEditModal = async (item: MenuItem) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      description: item.description || '',
      category_id: String(item.category_id),
      image_url: item.image_url || '',
    });
    setFormErrors({});
    setEditingId(item.id);
    setModalMode('edit');

    // Fetch modifier groups for assignment UI
    setModifierLoading(true);
    try {
      const [allGroups, itemGroups] = await Promise.all([
        getModifierGroups(),
        getModifierGroupsForItem(item.id),
      ]);
      setAllModifierGroups(allGroups.filter(g => g.active));
      setAssignedGroupIds(new Set(itemGroups.map(g => g.id)));
    } catch {
      // Non-critical — modifier section just won't show
      setAllModifierGroups([]);
      setAssignedGroupIds(new Set());
    } finally {
      setModifierLoading(false);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData({ name: '', price: '', description: '', category_id: '', image_url: '' });
    setFormErrors({});
    setAllModifierGroups([]);
    setAssignedGroupIds(new Set());
  };

  const getCategoryName = (id: number | null) => {
    if (!id) return 'Unknown';
    return categories.find((c) => c.id === id)?.name || 'Unknown';
  };

  // Category management handlers
  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) return;
    try {
      setError(null);
      await createCategory({
        name: categoryFormData.name.trim(),
        sort_order: categoryFormData.sort_order ? parseInt(categoryFormData.sort_order) : undefined,
      });
      setCategoryFormData({ name: '', sort_order: '' });
      setShowCategoryForm(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.createCategory'));
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !categoryFormData.name.trim()) return;
    try {
      setError(null);
      await updateCategory(editingCategoryId, {
        name: categoryFormData.name.trim(),
        sort_order: categoryFormData.sort_order ? parseInt(categoryFormData.sort_order) : undefined,
      });
      setEditingCategoryId(null);
      setCategoryFormData({ name: '', sort_order: '' });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.updateCategory'));
    }
  };

  const handleToggleCategory = async (id: number) => {
    try {
      setError(null);
      await toggleCategory(id);
      await invalidateMenuCache();
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.toggleCategory'));
    }
  };

  const startEditCategory = (cat: MenuCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryFormData({ name: cat.name, sort_order: String(cat.sort_order) });
  };

  const handleMoveCategoryOrder = async (cat: MenuCategory, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? cat.sort_order - 1 : cat.sort_order + 1;
    try {
      await updateCategory(cat.id, { sort_order: newOrder });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.reorder'));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-black tracking-tighter">{t('menu.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setView('items')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'items' ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('menu.items')}
              </button>
              <button
                onClick={() => setView('categories')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === 'categories' ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={16} />
                {t('menu.categories')}
              </button>
            </div>
            {view === 'items' && (
              <button
                onClick={openAddModal}
                disabled={!selectedCategory}
                className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
              >
                <Plus size={20} />
                {t('menu.addItem')}
              </button>
            )}
            <img src="/logo.png" alt="Juanberto's" className="h-10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-brand-900/30 border border-brand-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-brand-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-brand-400 hover:text-brand-300"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse"
              ></div>
            ))}
          </div>
        ) : view === 'categories' ? (
          /* ==================== Category Management View ==================== */
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('menu.manageCategories')}</h3>
                <button
                  onClick={() => { setShowCategoryForm(true); setEditingCategoryId(null); setCategoryFormData({ name: '', sort_order: '' }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  <Plus size={18} /> {t('menu.addCategory')}
                </button>
              </div>

              {showCategoryForm && !editingCategoryId && (
                <div className="bg-neutral-800 p-4 rounded-lg mb-4 space-y-3">
                  <div className="flex gap-3">
                    <input
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder={t('menu.categoryForm.namePlaceholder')}
                      className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg p-3 text-white focus:outline-none focus:border-brand-600"
                    />
                    <input
                      type="number"
                      value={categoryFormData.sort_order}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: e.target.value })}
                      placeholder={t('menu.categoryForm.order')}
                      className="w-24 bg-neutral-700 border border-neutral-600 rounded-lg p-3 text-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                      <Check size={18} className="inline mr-1" /> {t('common:buttons.create')}
                    </button>
                    <button onClick={() => setShowCategoryForm(false)} className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600">
                      {t('common:buttons.cancel')}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {categories.map((cat, index) => (
                  <div key={cat.id} className={`p-4 rounded-lg border transition-all ${
                    cat.active ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-800 bg-neutral-900 opacity-60'
                  }`}>
                    {editingCategoryId === cat.id ? (
                      <div className="flex gap-3 items-center">
                        <input
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                          className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-600"
                        />
                        <input
                          type="number"
                          value={categoryFormData.sort_order}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: e.target.value })}
                          placeholder={t('menu.categoryForm.order')}
                          className="w-20 bg-neutral-700 border border-neutral-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-600"
                        />
                        <button onClick={handleUpdateCategory} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          <Check size={18} />
                        </button>
                        <button onClick={() => setEditingCategoryId(null)} className="p-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-500 text-sm font-mono w-8">{cat.sort_order}</span>
                          <span className="text-white font-bold text-lg">{cat.name}</span>
                          {!cat.active && <span className="text-xs text-neutral-500 bg-neutral-700 px-2 py-0.5 rounded">{t('menu.inactive')}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleMoveCategoryOrder(cat, 'up')} disabled={index === 0} className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30">
                            <ChevronUp size={18} />
                          </button>
                          <button onClick={() => handleMoveCategoryOrder(cat, 'down')} disabled={index === categories.length - 1} className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30">
                            <ChevronDown size={18} />
                          </button>
                          <button onClick={() => startEditCategory(cat)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg">
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              cat.active
                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                            }`}
                          >
                            {cat.active ? t('menu.active') : t('menu.inactive')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-neutral-400">{t('menu.noCategoriesYet')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
            <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
            <p className="text-neutral-400 mb-4">{t('menu.noCategories')}</p>
            <button
              onClick={() => setView('categories')}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors inline-flex items-center gap-2"
            >
              <Layers size={20} />
              {t('menu.manageCategories')}
            </button>
          </div>
        ) : (
          /* ==================== Items View ==================== */
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-semibold text-white mb-4">{t('menu.categories')}</h3>
              <div className="flex gap-3 flex-wrap">
                {categories.filter(c => c.active).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                      selectedCategory === category.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Menu / Pre-Menu sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setItemSubTab('live')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  itemSubTab === 'live'
                    ? 'bg-green-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white'
                }`}
              >
                {t('menu.liveMenu')} ({liveItems.length})
              </button>
              <button
                onClick={() => setItemSubTab('pre-menu')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  itemSubTab === 'pre-menu'
                    ? 'bg-amber-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white'
                }`}
              >
                {t('menu.preMenu')} ({preMenuItems.length})
              </button>
            </div>

            {displayedItems.length === 0 ? (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                {itemSubTab === 'live' ? (
                  <>
                    <p className="text-neutral-400 mb-6">
                      {t('menu.noItemsIn')} {getCategoryName(selectedCategory)}
                    </p>
                    <button
                      onClick={openAddModal}
                      className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors inline-flex items-center gap-2 min-h-[44px]"
                    >
                      <Plus size={20} />
                      {t('menu.addFirstItem')}
                    </button>
                  </>
                ) : (
                  <p className="text-neutral-400">{t('menu.noPreMenuItems')}</p>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {getCategoryName(selectedCategory)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-lg border transition-all ${
                        item.active
                          ? 'border-neutral-700 bg-neutral-800'
                          : 'border-neutral-800 bg-neutral-900 opacity-60'
                      }`}
                    >
                      {item.image_url && (
                        <div className="rounded-lg overflow-hidden h-28 bg-neutral-700 mb-3 -mx-5 -mt-5">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="mb-3">
                        <h4 className="font-bold text-white text-lg mb-1">
                          {item.name}
                        </h4>
                        <p className="text-2xl font-bold text-brand-500">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      {item.description && (
                        <p className="text-sm text-neutral-400 mb-4">
                          {item.description}
                        </p>
                      )}

                      <div className="flex gap-2 pt-4 border-t border-neutral-700">
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex-1 px-4 py-2 text-neutral-300 bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-colors font-medium flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <Edit2 size={18} />
                          {t('common:buttons.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium min-h-[44px] ${
                            item.active
                              ? 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 border border-brand-800'
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-800'
                          }`}
                        >
                          {item.active ? t('menu.deactivate') : t('menu.activate')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {modalMode === 'add' ? t('menu.addMenuItem') : t('menu.editMenuItem')}
              </h2>
              <button
                onClick={closeModal}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('menu.form.itemName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t('menu.form.itemNamePlaceholder')}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
                {formErrors.name && (
                  <p className="text-brand-400 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t('menu.form.price')}
                  </label>
                  <div className="flex items-center">
                    <span className="text-neutral-400 font-medium">$</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600 ml-1"
                    />
                  </div>
                  {formErrors.price && (
                    <p className="text-brand-400 text-sm mt-1">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {t('menu.form.category')}
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                  >
                    <option value="">{t('menu.form.selectCategory')}</option>
                    {categories.filter(c => c.active).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category_id && (
                    <p className="text-brand-400 text-sm mt-1">
                      {formErrors.category_id}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('menu.form.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t('menu.form.descriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('menu.form.imageUrl')}
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder={t('menu.form.imageUrlPlaceholder')}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
                {formData.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-neutral-700 h-32 bg-neutral-800">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              {/* Modifier Groups Assignment */}
              {allModifierGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2">
                    <SlidersHorizontal size={16} />
                    {t('menu.form.modifierGroups')}
                  </label>
                  {modifierLoading ? (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 animate-pulse h-16" />
                  ) : (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {allModifierGroups.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-700/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={assignedGroupIds.has(group.id)}
                            onChange={() => handleToggleModifierGroup(group.id)}
                            className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-brand-600 focus:ring-brand-600 focus:ring-offset-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium">{group.name}</span>
                            <span className="text-neutral-500 text-xs ml-2">
                              {group.selection_type === 'single' ? t('modifiers.singleSelectLabel') : t('modifiers.multiSelectLabel')}
                              {' · '}
                              {group.modifiers?.length || 0} {t('modifiers.optionsCount')}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {allModifierGroups.length > 0 && assignedGroupIds.size === 0 && (
                    <p className="text-neutral-500 text-xs mt-1">{t('menu.form.noModifiersHint')}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors font-medium min-h-[44px]"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={modalMode === 'add' ? handleAddItem : handleEditItem}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Check size={20} />
                {actionLoading ? t('menu.form.saving') : modalMode === 'add' ? t('menu.addItem') : t('menu.form.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
