import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { verifySecret } from '../../api/superAdmin';

interface LoginGateProps {
  onAuth: () => void;
}

export default function LoginGate({ onAuth }: LoginGateProps) {
  const { t } = useTranslation('superAdmin');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    sessionStorage.setItem('admin_secret', secret);
    const ok = await verifySecret();
    if (ok) {
      onAuth();
    } else {
      sessionStorage.removeItem('admin_secret');
      setError(t('login.invalidSecret'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-teal-500" size={28} />
          <h1 className="text-2xl font-black text-white">{t('login.title')}</h1>
        </div>
        <p className="text-neutral-400 text-sm">{t('login.description')}</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder={t('login.placeholder')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !secret}
          className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {loading ? t('login.verifying') : t('login.signIn')}
        </button>
      </form>
    </div>
  );
}
