import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit2,
  X,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  getCategories,
  getMenuItems,
  toggleMenuItem,
} from '../api';
import { MenuCategory, MenuItem } from '../types';
import { formatPrice } from '../utils/currency';

type ModalMode = 'add' | 'edit' | null;

interface FormData {
  name: string;
  price: string;
  description: string;
  category_id: string;
}

export default function MenuManagement() {
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
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchMenuItems(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (categoryId: number) => {
    try {
      setError(null);
      const data = await getMenuItems(String(categoryId));
      setMenuItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
    }

    if (!formData.price) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      errors.price = 'Price must be a valid number';
    }

    if (!formData.category_id) {
      errors.category_id = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;
    if (!selectedCategory) return;
    setActionLoading(true);
    try {
      setError(null);
      await fetchMenuItems(selectedCategory);
      setModalMode(null);
      setFormData({ name: '', price: '', description: '', category_id: '' });
      setFormErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingId) return;
    if (!validateForm()) return;
    if (!selectedCategory) return;

    setActionLoading(true);
    try {
      setError(null);
      await fetchMenuItems(selectedCategory);
      setModalMode(null);
      setEditingId(null);
      setFormData({ name: '', price: '', description: '', category_id: '' });
      setFormErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItem = async (id: number) => {
    if (!selectedCategory) return;
    try {
      setError(null);
      await toggleMenuItem(id);
      await fetchMenuItems(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle item');
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category_id: selectedCategory ? String(selectedCategory) : '',
    });
    setFormErrors({});
    setEditingId(null);
    setModalMode('add');
  };

  const openEditModal = (item: MenuItem) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      description: item.description || '',
      category_id: String(item.category_id),
    });
    setFormErrors({});
    setEditingId(item.id);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData({
      name: '',
      price: '',
      description: '',
      category_id: '',
    });
    setFormErrors({});
  };

  const getCategoryName = (id: number | null) => {
    if (!id) return 'Unknown';
    return categories.find((c) => c.id === id)?.name || 'Unknown';
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
            <img src="/logo.png" alt="Juanberto's" className="h-8" />
            <h1 className="text-3xl font-black tracking-tighter">Menu</h1>
          </div>
          <button
            onClick={openAddModal}
            disabled={!selectedCategory}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Plus size={20} />
            Add Item
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
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
        ) : categories.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
            <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
            <p className="text-neutral-400">No categories available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
              <div className="flex gap-3 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                      selectedCategory === category.id
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {menuItems.length === 0 ? (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                <p className="text-neutral-400 mb-6">
                  No items in {getCategoryName(selectedCategory)}
                </p>
                <button
                  onClick={openAddModal}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <Plus size={20} />
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {getCategoryName(selectedCategory)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-lg border transition-all ${
                        item.active
                          ? 'border-neutral-700 bg-neutral-800'
                          : 'border-neutral-800 bg-neutral-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-lg mb-1">
                            {item.name}
                          </h4>
                          <p className="text-2xl font-bold text-red-500">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            item.active
                              ? 'text-green-400 hover:bg-green-900/30'
                              : 'text-neutral-500 hover:bg-neutral-700'
                          }`}
                        >
                          {item.active ? (
                            <ToggleRight size={24} />
                          ) : (
                            <ToggleLeft size={24} />
                          )}
                        </button>
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
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium min-h-[44px] ${
                            item.active
                              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-800'
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-800'
                          }`}
                        >
                          {item.active ? 'Deactivate' : 'Activate'}
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

      {modalMode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {modalMode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
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
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Carne Asada Burrito"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                {formErrors.name && (
                  <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Price
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
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 ml-1"
                    />
                  </div>
                  {formErrors.price && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category_id && (
                    <p className="text-red-400 text-sm mt-1">
                      {formErrors.category_id}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Item description"
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors font-medium min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={modalMode === 'add' ? handleAddItem : handleEditItem}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Check size={20} />
                {modalMode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
