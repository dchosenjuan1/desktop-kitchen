import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, FileX } from 'lucide-react';
import { CfdiInvoice } from '../../types';
import { formatPrice } from '../../utils/currency';

interface CancellationModalProps {
  invoice: CfdiInvoice;
  onCancel: (motive: string, substituteUUID?: string) => void;
  onClose: () => void;
}

interface CancellationMotive {
  code: string;
  label: string;
  requiresSubstitute: boolean;
}

const MOTIVE_CODES = ['01', '02', '03', '04'] as const;
const MOTIVE_REQUIRES_SUBSTITUTE: Record<string, boolean> = {
  '01': true,
  '02': false,
  '03': false,
  '04': false,
};

const CancellationModal: React.FC<CancellationModalProps> = ({ invoice, onCancel, onClose }) => {
  const { t } = useTranslation('admin');
  const [selectedMotive, setSelectedMotive] = useState('');
  const [substituteUUID, setSubstituteUUID] = useState('');

  const requiresSubstitute = MOTIVE_REQUIRES_SUBSTITUTE[selectedMotive] ?? false;

  const isFormValid =
    selectedMotive.length > 0 &&
    (!requiresSubstitute || substituteUUID.trim().length >= 32);

  const handleConfirm = () => {
    if (!isFormValid) return;
    onCancel(
      selectedMotive,
      requiresSubstitute ? substituteUUID.trim() : undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <FileX className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">{t('cfdi.cancelInvoice')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Invoice details */}
          <div className="bg-neutral-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">{t('cfdi.folio')}</span>
              <span className="text-white font-medium">{invoice.series}{invoice.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">{t('cfdi.recipientRfc')}</span>
              <span className="text-white font-medium">{invoice.receptor_rfc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">{t('cfdi.recipient')}</span>
              <span className="text-white font-medium truncate ml-4">{invoice.receptor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">{t('cfdi.total')}</span>
              <span className="text-white font-bold">{formatPrice(invoice.total)}</span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-1">UUID Fiscal</span>
              <span className="text-brand-400 font-mono text-xs break-all">{invoice.uuid_fiscal}</span>
            </div>
          </div>

          {/* SAT Motive dropdown */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              {t('cfdi.cancellationReason')}
            </label>
            <select
              value={selectedMotive}
              onChange={(e) => {
                setSelectedMotive(e.target.value);
                if (e.target.value !== '01') setSubstituteUUID('');
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 appearance-none"
            >
              <option value="" className="bg-neutral-800">{t('cfdi.selectReason')}</option>
              {MOTIVE_CODES.map((code) => (
                <option key={code} value={code} className="bg-neutral-800">
                  {code} - {t(`cfdi.motives.${code}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Substitute UUID (only for motive 01) */}
          {requiresSubstitute && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                {t('cfdi.substituteUuid')}
              </label>
              <input
                type="text"
                value={substituteUUID}
                onChange={(e) => setSubstituteUUID(e.target.value.trim())}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {t('cfdi.substituteUuidHint')}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2 bg-amber-900/20 border border-amber-800 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs leading-relaxed">
              {t('cfdi.cancellationWarning')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 transition-colors"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isFormValid}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('cfdi.confirmCancellation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;
