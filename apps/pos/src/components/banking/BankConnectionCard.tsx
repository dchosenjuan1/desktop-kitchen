import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Unlink, Building2, Wallet, CreditCard,
  PiggyBank, TrendingUp, Landmark, HelpCircle, AlertTriangle,
} from 'lucide-react';
import type { BankConnection, BankAccount } from '../../api';

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  checking: <Landmark size={16} className="text-blue-400" />,
  savings: <PiggyBank size={16} className="text-green-400" />,
  credit_card: <CreditCard size={16} className="text-amber-400" />,
  loan: <Wallet size={16} className="text-red-400" />,
  investment: <TrendingUp size={16} className="text-purple-400" />,
  other: <HelpCircle size={16} className="text-neutral-400" />,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'bg-green-600/20', text: 'text-green-400', labelKey: 'banking.statusActive' },
  error: { bg: 'bg-red-600/20', text: 'text-red-400', labelKey: 'banking.statusError' },
  disconnected: { bg: 'bg-neutral-700/30', text: 'text-neutral-400', labelKey: 'banking.statusDisconnected' },
  pending: { bg: 'bg-amber-600/20', text: 'text-amber-400', labelKey: 'banking.statusPending' },
};

function formatCurrency(amount: number | null, currency = 'MXN'): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}

interface Props {
  connection: BankConnection;
  accounts: BankAccount[];
  onSync: (connectionId: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
}

const BankConnectionCard: React.FC<Props> = ({ connection, accounts, onSync, onDisconnect }) => {
  const { t } = useTranslation('admin');
  const [syncing, setSyncing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const status = STATUS_STYLES[connection.status] || STATUS_STYLES.pending;
  const connAccounts = accounts.filter(a => a.connection_id === connection.id);

  const timeAgo = (dateStr: string | null): string => {
    if (!dateStr) return t('banking.never');
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('banking.justNow');
    if (mins < 60) return t('banking.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('banking.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('banking.daysAgo', { count: days });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(connection.id);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(connection.id);
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  };

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {connection.institution_logo_url ? (
            <img
              src={connection.institution_logo_url}
              alt={connection.institution_name || ''}
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 size={20} className="text-neutral-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">
            {connection.institution_name || t('banking.unknownInstitution')}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded ${status.bg} ${status.text} font-medium`}>
              {t(status.labelKey)}
            </span>
            <span className="text-neutral-500">
              {t('banking.synced')} {timeAgo(connection.last_synced_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleSync}
            disabled={syncing || connection.status === 'disconnected'}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Sync now"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setConfirmDisconnect(true)}
            disabled={connection.status === 'disconnected'}
            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Disconnect"
          >
            <Unlink size={16} />
          </button>
        </div>
      </div>

      {/* Accounts */}
      {connAccounts.length > 0 && (
        <div className="border-t border-neutral-800">
          {connAccounts.map(acct => (
            <div
              key={acct.id}
              className="px-4 py-2.5 flex items-center gap-3 border-b border-neutral-800/50 last:border-b-0"
            >
              <span className="flex-shrink-0">
                {ACCOUNT_ICONS[acct.type || 'other'] || ACCOUNT_ICONS.other}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-300 truncate">
                  {acct.name}
                  {acct.last_four && (
                    <span className="text-neutral-500 ml-1">****{acct.last_four}</span>
                  )}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-white">
                  {formatCurrency(acct.balance_current, acct.currency)}
                </p>
                {acct.balance_available != null && acct.balance_available !== acct.balance_current && (
                  <p className="text-xs text-neutral-500">
                    {t('banking.avail')} {formatCurrency(acct.balance_available, acct.currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      {confirmDisconnect && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDisconnect(false)}>
          <div
            className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 max-w-sm w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">{t('banking.disconnectBank')}</h3>
                <p className="text-sm text-neutral-400">
                  {t('banking.disconnectConfirm', { institution: connection.institution_name || t('banking.unknownInstitution') })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-300 font-medium hover:bg-neutral-700 transition-colors"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {disconnecting ? t('banking.disconnecting') : t('banking.disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankConnectionCard;
