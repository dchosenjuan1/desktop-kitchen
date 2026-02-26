import React, { useState, useCallback } from 'react';
import { Plus, Loader2, Building2 } from 'lucide-react';
import { getBankingWidgetToken, exchangeBankToken } from '../../api';

declare global {
  interface Window {
    belvoSDK?: {
      createWidget: (token: string, options: Record<string, unknown>) => { build: () => void };
    };
    Plaid?: {
      create: (config: Record<string, unknown>) => { open: () => void };
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

interface Props {
  variant?: 'button' | 'card';
  onSuccess?: () => void;
}

const ConnectBankButton: React.FC<Props> = ({ variant = 'button', onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const launchBelvoWidget = useCallback(async (token: string, widgetJsUrl: string) => {
    await loadScript(widgetJsUrl);

    // Wait for belvoSDK to be available
    await new Promise<void>(resolve => {
      const check = () => {
        if (window.belvoSDK) { resolve(); return; }
        setTimeout(check, 100);
      };
      check();
    });

    window.belvoSDK!.createWidget(token, {
      callback: async (link: string, institution: string) => {
        try {
          await exchangeBankToken(link, {
            institutionName: institution,
            countryCode: 'MX',
          });
          onSuccess?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
        } finally {
          setLoading(false);
        }
      },
      onExit: () => {
        setLoading(false);
      },
      onEvent: () => {},
    }).build();
  }, [onSuccess]);

  const launchPlaidWidget = useCallback(async (token: string, widgetJsUrl: string) => {
    await loadScript(widgetJsUrl);

    // Wait for Plaid to be available
    await new Promise<void>(resolve => {
      const check = () => {
        if (window.Plaid) { resolve(); return; }
        setTimeout(check, 100);
      };
      check();
    });

    const handler = window.Plaid!.create({
      token,
      onSuccess: async (publicToken: string, metadata: { institution?: { name?: string; institution_id?: string } }) => {
        try {
          await exchangeBankToken(publicToken, {
            institutionName: metadata?.institution?.name,
            countryCode: 'US',
          });
          onSuccess?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
        } finally {
          setLoading(false);
        }
      },
      onExit: () => {
        setLoading(false);
      },
      onEvent: () => {},
    });
    handler.open();
  }, [onSuccess]);

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      const { token, provider, widgetJsUrl } = await getBankingWidgetToken();

      if (provider === 'plaid') {
        await launchPlaidWidget(token, widgetJsUrl);
      } else {
        await launchBelvoWidget(token, widgetJsUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start connection';
      if (msg.includes('PLAN_UPGRADE_REQUIRED')) {
        setError('Bank connectivity requires a Pro plan.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  if (variant === 'card') {
    return (
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full bg-neutral-900 rounded-lg border-2 border-dashed border-neutral-700 hover:border-brand-600 p-8 text-center transition-colors disabled:opacity-50 group"
      >
        <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-brand-600/20 flex items-center justify-center mx-auto mb-3 transition-colors">
          {loading ? (
            <Loader2 size={24} className="text-brand-400 animate-spin" />
          ) : (
            <Building2 size={24} className="text-neutral-500 group-hover:text-brand-400 transition-colors" />
          )}
        </div>
        <p className="text-white font-semibold mb-1">
          {loading ? 'Connecting...' : 'Connect a Bank Account'}
        </p>
        <p className="text-sm text-neutral-500">
          Link your bank to track cash flow automatically
        </p>
        {error && (
          <p className="text-sm text-red-400 mt-2">{error}</p>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} />
        )}
        {loading ? 'Connecting...' : 'Connect Bank'}
      </button>
      {error && (
        <p className="text-sm text-red-400 mt-1.5">{error}</p>
      )}
    </div>
  );
};

export default ConnectBankButton;
