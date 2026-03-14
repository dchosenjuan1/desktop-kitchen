import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { getBankSyncHealth, syncBankConnection, type BankSyncAlert } from '../../api';

const BankSyncBanner: React.FC = () => {
  const { t } = useTranslation('admin');
  const [alerts, setAlerts] = useState<BankSyncAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    getBankSyncHealth()
      .then(data => setAlerts(data.alerts))
      .catch(() => {}); // silent — non-critical
  }, []);

  const handleRetry = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      await syncBankConnection(connectionId);
      // Re-check health after retry
      const data = await getBankSyncHealth();
      setAlerts(data.alerts);
    } catch {
      // ignore — banner will persist
    }
    setSyncing(null);
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.connectionId));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {visibleAlerts.map(alert => (
        <div
          key={alert.connectionId}
          className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/50 rounded-lg px-4 py-3"
        >
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200 flex-1">
            {t('banking.syncIssue', { institution: alert.institutionName || t('banking.unknownInstitution') })}{' '}
            <Link to="/admin/banking" className="text-amber-400 hover:text-amber-300 underline">
              {t('banking.reconnect')}
            </Link>
          </p>
          <button
            onClick={() => handleRetry(alert.connectionId)}
            disabled={syncing === alert.connectionId}
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-800/30 transition-colors disabled:opacity-50"
            title="Retry sync"
          >
            <RefreshCw size={14} className={syncing === alert.connectionId ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(alert.connectionId))}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default BankSyncBanner;
