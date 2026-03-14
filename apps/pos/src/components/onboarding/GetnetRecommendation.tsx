import React from 'react';
import { useTranslation } from 'react-i18next';

interface GetnetRecommendationProps {
  onSetup: () => void;
  onDismiss: () => void;
}

const GetnetRecommendation: React.FC<GetnetRecommendationProps> = ({ onSetup, onDismiss }) => {
  const { t } = useTranslation('admin');
  return (
    <div className="bg-gradient-to-r from-red-600/10 to-red-800/10 border border-red-600/30 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-bold">{t('getnet.saveWithGetnet')}</h4>
            <p className="text-neutral-400 text-sm">{t('getnet.commissionsComparison')}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-neutral-500 hover:text-neutral-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-neutral-900/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-400">1.8%</p>
          <p className="text-xs text-neutral-500">Getnet</p>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-neutral-500">3.4%</p>
          <p className="text-xs text-neutral-500">Conekta</p>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-neutral-500">3.6%</p>
          <p className="text-xs text-neutral-500">Stripe</p>
        </div>
      </div>

      <button
        onClick={onSetup}
        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all"
      >
        {t('getnet.setupGetnet')}
      </button>
    </div>
  );
};

export default GetnetRecommendation;
