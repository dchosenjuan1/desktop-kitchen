import React from 'react';
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
  { name: 'HSBC', color: '#DB0011' },
];

const SecurityInfoModal: React.FC<Props> = ({ open, onClose }) => {
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
            <h2 className="text-lg font-bold text-white">How bank connections work</h2>
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
                <h3 className="text-white font-semibold text-sm">Read-only access</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  Desktop Kitchen can only view your account balances and transaction history. We cannot move money, make payments, or modify your accounts in any way.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={16} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Your credentials stay private</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  Your bank login credentials are entered directly with your bank through a secure widget. Desktop Kitchen never sees, stores, or has access to your username or password.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Unlink size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Disconnect anytime</h3>
                <p className="text-neutral-400 text-sm mt-0.5">
                  You can disconnect your bank at any time from the Banking settings. This immediately revokes access and stops all data syncing.
                </p>
              </div>
            </div>
          </div>

          {/* Provider */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Powered by</p>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-neutral-800 rounded-lg">
                <span className="text-white font-bold text-sm">Belvo</span>
              </div>
              <p className="text-neutral-400 text-sm">
                in Mexico &amp; Latin America
              </p>
            </div>
            <p className="text-neutral-500 text-xs mt-2">
              Belvo is a regulated open finance platform used by banks and fintechs across Latin America. All connections use bank-grade TLS encryption.
            </p>
          </div>

          {/* Supported Banks */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Supported banks include</p>
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
                <span className="text-sm text-neutral-400">+ 40 more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <a
            href="https://belvo.com/security/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            Learn more about Belvo security
            <ExternalLink size={14} />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityInfoModal;
