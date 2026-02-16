import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCategories,
  getMenuItems,
  createOrder,
  createPaymentIntent,
  confirmPayment,
} from '../api';
import { MenuCategory, MenuItem, CartItem, Order, AISuggestion } from '../types';
import { formatPrice, TAX_RATE, TAX_LABEL } from '../utils/currency';
import { useAISuggestions } from '../hooks/useAISuggestions';
import AISuggestionBanner from '../components/AISuggestionBanner';

/* ==================== Toast Notification ==================== */

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/* ==================== Notes Modal ==================== */

interface NotesModalProps {
  item: CartItem;
  onSave: (notes: string) => void;
  onClose: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ item, onSave, onClose }) => {
  const [notes, setNotes] = useState(item.notes || '');

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md max-h-96 border border-neutral-800">
        <div className="bg-red-600 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Special Instructions</h2>
          <p className="text-red-100">{item.item_name}</p>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., No onions, extra sauce, light cheese..."
            className="w-full h-28 bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-700 text-white text-lg font-semibold rounded-lg hover:bg-neutral-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== Payment Modal ==================== */

interface PaymentModalProps {
  orderTotal: number;
  onPaymentComplete: (tip: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  orderTotal,
  onPaymentComplete,
  onCancel,
  isProcessing,
}) => {
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleTipSelect = (percentage: number) => {
    const tipAmount = Math.round((orderTotal * percentage) / 100 * 100) / 100;
    setTip(tipAmount);
    setShowCustomInput(false);
  };

  const handleCustomTip = () => {
    const customAmount = parseFloat(customTip) || 0;
    setTip(customAmount);
    setShowCustomInput(false);
  };

  const finalTotal = orderTotal + tip;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-800">
        <div className="bg-red-600 text-white p-6 rounded-t-2xl text-center">
          <h2 className="text-3xl font-bold mb-2">Payment</h2>
          <p className="text-2xl">Subtotal: {formatPrice(orderTotal)}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Tip Selection */}
          <div>
            <p className="text-lg font-semibold text-white mb-3">Select Tip:</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleTipSelect(0)}
                className={`py-3 px-2 text-lg font-bold rounded-lg transition-all ${
                  tip === 0 && !showCustomInput
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                No Tip
              </button>
              <button
                onClick={() => handleTipSelect(15)}
                className={`py-3 px-2 text-lg font-bold rounded-lg transition-all ${
                  tip === Math.round((orderTotal * 15) / 100 * 100) / 100 &&
                  !showCustomInput
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                15%
              </button>
              <button
                onClick={() => handleTipSelect(18)}
                className={`py-3 px-2 text-lg font-bold rounded-lg transition-all ${
                  tip === Math.round((orderTotal * 18) / 100 * 100) / 100 &&
                  !showCustomInput
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                18%
              </button>
              <button
                onClick={() => handleTipSelect(20)}
                className={`py-3 px-2 text-lg font-bold rounded-lg transition-all ${
                  tip === Math.round((orderTotal * 20) / 100 * 100) / 100 &&
                  !showCustomInput
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                20%
              </button>
            </div>
          </div>

          {/* Custom Tip */}
          {showCustomInput ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="$0.00"
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-lg text-white focus:outline-none focus:border-red-600"
              />
              <button
                onClick={handleCustomTip}
                className="px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full py-3 bg-neutral-800 text-neutral-300 text-lg font-semibold rounded-lg hover:bg-neutral-700 transition-all"
            >
              Custom Tip
            </button>
          )}

          {/* Total Display */}
          <div className="bg-neutral-800 p-4 rounded-lg text-center">
            <p className="text-neutral-400 text-sm mb-1">Tip Amount: {formatPrice(tip)}</p>
            <p className="text-3xl font-bold text-red-500">
              Total: {formatPrice(finalTotal)}
            </p>
          </div>

          {/* Payment Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => onPaymentComplete(tip)}
              disabled={isProcessing}
              className="w-full py-4 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-700 disabled:bg-neutral-700 transition-all touch-manipulation"
            >
              {isProcessing ? 'Processing...' : 'Pay with Card'}
            </button>
            <button
              onClick={() => onPaymentComplete(tip)}
              disabled={isProcessing}
              className="w-full py-4 bg-neutral-700 text-white text-xl font-bold rounded-lg hover:bg-neutral-600 disabled:bg-neutral-800 transition-all touch-manipulation"
            >
              Cash Payment
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full py-4 bg-neutral-800 text-neutral-400 text-lg font-bold rounded-lg hover:bg-neutral-700 disabled:bg-neutral-900 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== Receipt Modal ==================== */

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
  onPrint: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, onPrint }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-96 overflow-auto">
        <div className="p-6 text-center border-b-2 border-gray-300">
          <img src="/logo.png" alt="Juanberto's" className="h-12 mx-auto mb-2" />
          <h2 className="text-2xl font-black tracking-tighter text-neutral-900 mb-1">Juanberto's</h2>
          <p className="text-neutral-600">California Burritos</p>
          <p className="text-sm text-neutral-500 mt-2">
            123 Main Street, San Francisco, CA 94102
          </p>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="text-center border-b pb-3">
            <p className="font-bold text-lg">Order #{order.order_number}</p>
            <p className="text-neutral-600">
              {new Date(order.created_at).toLocaleString()}
            </p>
            {order.employee_name && (
              <p className="text-neutral-600">Cashier: {order.employee_name}</p>
            )}
          </div>

          <div className="space-y-2 border-b pb-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{item.item_name}</p>
                  {item.notes && (
                    <p className="text-neutral-600 text-xs">{item.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p>{item.quantity}x {formatPrice(item.unit_price)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-b pb-3">
            <div className="flex justify-between">
              <p>Subtotal:</p>
              <p className="font-semibold">{formatPrice(order.subtotal)}</p>
            </div>
            <div className="flex justify-between">
              <p>{TAX_LABEL}:</p>
              <p className="font-semibold">{formatPrice(order.tax)}</p>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between">
                <p>Tip:</p>
                <p className="font-semibold">{formatPrice(order.tip)}</p>
              </div>
            )}
          </div>

          <div className="text-center py-3">
            <p className="text-2xl font-bold text-neutral-900">
              Total: {formatPrice(order.total)}
            </p>
          </div>

          <div className="text-center py-3 border-t pt-3">
            <p className="text-lg font-bold text-red-600">Thank You!</p>
            <p className="text-neutral-600 text-xs mt-2">Please come again</p>
          </div>
        </div>

        <div className="p-4 space-y-2 border-t">
          <button
            onClick={onPrint}
            className="w-full py-3 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-all"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== Main POS Screen ==================== */

const POSScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentEmployee, logout } = useAuth();

  // State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notesItem, setNotesItem] = useState<CartItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // AI Suggestions
  const cartItemIds = useMemo(() => cart.map((c) => c.menu_item_id), [cart]);
  const {
    cartSuggestions,
    pushItemIds,
    avoidItemIds,
    acceptSuggestion,
    dismissSuggestion,
  } = useAISuggestions({
    cartItemIds,
    employeeId: currentEmployee?.id,
    enabled: true,
  });

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    // Add the suggested item to cart
    const item = menuItems.find((mi) => mi.id === suggestion.data.suggested_item_id);
    if (item) {
      addItemToCart(item);
      addToast(`Added ${item.name}`, 'success');
    }
    acceptSuggestion(suggestion);
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categoriesData, itemsData] = await Promise.all([
          getCategories(),
          getMenuItems(),
        ]);
        setCategories(categoriesData);
        setMenuItems(itemsData);
      } catch (error) {
        addToast('Failed to load menu', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper Functions
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Filter items based on category and search
  const filteredItems = useMemo(() => {
    let items = menuItems;

    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart Operations
  const addItemToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menu_item_id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menu_item_id === item.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.name,
          quantity: 1,
          unit_price: item.price,
          menuItem: item,
        },
      ];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev) => prev.filter((item) => item.menu_item_id !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.menu_item_id === menuItemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateNotes = (menuItemId: number, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menu_item_id === menuItemId ? { ...item, notes } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = parseFloat(
    cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2)
  );
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = subtotal + tax;

  const todayOrderCount = 1;

  // Handle Payment
  const handlePayment = async (tip: number) => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderData = {
        employee_id: currentEmployee!.id,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes,
        })),
      };

      const order = await createOrder(orderData);

      const paymentIntent = await createPaymentIntent({
        order_id: order.id,
        tip,
      });

      await confirmPayment({
        order_id: order.id,
        payment_intent_id: paymentIntent.payment_intent_id,
      });

      const finalOrder: Order = {
        ...order,
        tip,
        total: order.subtotal + order.tax + tip,
        employee_name: currentEmployee?.name,
      };

      setCompletedOrder(finalOrder);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      clearCart();
      addToast('Order completed successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      addToast(errorMessage, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Juanberto's" className="h-16 mx-auto mb-4" />
          <p className="text-xl font-bold text-white">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {/* ==================== LEFT SIDEBAR - CATEGORIES ==================== */}
      <div className="w-48 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        {/* Logo Header */}
        <div className="bg-neutral-950 p-4 text-center border-b border-neutral-800">
          <img src="/logo.png" alt="Juanberto's" className="h-8 mx-auto mb-1" />
          <p className="font-bold text-xs text-neutral-400 tracking-tight">Categories</p>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className={`w-full py-4 px-4 text-lg font-semibold border-b border-neutral-800 transition-all touch-manipulation ${
              selectedCategory === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            All Items
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery('');
              }}
              className={`w-full py-4 px-4 text-lg font-semibold border-b border-neutral-800 transition-all touch-manipulation ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 p-3 space-y-2">
          <button
            onClick={() => navigate('/admin')}
            className="w-full py-2 bg-neutral-800 text-neutral-300 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            Admin
          </button>
          <button
            onClick={() => navigate('/kitchen')}
            className="w-full py-2 bg-neutral-800 text-neutral-300 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            Kitchen
          </button>
        </div>
      </div>

      {/* ==================== CENTER PANEL - MENU ITEMS ==================== */}
      <div className="flex-1 flex flex-col bg-neutral-950">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-4 border-b border-neutral-800">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <p className="text-xs text-neutral-500">Operator</p>
              <p className="text-lg font-bold text-white">{currentEmployee?.name}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-neutral-500">Time</p>
              <p className="text-lg font-bold text-white">{currentTime.toLocaleTimeString()}</p>
            </div>
            <div className="text-right flex-1">
              <p className="text-xs text-neutral-500">Orders Today</p>
              <p className="text-lg font-bold text-white">{todayOrderCount}</p>
            </div>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 text-lg"
          />
        </div>

        {/* AI Suggestion Banner */}
        <AISuggestionBanner
          suggestions={cartSuggestions}
          onAccept={handleAcceptSuggestion}
          onDismiss={dismissSuggestion}
        />

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isPush = pushItemIds.has(item.id);
              const isAvoid = avoidItemIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    addItemToCart(item);
                    if (isAvoid) {
                      addToast(`Warning: ${item.name} uses a low-stock ingredient`, 'info');
                    }
                  }}
                  className={`rounded-lg p-4 hover:shadow-lg active:scale-95 transition-all touch-manipulation flex flex-col h-32 ${
                    isPush
                      ? 'bg-neutral-900 border-2 border-green-600 ring-1 ring-green-600/30'
                      : isAvoid
                        ? 'bg-neutral-900/60 border border-neutral-700 opacity-60'
                        : 'bg-neutral-900 border border-neutral-800 hover:border-red-600'
                  }`}
                >
                  <div className="flex items-start justify-between flex-1">
                    <p className="font-bold text-white text-sm line-clamp-2 flex-1">
                      {item.name}
                    </p>
                    {isPush && (
                      <span className="ml-1 flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1" />
                    )}
                  </div>
                  <p className={`font-bold text-lg mt-2 ${isAvoid ? 'text-neutral-500' : 'text-red-500'}`}>
                    {formatPrice(item.price)}
                  </p>
                </button>
              );
            })}
          </div>
          {filteredItems.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500 text-lg">No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT SIDEBAR - CART ==================== */}
      <div className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-4">
          <p className="text-xl font-bold">Order #1001</p>
          <p className="text-sm text-red-200">
            {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-neutral-500 text-lg">No items in cart</p>
                <p className="text-neutral-600 text-sm mt-2">
                  Select items from the menu
                </p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menu_item_id}
                className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-white">{item.item_name}</p>
                    {item.notes && (
                      <p className="text-xs text-neutral-400 mt-1">Note: {item.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.menu_item_id)}
                    className="text-red-500 hover:text-red-400 font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="w-8 h-8 bg-neutral-700 text-white font-bold rounded hover:bg-neutral-600 transition-all"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-8 h-8 bg-neutral-700 text-white font-bold rounded hover:bg-neutral-600 transition-all"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-bold text-white">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                </div>

                <button
                  onClick={() => setNotesItem(item)}
                  className="w-full py-2 text-sm bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-all font-semibold"
                >
                  Add Notes
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-neutral-800 p-4 space-y-2">
          <div className="flex justify-between text-neutral-300">
            <span>Subtotal:</span>
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-300">
            <span>{TAX_LABEL}:</span>
            <span className="font-bold">{formatPrice(tax)}</span>
          </div>
          <div className="border-t border-neutral-700 pt-2 flex justify-between text-xl">
            <span className="font-bold text-white">Total:</span>
            <span className="font-bold text-red-500">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-neutral-800 p-4 space-y-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-lg hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed transition-all touch-manipulation"
          >
            Charge {formatPrice(total)}
          </button>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="w-full py-3 text-red-500 text-lg font-bold hover:text-red-400 hover:bg-neutral-800 disabled:text-neutral-700 transition-all rounded-lg"
          >
            Clear Order
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-neutral-800 text-neutral-400 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {notesItem && (
        <NotesModal
          item={notesItem}
          onSave={(notes) => {
            updateNotes(notesItem.menu_item_id, notes);
            setNotesItem(null);
          }}
          onClose={() => setNotesItem(null)}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          orderTotal={total}
          onPaymentComplete={handlePayment}
          onCancel={() => setShowPaymentModal(false)}
          isProcessing={isProcessingPayment}
        />
      )}

      {showReceiptModal && completedOrder && (
        <ReceiptModal
          order={completedOrder}
          onClose={() => {
            setShowReceiptModal(false);
            setCompletedOrder(null);
          }}
          onPrint={() => {
            window.print();
          }}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg text-white font-semibold shadow-lg pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-green-600'
                : toast.type === 'error'
                  ? 'bg-red-600'
                  : 'bg-neutral-700'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default POSScreen;
