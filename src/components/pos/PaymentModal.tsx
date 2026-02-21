import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/currency';

export interface PaymentModalProps {
  orderTotal: number;
  onCardPayment: (tip: number) => void;
  onCashPayment: (tip: number, amountReceived: number) => void;
  onCryptoPayment: (tip: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isOnline: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  orderTotal,
  onCardPayment,
  onCashPayment,
  onCryptoPayment,
  onCancel,
  isProcessing,
  isOnline,
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
        <div className="bg-brand-600 text-white p-6 rounded-t-2xl text-center">
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
                    ? 'bg-brand-600 text-white'
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
                    ? 'bg-brand-600 text-white'
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
                    ? 'bg-brand-600 text-white'
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
                    ? 'bg-brand-600 text-white'
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
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-lg text-white focus:outline-none focus:border-brand-600"
              />
              <button
                onClick={handleCustomTip}
                className="px-4 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-all"
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
            <p className="text-3xl font-bold text-brand-500">
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
              disabled={isProcessing || !isOnline}
              className="w-full py-4 bg-brand-600 text-white text-xl font-bold rounded-lg hover:bg-brand-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-all touch-manipulation"
              title={!isOnline ? t('offline.cardUnavailable') : undefined}
            >
              {!isOnline ? t('offline.cardUnavailable') : isProcessing ? t('payment.processing') : t('payment.payWithCard')}
            </button>
            <button
              onClick={() => onCryptoPayment(tip)}
              disabled={isProcessing || !isOnline}
              className="w-full py-4 bg-orange-600 text-white text-xl font-bold rounded-lg hover:bg-orange-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-all touch-manipulation"
              title={!isOnline ? t('offline.cardUnavailable') : undefined}
            >
              {!isOnline ? t('offline.cardUnavailable') : t('payment.payWithCrypto')}
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

export default PaymentModal;
