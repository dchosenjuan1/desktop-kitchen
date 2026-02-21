import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import {
  getCryptoEstimate,
  createCryptoPayment,
  getCryptoPaymentStatus,
} from '../api';
import { CryptoPaymentStatus } from '../types';
import { formatPrice } from '../utils/currency';

interface CryptoPaymentModalProps {
  orderId: number;
  orderTotal: number;
  tip: number;
  onSuccess: () => void;
  onCancel: () => void;
  onExpired: () => void;
}

const CURRENCIES = [
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC' },
  { id: 'eth', label: 'Ethereum', symbol: 'ETH' },
  { id: 'usdttrc20', label: 'Tether', symbol: 'USDT' },
  { id: 'usdcerc20', label: 'USD Coin', symbol: 'USDC' },
];

const CryptoPaymentModal: React.FC<CryptoPaymentModalProps> = ({
  orderId,
  orderTotal,
  tip,
  onSuccess,
  onCancel,
  onExpired,
}) => {
  const { t } = useTranslation('pos');
  const [step, setStep] = useState<'select' | 'pay'>('select');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payAddress, setPayAddress] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payCurrency, setPayCurrency] = useState<string | null>(null);
  const [status, setStatus] = useState<CryptoPaymentStatus>('waiting');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalWithTip = orderTotal + tip;

  // Fetch estimate when currency selected
  useEffect(() => {
    if (!selectedCurrency) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setEstimateLoading(true);
    getCryptoEstimate(totalWithTip, selectedCurrency)
      .then((data) => {
        if (!cancelled) setEstimate(data.estimated_amount);
      })
      .catch(() => {
        if (!cancelled) setEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setEstimateLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCurrency, totalWithTip]);

  // Poll for status once payment is created
  useEffect(() => {
    if (!paymentId || step !== 'pay') return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getCryptoPaymentStatus(paymentId);
        setStatus(data.status);

        if (data.status === 'confirmed' || data.status === 'finished') {
          if (pollRef.current) clearInterval(pollRef.current);
          // Brief delay to show success state
          setTimeout(onSuccess, 1500);
        } else if (data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(onExpired, 2000);
        } else if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Polling error — keep trying
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, step, onSuccess, onExpired]);

  const handleCreatePayment = async () => {
    if (!selectedCurrency) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createCryptoPayment({
        order_id: orderId,
        pay_currency: selectedCurrency,
        tip,
      });
      setPaymentId(String(result.nowpayments_payment_id));
      setPayAddress(result.pay_address);
      setPayAmount(result.pay_amount);
      setPayCurrency(result.pay_currency);
      setStatus((result.status as CryptoPaymentStatus) || 'waiting');
      setStep('pay');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  const currencyLabel = CURRENCIES.find((c) => c.id === selectedCurrency);
  const isTerminal = status === 'confirmed' || status === 'finished' || status === 'expired' || status === 'failed';

  const statusDisplay: Record<string, { label: string; color: string }> = {
    waiting: { label: t('crypto.waitingPayment'), color: 'text-yellow-400' },
    confirming: { label: t('crypto.confirmingBlockchain'), color: 'text-blue-400' },
    confirmed: { label: t('crypto.paymentConfirmed'), color: 'text-green-400' },
    sending: { label: t('crypto.sending'), color: 'text-blue-400' },
    partially_paid: { label: t('crypto.partiallyPaid'), color: 'text-orange-400' },
    finished: { label: t('crypto.paymentComplete'), color: 'text-green-400' },
    failed: { label: t('crypto.paymentFailed'), color: 'text-brand-400' },
    expired: { label: t('crypto.paymentExpired'), color: 'text-brand-400' },
    refunded: { label: t('crypto.refunded'), color: 'text-neutral-400' },
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-orange-600 text-white p-6 rounded-t-2xl text-center">
          <h2 className="text-2xl font-bold mb-1">
            {step === 'select' ? t('crypto.payWithCrypto') : t('crypto.scanToPay')}
          </h2>
          <p className="text-lg">{formatPrice(totalWithTip)} MXN</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Currency Selection */}
          {step === 'select' && (
            <>
              <p className="text-neutral-400 text-center">{t('crypto.selectCrypto')}</p>
              <div className="grid grid-cols-2 gap-3">
                {CURRENCIES.map((cur) => (
                  <button
                    key={cur.id}
                    onClick={() => setSelectedCurrency(cur.id)}
                    className={`p-4 rounded-lg border-2 text-center font-bold transition-all ${
                      selectedCurrency === cur.id
                        ? 'border-orange-500 bg-orange-600/20 text-white'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <p className="text-lg">{cur.symbol}</p>
                    <p className="text-xs text-neutral-400">{cur.label}</p>
                  </button>
                ))}
              </div>

              {/* Estimate */}
              {selectedCurrency && (
                <div className="bg-neutral-800 p-4 rounded-lg text-center">
                  {estimateLoading ? (
                    <p className="text-neutral-400">{t('crypto.calculatingEstimate')}</p>
                  ) : estimate ? (
                    <p className="text-white">
                      <span className="text-neutral-400">{t('crypto.estimated')} </span>
                      <span className="text-xl font-bold text-orange-400">
                        {estimate} {currencyLabel?.symbol}
                      </span>
                    </p>
                  ) : (
                    <p className="text-neutral-500">{t('crypto.couldNotEstimate')}</p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-brand-400 text-center text-sm">{error}</p>
              )}

              <button
                onClick={handleCreatePayment}
                disabled={!selectedCurrency || creating}
                className="w-full py-4 bg-orange-600 text-white text-xl font-bold rounded-lg hover:bg-orange-700 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all"
              >
                {creating ? t('crypto.creatingPayment') : t('crypto.payWith', { symbol: currencyLabel?.symbol || 'Crypto' })}
              </button>

              <button
                onClick={onCancel}
                className="w-full py-3 bg-neutral-800 text-neutral-400 text-lg font-bold rounded-lg hover:bg-neutral-700 transition-all"
              >
                {t('common:buttons.cancel')}
              </button>
            </>
          )}

          {/* Step 2: QR Code + Polling */}
          {step === 'pay' && payAddress && (
            <>
              {/* Status */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {!isTerminal && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                  )}
                  <p className={`text-lg font-bold ${statusDisplay[status]?.color || 'text-neutral-400'}`}>
                    {statusDisplay[status]?.label || status}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              {(status === 'waiting' || status === 'confirming' || status === 'partially_paid') && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={payAddress} size={200} />
                  </div>
                </div>
              )}

              {/* Success icon */}
              {(status === 'confirmed' || status === 'finished') && (
                <div className="flex justify-center">
                  <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Payment details */}
              <div className="bg-neutral-800 p-4 rounded-lg space-y-3">
                <div className="text-center">
                  <p className="text-neutral-400 text-sm">{t('crypto.sendExactly')}</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {payAmount} {payCurrency?.toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-400 text-xs mb-1">{t('crypto.toAddress')}</p>
                  <p className="text-white text-xs font-mono bg-neutral-700 p-2 rounded break-all select-all cursor-text">
                    {payAddress}
                  </p>
                </div>
              </div>

              {/* Cancel / Close */}
              {!isTerminal && (
                <button
                  onClick={onCancel}
                  className="w-full py-3 bg-neutral-800 text-neutral-400 text-lg font-bold rounded-lg hover:bg-neutral-700 transition-all"
                >
                  {t('common:buttons.cancel')}
                </button>
              )}

              {(status === 'failed' || status === 'expired') && (
                <button
                  onClick={status === 'expired' ? onExpired : onCancel}
                  className="w-full py-3 bg-brand-600 text-white text-lg font-bold rounded-lg hover:bg-brand-700 transition-all"
                >
                  {t('crypto.close')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoPaymentModal;
