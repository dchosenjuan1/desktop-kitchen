import React from 'react';
import { useTranslation } from 'react-i18next';
import { Order } from '../../types';
import { formatPrice, TAX_LABEL } from '../../utils/currency';
import { formatDateTime } from '../../utils/dateFormat';

export interface ReceiptModalProps {
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
            {String(order.order_number).startsWith('OFF-') && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                OFFLINE
              </span>
            )}
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
            <p className="text-lg font-bold text-brand-600">{t('receipt.thankYou')}</p>
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
            className="w-full py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-all"
          >
            {t('common:buttons.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
