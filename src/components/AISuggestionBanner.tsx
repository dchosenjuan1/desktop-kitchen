import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AISuggestion } from '../types';
import { formatPrice } from '../utils/currency';

interface AISuggestionBannerProps {
  suggestions: AISuggestion[];
  onAccept: (suggestion: AISuggestion) => void;
  onDismiss: (suggestion: AISuggestion) => void;
  displayTimeout?: number;
}

const AISuggestionBanner: React.FC<AISuggestionBannerProps> = ({
  suggestions,
  onAccept,
  onDismiss,
  displayTimeout = 15,
}) => {
  const { t } = useTranslation('pos');
  const [visible, setVisible] = useState(true);

  // Auto-hide after timeout
  useEffect(() => {
    if (suggestions.length === 0) return;

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, displayTimeout * 1000);

    return () => clearTimeout(timer);
  }, [suggestions, displayTimeout]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="mx-4 mt-3 space-y-2">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.data.rule}-${suggestion.data.suggested_item_id}-${index}`}
          className="bg-neutral-900 border-l-4 border-red-500 rounded-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top"
        >
          {/* Sparkle Icon */}
          <div className="flex-shrink-0 text-red-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
            </svg>
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {suggestion.data.message}
            </p>
            {suggestion.data.savings && (
              <p className="text-red-400 text-xs">
                {t('suggestion.save', { amount: formatPrice(suggestion.data.savings) })}
              </p>
            )}
          </div>

          {/* Price */}
          <span className="text-red-400 text-sm font-bold flex-shrink-0">
            {formatPrice(suggestion.data.suggested_item_price)}
          </span>

          {/* Add Button */}
          <button
            onClick={() => onAccept(suggestion)}
            className="flex-shrink-0 px-3 py-1.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all active:scale-95 touch-manipulation"
          >
            {t('suggestion.add')}
          </button>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(suggestion)}
            className="flex-shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors touch-manipulation p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default AISuggestionBanner;
