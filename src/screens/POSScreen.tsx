import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  getCategories,
  getMenuItems,
  createOrder,
  createPaymentIntent,
  confirmPayment,
  cashPayment,
  getModifierGroupsForItem,
  splitPayment,
  addStampsForOrder,
} from '../api';
import { MenuCategory, MenuItem, CartItem, Order, AISuggestion, LoyaltyCustomer } from '../types';
import RefundModal from '../components/RefundModal';
import { formatPrice, TAX_RATE, TAX_LABEL } from '../utils/currency';
import { formatTime, formatDateTime } from '../utils/dateFormat';
import { useAISuggestions } from '../hooks/useAISuggestions';
import AISuggestionBanner from '../components/AISuggestionBanner';
import ModifierModal from '../components/ModifierModal';
import ComboBuilder from '../components/ComboBuilder';
import SplitPaymentModal from '../components/SplitPaymentModal';
import CryptoPaymentModal from '../components/CryptoPaymentModal';
import CustomerLookupModal from '../components/CustomerLookupModal';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  const { t } = useTranslation('pos');

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md max-h-96 border border-neutral-800">
        <div className="bg-red-600 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">{t('notes.title')}</h2>
          <p className="text-red-100">{item.item_name}</p>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notes.placeholder')}
            className="w-full h-28 bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-700 text-white text-lg font-semibold rounded-lg hover:bg-neutral-600 transition-all"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-all"
            >
              {t('common:buttons.save')}
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
  onCardPayment: (tip: number) => void;
  onCashPayment: (tip: number, amountReceived: number) => void;
  onCryptoPayment: (tip: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  orderTotal,
  onCardPayment,
  onCashPayment,
  onCryptoPayment,
  onCancel,
  isProcessing,
}) => {
  const { t } = useTranslation('pos');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCashInput, setShowCashInput] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');

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
  const receivedNum = parseFloat(amountReceived) || 0;
  const changeDue = Math.max(0, receivedNum - finalTotal);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="bg-red-600 text-white p-6 rounded-t-2xl text-center">
          <h2 className="text-3xl font-bold mb-2">{t('payment.title')}</h2>
          <p className="text-2xl">{t('payment.total', { amount: formatPrice(orderTotal) })}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Tip Selection */}
          <div>
            <p className="text-lg font-semibold text-white mb-3">{t('payment.selectTip')}</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleTipSelect(0)}
                className={`py-3 px-2 text-lg font-bold rounded-lg transition-all ${
                  tip === 0 && !showCustomInput
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {t('payment.noTip')}
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
                {t('common:buttons.ok')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full py-3 bg-neutral-800 text-neutral-300 text-lg font-semibold rounded-lg hover:bg-neutral-700 transition-all"
            >
              {t('payment.customTip')}
            </button>
          )}

          {/* Total Display */}
          <div className="bg-neutral-800 p-4 rounded-lg text-center">
            <p className="text-neutral-400 text-sm mb-1">{t('payment.tipAmount', { amount: formatPrice(tip) })}</p>
            <p className="text-3xl font-bold text-red-500">
              {t('payment.totalWithTip', { amount: formatPrice(finalTotal) })}
            </p>
          </div>

          {/* Cash Amount Received Input */}
          {showCashInput && (
            <div className="bg-neutral-800 p-4 rounded-lg space-y-3">
              <p className="text-lg font-semibold text-white">{t('payment.amountReceived')}</p>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={formatPrice(finalTotal)}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-lg p-3 text-2xl text-white text-center focus:outline-none focus:border-green-500 font-bold"
                autoFocus
              />
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountReceived(String(amt))}
                    className="py-2 bg-neutral-600 text-white font-bold rounded-lg hover:bg-neutral-500 transition-all"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              {receivedNum > 0 && (
                <div className="text-center pt-2 border-t border-neutral-700">
                  <p className="text-neutral-400 text-sm">{t('payment.changeDue')}</p>
                  <p className="text-2xl font-bold text-green-400">{formatPrice(changeDue)}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => onCardPayment(tip)}
              disabled={isProcessing}
              className="w-full py-4 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-700 disabled:bg-neutral-700 transition-all touch-manipulation"
            >
              {isProcessing ? t('payment.processing') : t('payment.payWithCard')}
            </button>
            <button
              onClick={() => onCryptoPayment(tip)}
              disabled={isProcessing}
              className="w-full py-4 bg-orange-600 text-white text-xl font-bold rounded-lg hover:bg-orange-700 disabled:bg-neutral-700 transition-all touch-manipulation"
            >
              {t('payment.payWithCrypto')}
            </button>
            {showCashInput ? (
              <button
                onClick={() => onCashPayment(tip, receivedNum)}
                disabled={isProcessing || receivedNum < finalTotal}
                className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-neutral-700 transition-all touch-manipulation"
              >
                {isProcessing ? t('payment.processing') : t('payment.confirmCash', { change: formatPrice(changeDue) })}
              </button>
            ) : (
              <button
                onClick={() => setShowCashInput(true)}
                disabled={isProcessing}
                className="w-full py-4 bg-neutral-700 text-white text-xl font-bold rounded-lg hover:bg-neutral-600 disabled:bg-neutral-800 transition-all touch-manipulation"
              >
                {t('payment.cashPayment')}
              </button>
            )}
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full py-4 bg-neutral-800 text-neutral-400 text-lg font-bold rounded-lg hover:bg-neutral-700 disabled:bg-neutral-900 transition-all"
            >
              {t('common:buttons.cancel')}
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
  const { t } = useTranslation('pos');

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
            <p className="font-bold text-lg">{t('receipt.orderNumber', { number: order.order_number })}</p>
            <p className="text-neutral-600">
              {formatDateTime(new Date(order.created_at))}
            </p>
            {order.employee_name && (
              <p className="text-neutral-600">{t('receipt.cashier', { name: order.employee_name })}</p>
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
            <div className="flex justify-between font-bold text-lg">
              <p>{t('totals.total')}</p>
              <p>{formatPrice(order.total)}</p>
            </div>
            <div className="flex justify-between text-neutral-500 text-sm">
              <p>{t('receipt.subtotalBeforeTax')}</p>
              <p>{formatPrice(order.subtotal)}</p>
            </div>
            <div className="flex justify-between text-neutral-500 text-sm">
              <p>{t('receipt.taxIncluded', { label: TAX_LABEL })}</p>
              <p>{formatPrice(order.tax)}</p>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between">
                <p>{t('receipt.tip')}</p>
                <p className="font-semibold">{formatPrice(order.tip)}</p>
              </div>
            )}
          </div>

          {order.tip > 0 && (
            <div className="text-center py-3">
              <p className="text-2xl font-bold text-neutral-900">
                {t('receipt.totalWithTip', { amount: formatPrice(order.total + (order.tip || 0)) })}
              </p>
            </div>
          )}

          <div className="text-center py-3 border-t pt-3">
            <p className="text-lg font-bold text-red-600">{t('receipt.thankYou')}</p>
            <p className="text-neutral-600 text-xs mt-2">{t('receipt.comeAgain')}</p>
          </div>
        </div>

        <div className="p-4 space-y-2 border-t">
          <button
            onClick={onPrint}
            className="w-full py-3 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-all"
          >
            {t('receipt.printReceipt')}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all"
          >
            {t('common:buttons.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== Main POS Screen ==================== */

const POSScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentEmployee, logout, hasPermission } = useAuth();
  const { t } = useTranslation('pos');

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
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [itemModifierCache, setItemModifierCache] = useState<Record<number, boolean>>({});
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoOrderId, setCryptoOrderId] = useState<number | null>(null);
  const [cryptoTip, setCryptoTip] = useState(0);
  const [linkedCustomer, setLinkedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);

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
    const item = menuItems.find((mi) => mi.id === suggestion.data.suggested_item_id);
    if (item) {
      addItemToCartDirect(item);
      addToast(t('toast.itemAdded', { name: item.name }), 'success');
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
        addToast(t('toast.failedLoadMenu'), 'error');
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

  // Generate unique cart ID
  const generateCartId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if item has modifier groups (cached)
  const checkItemHasModifiers = async (item: MenuItem): Promise<boolean> => {
    if (itemModifierCache[item.id] !== undefined) return itemModifierCache[item.id];
    try {
      const groups = await getModifierGroupsForItem(item.id);
      const hasModifiers = groups.length > 0;
      setItemModifierCache((prev) => ({ ...prev, [item.id]: hasModifiers }));
      return hasModifiers;
    } catch {
      return false;
    }
  };

  const handleItemTap = async (item: MenuItem) => {
    const hasModifiers = await checkItemHasModifiers(item);
    if (hasModifiers) {
      setModifierItem(item);
    } else {
      addItemToCartDirect(item);
    }
  };

  const addItemToCartDirect = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (ci) => ci.menu_item_id === item.id && !ci.selectedModifierIds?.length && !ci.combo_instance_id
      );
      if (existing) {
        return prev.map((ci) =>
          ci.cart_id === existing.cart_id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          cart_id: generateCartId(),
          menu_item_id: item.id,
          item_name: item.name,
          quantity: 1,
          unit_price: item.price,
          menuItem: item,
        },
      ];
    });
  };

  const addItemWithModifiers = (item: MenuItem, selectedModifiers: number[], notes: string, modifierNames: string[], modifierPriceTotal: number) => {
    setCart((prev) => [
      ...prev,
      {
        cart_id: generateCartId(),
        menu_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.price + modifierPriceTotal,
        menuItem: item,
        notes: notes || undefined,
        selectedModifierIds: selectedModifiers,
        selectedModifierNames: modifierNames,
      },
    ]);
  };

  const handleAddCombo = (items: Array<{ menu_item_id: number; combo_instance_id: string }>, comboPrice: number) => {
    const comboItems: CartItem[] = items.map((ci, idx) => {
      const menuItem = menuItems.find((mi) => mi.id === ci.menu_item_id);
      return {
        cart_id: generateCartId(),
        menu_item_id: ci.menu_item_id,
        item_name: menuItem?.name || `Combo Item ${idx + 1}`,
        quantity: 1,
        unit_price: idx === 0 ? comboPrice : 0,
        menuItem,
        combo_instance_id: ci.combo_instance_id,
      };
    });
    setCart((prev) => [...prev, ...comboItems]);
    setShowComboBuilder(false);
    addToast(t('toast.comboAdded'), 'success');
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => {
      const item = prev.find((ci) => ci.cart_id === cartId);
      if (item?.combo_instance_id) {
        return prev.filter((ci) => ci.combo_instance_id !== item.combo_instance_id);
      }
      return prev.filter((ci) => ci.cart_id !== cartId);
    });
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.cart_id === cartId ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateNotes = (cartId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cart_id === cartId ? { ...item, notes } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setLinkedCustomer(null);
  };

  const handleLoyaltyStamp = async (order: Order) => {
    if (!linkedCustomer) return;
    try {
      const result = await addStampsForOrder(linkedCustomer.id, order.id);
      if (result.cardCompleted) {
        addToast(t('loyalty.cardCompleted', { name: linkedCustomer.name }), 'success');
      } else {
        addToast(
          t('loyalty.stampAdded', { name: linkedCustomer.name, earned: result.stampCard.stamps_earned, required: result.stampCard.stamps_required }),
          'success'
        );
      }
    } catch {
      // Non-blocking: payment already succeeded
    }
    setLinkedCustomer(null);
  };

  const total = parseFloat(
    cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2)
  );
  const tax = parseFloat((total - total / (1 + TAX_RATE)).toFixed(2));
  const subtotal = parseFloat((total - tax).toFixed(2));

  const todayOrderCount = 1;

  const handleCardPayment = async (tip: number) => {
    if (cart.length === 0) {
      addToast(t('toast.cartEmpty'), 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderData = {
        employee_id: currentEmployee!.id,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.selectedModifierIds || [],
          combo_instance_id: item.combo_instance_id || null,
        })),
      };

      const order = await createOrder(orderData);
      const paymentIntent = await createPaymentIntent({ order_id: order.id, tip });
      await confirmPayment({ order_id: order.id, payment_intent_id: paymentIntent.payment_intent_id });

      const finalOrder: Order = {
        ...order,
        tip,
        total: order.total + tip,
        payment_method: 'card',
        employee_name: currentEmployee?.name,
      };

      await handleLoyaltyStamp(order);
      setCompletedOrder(finalOrder);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      clearCart();
      addToast(t('toast.cardDone'), 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.cardFailed');
      addToast(errorMessage, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCashPayment = async (tip: number, amountReceived: number) => {
    if (cart.length === 0) {
      addToast(t('toast.cartEmpty'), 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderData = {
        employee_id: currentEmployee!.id,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.selectedModifierIds || [],
          combo_instance_id: item.combo_instance_id || null,
        })),
      };

      const order = await createOrder(orderData);
      const result = await cashPayment({ order_id: order.id, tip, amount_received: amountReceived });

      const finalOrder: Order = {
        ...order,
        tip,
        total: order.total + tip,
        payment_method: 'cash',
        employee_name: currentEmployee?.name,
      };

      await handleLoyaltyStamp(order);
      setCompletedOrder(finalOrder);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      clearCart();
      addToast(t('toast.cashDone', { change: formatPrice(result.change_due) }), 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.cashFailed');
      addToast(errorMessage, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSplitPayment = async (splits: Array<{ payment_method: 'card' | 'cash'; amount: number; tip: number }>) => {
    if (cart.length === 0) {
      addToast(t('toast.cartEmpty'), 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderData = {
        employee_id: currentEmployee!.id,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.selectedModifierIds || [],
          combo_instance_id: item.combo_instance_id || null,
        })),
      };

      const order = await createOrder(orderData);
      await splitPayment({ order_id: order.id, split_type: 'by_amount', splits });

      const totalTip = splits.reduce((sum, s) => sum + s.tip, 0);
      const finalOrder: Order = {
        ...order,
        tip: totalTip,
        total: order.subtotal + order.tax + totalTip,
        payment_method: 'split',
        employee_name: currentEmployee?.name,
      };

      await handleLoyaltyStamp(order);
      setCompletedOrder(finalOrder);
      setShowSplitPayment(false);
      setShowReceiptModal(true);
      clearCart();
      addToast(t('toast.splitDone'), 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.splitFailed');
      addToast(errorMessage, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCryptoPayment = async (tip: number) => {
    if (cart.length === 0) {
      addToast(t('toast.cartEmpty'), 'error');
      return;
    }

    try {
      const orderData = {
        employee_id: currentEmployee!.id,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.selectedModifierIds || [],
          combo_instance_id: item.combo_instance_id || null,
        })),
      };

      const order = await createOrder(orderData);
      setCryptoOrderId(order.id);
      setCryptoTip(tip);
      setShowPaymentModal(false);
      setShowCryptoModal(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.orderCreateFailed');
      addToast(errorMessage, 'error');
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
          <p className="text-xl font-bold text-white">{t('actions.loadingMenu')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {/* ==================== LEFT SIDEBAR - CATEGORIES ==================== */}
      <div className="w-48 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="bg-neutral-950 p-4 text-center border-b border-neutral-800">
          <img src="/logo.png" alt="Juanberto's" className="h-8 mx-auto mb-1" />
          <p className="font-bold text-xs text-neutral-400 tracking-tight">{t('header.categories')}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className={`w-full py-4 px-4 text-lg font-semibold border-b border-neutral-800 transition-all touch-manipulation ${
              selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {t('header.allItems')}
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSearchQuery(''); }}
              className={`w-full py-4 px-4 text-lg font-semibold border-b border-neutral-800 transition-all touch-manipulation ${
                selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="border-t border-neutral-800 p-3 space-y-2">
          <button
            onClick={() => navigate('/admin')}
            className="w-full py-2 bg-neutral-800 text-neutral-300 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            {t('common:buttons.admin')}
          </button>
          <button
            onClick={() => navigate('/kitchen')}
            className="w-full py-2 bg-neutral-800 text-neutral-300 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            {t('common:buttons.kitchen')}
          </button>
        </div>
      </div>

      {/* ==================== CENTER PANEL - MENU ITEMS ==================== */}
      <div className="flex-1 flex flex-col bg-neutral-950">
        <div className="bg-neutral-900 text-white p-4 border-b border-neutral-800">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <p className="text-xs text-neutral-500">{t('header.operator')}</p>
              <p className="text-lg font-bold text-white">{currentEmployee?.name}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-neutral-500">{t('header.time')}</p>
              <p className="text-lg font-bold text-white">{formatTime(currentTime)}</p>
            </div>
            <div className="text-right flex-1 flex items-center justify-end gap-3">
              <div>
                <p className="text-xs text-neutral-500">{t('header.ordersToday')}</p>
                <p className="text-lg font-bold text-white">{todayOrderCount}</p>
              </div>
              <LanguageSwitcher variant="nav" />
            </div>
          </div>

          <input
            type="text"
            placeholder={t('header.searchItems')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 text-lg"
          />
        </div>

        <AISuggestionBanner
          suggestions={cartSuggestions}
          onAccept={handleAcceptSuggestion}
          onDismiss={dismissSuggestion}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isPush = pushItemIds.has(item.id);
              const isAvoid = avoidItemIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleItemTap(item);
                    if (isAvoid) {
                      addToast(t('cart.lowStockWarning', { name: item.name }), 'info');
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
                    <p className="font-bold text-white text-sm line-clamp-2 flex-1">{item.name}</p>
                    {isPush && <span className="ml-1 flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1" />}
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
              <p className="text-neutral-500 text-lg">{t('cart.noItemsFound')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT SIDEBAR - CART ==================== */}
      <div className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col">
        <div className="bg-red-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{t('cart.orderNumber', { number: '1001' })}</p>
              <p className="text-sm text-red-200">{formatTime(new Date())}</p>
            </div>
          </div>
          {linkedCustomer && (
            <div className="mt-2 flex items-center justify-between bg-red-700/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{linkedCustomer.name}</span>
                {linkedCustomer.activeCard && (
                  <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">
                    {linkedCustomer.activeCard.stamps_earned}/{linkedCustomer.activeCard.stamps_required}
                  </span>
                )}
              </div>
              <button
                onClick={() => setLinkedCustomer(null)}
                className="text-red-200 hover:text-white text-xs font-bold"
              >
                {t('cart.unlink')}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-neutral-500 text-lg">{t('cart.noItems')}</p>
                <p className="text-neutral-600 text-sm mt-2">{t('cart.selectItems')}</p>
              </div>
            </div>
          ) : (
            cart.map((item) => {
              const isComboItem = !!item.combo_instance_id;
              const isFirstComboItem = isComboItem && cart.findIndex(
                (ci) => ci.combo_instance_id === item.combo_instance_id
              ) === cart.indexOf(item);
              const isSubComboItem = isComboItem && !isFirstComboItem;

              return (
                <div
                  key={item.cart_id}
                  className={`rounded-lg p-3 border ${
                    isComboItem
                      ? isFirstComboItem
                        ? 'bg-amber-900/20 border-amber-700'
                        : 'bg-amber-900/10 border-amber-800/50 ml-4'
                      : 'bg-neutral-800 border-neutral-700'
                  }`}
                >
                  {isFirstComboItem && (
                    <p className="text-xs font-bold text-amber-400 mb-1 uppercase tracking-wider">{t('cart.combo')}</p>
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <p className="font-bold text-white">{item.item_name}</p>
                      {item.selectedModifierNames && item.selectedModifierNames.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.selectedModifierNames.map((name, i) => (
                            <p key={i} className="text-xs text-red-400">+ {name}</p>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-xs text-neutral-400 mt-1">{t('cart.note', { note: item.notes })}</p>
                      )}
                    </div>
                    {(!isSubComboItem) && (
                      <button
                        onClick={() => removeFromCart(item.cart_id)}
                        className="text-red-500 hover:text-red-400 font-bold ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {!isSubComboItem && (
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        {!isComboItem && (
                          <>
                            <button
                              onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}
                              className="w-8 h-8 bg-neutral-700 text-white font-bold rounded hover:bg-neutral-600 transition-all"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}
                              className="w-8 h-8 bg-neutral-700 text-white font-bold rounded hover:bg-neutral-600 transition-all"
                            >
                              +
                            </button>
                          </>
                        )}
                      </div>
                      <p className="font-bold text-white">
                        {item.unit_price > 0 ? formatPrice(item.unit_price * item.quantity) : ''}
                      </p>
                    </div>
                  )}

                  {!isComboItem && !item.selectedModifierIds?.length && (
                    <button
                      onClick={() => setNotesItem(item)}
                      className="w-full py-2 text-sm bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-all font-semibold"
                    >
                      {t('cart.addNotes')}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-neutral-800 p-4 space-y-2">
          <div className="border-b border-neutral-700 pb-2 flex justify-between text-xl">
            <span className="font-bold text-white">{t('totals.total')}</span>
            <span className="font-bold text-red-500">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-neutral-500 text-sm">
            <span>{t('totals.subtotalBeforeTax')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-500 text-sm">
            <span>{t('totals.taxIncluded', { label: TAX_LABEL })}</span>
            <span>{formatPrice(tax)}</span>
          </div>
        </div>

        <div className="border-t border-neutral-800 p-4 space-y-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-lg hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed transition-all touch-manipulation"
          >
            {t('totals.charge', { amount: formatPrice(total) })}
          </button>
          <button
            onClick={() => setShowCustomerLookup(true)}
            className={`w-full py-3 text-white text-sm font-bold rounded-lg transition-all touch-manipulation ${
              linkedCustomer ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {linkedCustomer ? t('loyalty.loyaltyCustomer', { name: linkedCustomer.name }) : t('loyalty.loyaltyProgram')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowComboBuilder(true)}
              className="flex-1 py-3 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-all touch-manipulation"
            >
              {t('actions.combos')}
            </button>
            <button
              onClick={() => setShowSplitPayment(true)}
              disabled={cart.length === 0}
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 transition-all touch-manipulation"
            >
              {t('actions.splitPay')}
            </button>
          </div>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="w-full py-3 text-red-500 text-lg font-bold hover:text-red-400 hover:bg-neutral-800 disabled:text-neutral-700 transition-all rounded-lg"
          >
            {t('totals.clearOrder')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-neutral-800 text-neutral-400 text-sm font-bold rounded hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            {t('common:buttons.logout')}
          </button>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {showCustomerLookup && (
        <CustomerLookupModal
          onCustomerLinked={(customer) => {
            setLinkedCustomer(customer);
            setShowCustomerLookup(false);
            addToast(t('loyalty.linked', { name: customer.name }), 'success');
          }}
          onClose={() => setShowCustomerLookup(false)}
        />
      )}

      {notesItem && (
        <NotesModal
          item={notesItem}
          onSave={(notes) => {
            updateNotes(notesItem.cart_id, notes);
            setNotesItem(null);
          }}
          onClose={() => setNotesItem(null)}
        />
      )}

      {modifierItem && (
        <ModifierModal
          item={modifierItem}
          onConfirm={(selectedModifiers, notes) => {
            getModifierGroupsForItem(modifierItem.id).then((groups) => {
              const modNames: string[] = [];
              let modPriceTotal = 0;
              for (const g of groups) {
                for (const mod of g.modifiers || []) {
                  if (selectedModifiers.includes(mod.id)) {
                    modNames.push(mod.name);
                    modPriceTotal += mod.price_adjustment;
                  }
                }
              }
              addItemWithModifiers(modifierItem, selectedModifiers, notes, modNames, modPriceTotal);
              setModifierItem(null);
            });
          }}
          onClose={() => setModifierItem(null)}
        />
      )}

      {showComboBuilder && (
        <ComboBuilder
          onAddCombo={handleAddCombo}
          onClose={() => setShowComboBuilder(false)}
        />
      )}

      {showSplitPayment && (
        <SplitPaymentModal
          orderTotal={total}
          items={cart}
          onSplitPayment={handleSplitPayment}
          onClose={() => setShowSplitPayment(false)}
          isProcessing={isProcessingPayment}
        />
      )}

      {showCryptoModal && cryptoOrderId && (
        <CryptoPaymentModal
          orderId={cryptoOrderId}
          orderTotal={total}
          tip={cryptoTip}
          onSuccess={async () => {
            const finalOrder: Order = {
              id: cryptoOrderId,
              order_number: '',
              employee_id: currentEmployee!.id,
              status: 'preparing',
              subtotal,
              tax,
              tip: cryptoTip,
              total: total + cryptoTip,
              payment_status: 'paid',
              payment_method: 'crypto',
              employee_name: currentEmployee?.name,
              created_at: new Date().toISOString(),
            };
            if (linkedCustomer) {
              try {
                const result = await addStampsForOrder(linkedCustomer.id, cryptoOrderId);
                if (result.cardCompleted) {
                  addToast(t('loyalty.cardCompleted', { name: linkedCustomer.name }), 'success');
                } else {
                  addToast(t('loyalty.stampAdded', { name: linkedCustomer.name, earned: result.stampCard.stamps_earned, required: result.stampCard.stamps_required }), 'success');
                }
              } catch { /* non-blocking */ }
            }
            setCompletedOrder(finalOrder);
            setShowCryptoModal(false);
            setCryptoOrderId(null);
            setShowReceiptModal(true);
            clearCart();
            addToast(t('toast.cryptoDone'), 'success');
          }}
          onCancel={() => {
            setShowCryptoModal(false);
            setCryptoOrderId(null);
          }}
          onExpired={() => {
            setShowCryptoModal(false);
            setCryptoOrderId(null);
            addToast(t('toast.cryptoExpired'), 'error');
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          orderTotal={total}
          onCardPayment={handleCardPayment}
          onCashPayment={handleCashPayment}
          onCryptoPayment={handleCryptoPayment}
          onCancel={() => setShowPaymentModal(false)}
          isProcessing={isProcessingPayment}
        />
      )}

      {showReceiptModal && completedOrder && (
        <ReceiptModal
          order={completedOrder}
          onClose={() => { setShowReceiptModal(false); setCompletedOrder(null); }}
          onPrint={() => { window.print(); }}
        />
      )}

      {showRefundModal && refundOrderId && (
        <RefundModal
          orderId={refundOrderId}
          onClose={() => { setShowRefundModal(false); setRefundOrderId(null); }}
          onRefunded={() => {
            setShowRefundModal(false);
            setRefundOrderId(null);
            addToast(t('toast.refundDone'), 'success');
          }}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg text-white font-semibold shadow-lg pointer-events-auto ${
              toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-neutral-700'
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
