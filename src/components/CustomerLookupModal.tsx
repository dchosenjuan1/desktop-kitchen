import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, UserPlus, Heart, Phone, ArrowLeft } from 'lucide-react';
import { LoyaltyCustomer } from '../types';
import { lookupLoyaltyCustomer, createLoyaltyCustomer } from '../api';

interface CustomerLookupModalProps {
  onCustomerLinked: (customer: LoyaltyCustomer) => void;
  onClose: () => void;
}

type View = 'phone_entry' | 'customer_found' | 'register';

const CustomerLookupModal: React.FC<CustomerLookupModalProps> = ({ onCustomerLinked, onClose }) => {
  const { t } = useTranslation('pos');
  const [view, setView] = useState<View>('phone_entry');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [regSmsOptIn, setRegSmsOptIn] = useState(true);

  const formatPhone = (digits: string) => {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  };

  const handleNumpadPress = (digit: string) => {
    if (phone.length < 10) {
      setPhone((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPhone((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleSearch = async () => {
    if (phone.length < 10) {
      setError(t('customerLookup.enterDigits'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const found = await lookupLoyaltyCustomer(phone);
      setCustomer(found);
      setView('customer_found');
    } catch {
      setView('register');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      setError(t('customerLookup.nameRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const created = await createLoyaltyCustomer({
        phone,
        name: regName.trim(),
        referral_code_used: regReferralCode.trim() || undefined,
        sms_opt_in: regSmsOptIn,
      });
      onCustomerLinked(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('customerLookup.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderStampProgress = (earned: number, required: number) => {
    const stamps = [];
    for (let i = 0; i < required; i++) {
      stamps.push(
        <div
          key={i}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
            i < earned
              ? 'bg-purple-600 border-purple-500'
              : 'bg-neutral-800 border-neutral-600'
          }`}
        >
          {i < earned && <Heart size={14} className="text-white fill-white" />}
        </div>
      );
    }
    return <div className="flex flex-wrap gap-2 justify-center">{stamps}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'phone_entry' && (
              <button
                onClick={() => { setView('phone_entry'); setError(''); }}
                className="p-1 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <Heart size={24} />
            <div>
              <h2 className="text-xl font-bold">{t('customerLookup.loyaltyProgram')}</h2>
              <p className="text-purple-200 text-sm">
                {view === 'phone_entry' && t('customerLookup.enterPhone')}
                {view === 'customer_found' && t('customerLookup.customerFound')}
                {view === 'register' && t('customerLookup.registerNew')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-purple-500 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* ==================== Phone Entry View ==================== */}
          {view === 'phone_entry' && (
            <div className="space-y-4">
              {/* Phone display */}
              <div className="bg-neutral-800 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Phone size={16} className="text-neutral-400" />
                  <span className="text-neutral-400 text-sm">{t('customerLookup.phoneNumber')}</span>
                </div>
                <p className="text-3xl font-bold text-white tracking-wider min-h-[2.5rem]">
                  {phone ? formatPhone(phone) : <span className="text-neutral-600">(##) #### ####</span>}
                </p>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((digit, i) => {
                  if (i === 9) {
                    return (
                      <button
                        key="backspace"
                        onClick={handleBackspace}
                        className="py-4 bg-neutral-800 text-white text-xl font-bold rounded-xl hover:bg-neutral-700 transition-all"
                      >
                        ←
                      </button>
                    );
                  }
                  if (i === 11) {
                    return (
                      <button
                        key="search"
                        onClick={handleSearch}
                        disabled={phone.length < 10 || loading}
                        className="py-4 bg-purple-600 text-white text-xl font-bold rounded-xl hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-600 transition-all"
                      >
                        {loading ? '...' : <Search size={20} className="mx-auto" />}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={digit}
                      onClick={() => handleNumpadPress(digit)}
                      className="py-4 bg-neutral-800 text-white text-2xl font-bold rounded-xl hover:bg-neutral-700 active:bg-neutral-600 transition-all touch-manipulation"
                    >
                      {digit}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSearch}
                disabled={phone.length < 10 || loading}
                className="w-full py-4 bg-purple-600 text-white text-lg font-bold rounded-xl hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-600 transition-all"
              >
                {loading ? t('customerLookup.searching') : t('customerLookup.searchCustomer')}
              </button>
            </div>
          )}

          {/* ==================== Customer Found View ==================== */}
          {view === 'customer_found' && customer && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart size={32} className="text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-white">{customer.name}</h3>
                <p className="text-neutral-400">{formatPhone(customer.phone)}</p>
              </div>

              {/* Stamp Progress */}
              {customer.activeCard && (
                <div className="bg-neutral-800 rounded-xl p-4">
                  <p className="text-sm text-neutral-400 text-center mb-3">
                    {t('customerLookup.stampCard', { earned: customer.activeCard.stamps_earned, required: customer.activeCard.stamps_required })}
                  </p>
                  {renderStampProgress(customer.activeCard.stamps_earned, customer.activeCard.stamps_required)}
                  {customer.activeCard.completed === 1 && !customer.activeCard.redeemed && (
                    <p className="text-green-400 text-center text-sm font-bold mt-3">
                      {t('customerLookup.rewardReady')}
                    </p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{customer.orders_count}</p>
                  <p className="text-xs text-neutral-400">{t('customerLookup.orders')}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{customer.stamps_earned}</p>
                  <p className="text-xs text-neutral-400">{t('customerLookup.totalStamps')}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-lg font-bold text-purple-400">{customer.referral_code}</p>
                  <p className="text-xs text-neutral-400">{t('customerLookup.referral')}</p>
                </div>
              </div>

              <button
                onClick={() => onCustomerLinked(customer)}
                className="w-full py-4 bg-purple-600 text-white text-lg font-bold rounded-xl hover:bg-purple-700 transition-all"
              >
                {t('customerLookup.linkCustomer')}
              </button>
            </div>
          )}

          {/* ==================== Register View ==================== */}
          {view === 'register' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <UserPlus size={32} className="text-purple-500 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm">
                  {t('customerLookup.noCustomerFound', { phone: formatPhone(phone) })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">{t('customerLookup.customerName')}</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={t('customerLookup.fullName')}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">{t('customerLookup.referralCode')}</label>
                <input
                  type="text"
                  value={regReferralCode}
                  onChange={(e) => setRegReferralCode(e.target.value.toUpperCase())}
                  placeholder={t('customerLookup.referralPlaceholder')}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-600"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regSmsOptIn}
                  onChange={(e) => setRegSmsOptIn(e.target.checked)}
                  className="w-5 h-5 rounded bg-neutral-800 border-neutral-700 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-neutral-300">{t('customerLookup.receiveSms')}</span>
              </label>

              <button
                onClick={handleRegister}
                disabled={loading || !regName.trim()}
                className="w-full py-4 bg-purple-600 text-white text-lg font-bold rounded-xl hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-600 transition-all"
              >
                {loading ? t('customerLookup.registering') : t('customerLookup.registerAndLink')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLookupModal;
