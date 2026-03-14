import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, Eye, Unlink, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BANK_LOGOS = [
  { name: 'BBVA', color: '#004481' },
  { name: 'Santander', color: '#EC0000' },
  { name: 'Banamex', color: '#006BA6' },
  { name: 'Banorte', color: '#E30613' },
  { name: 'Chase', color: '#117ACA' },
  { name: 'Bank of America', color: '#012169' },
  { name: 'Wells Fargo', color: '#D71E28' },
];

const SecurityInfoModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('admin');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 rounded-2xl border border-neutral-800 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <Shield size={20} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{t('banking.securityTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Points */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Eye size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('banking.readOnlyAccess')}</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  {t('banking.readOnlyDesc')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={16} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('banking.credentialsPrivate')}</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  {t('banking.credentialsPrivateDesc')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Unlink size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('banking.disconnectAnytime')}</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  {t('banking.disconnectAnytimeDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Provider */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{t('banking.poweredBy')}</p>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-neutral-800 rounded-lg">
                <span className="text-white font-bold text-sm">Plaid</span>
              </div>
              <p className="text-neutral-400 text-sm">
                {t('banking.plaidDesc')}
              </p>
            </div>
            <p className="text-neutral-500 text-xs mt-2">
              {t('banking.plaidDetails')}
            </p>
          </div>

          {/* Supported Banks */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">{t('banking.supportedBanks')}</p>
            <div className="flex flex-wrap gap-2">
              {BANK_LOGOS.map(bank => (
                <div
                  key={bank.name}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800"
                >
                  <span className="text-sm font-medium" style={{ color: bank.color }}>
                    {bank.name}
                  </span>
                </div>
              ))}
              <div className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800">
                <span className="text-sm text-neutral-400">{t('banking.moreInstitutions')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <a
            href="https://plaid.com/safety/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            {t('banking.learnMorePlaid')}
            <ExternalLink size={14} />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
          >
            {t('banking.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityInfoModal;
