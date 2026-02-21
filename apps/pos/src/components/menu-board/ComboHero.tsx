import React, { useState } from 'react';

interface ComboSlot {
  label: string;
  categoryId: number | null;
  specificItemId: number | null;
  itemImage: string | null;
}

export interface ComboData {
  id: number;
  name: string;
  description: string;
  comboPrice: number;
  savings: number;
  slots: ComboSlot[];
}

interface ComboHeroProps {
  combo: ComboData;
  isPortrait: boolean;
  /** An image URL from one of the combo's category items to use as background */
  heroImage?: string | null;
  /** When provided, uses exact pixel height instead of minHeight */
  height?: number;
}

const ComboHero: React.FC<ComboHeroProps> = ({ combo, isPortrait, heroImage, height }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = heroImage && !imgError;

  if (isPortrait) {
    return (
      <div className="relative rounded-2xl overflow-hidden" style={height ? { height } : { minHeight: 160 }}>
        {/* Background */}
        {showImage ? (
          <img
            src={heroImage}
            alt={combo.name}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, var(--mb-primary), rgba(0,0,0,0.9))' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col justify-end h-full" style={height ? { minHeight: 0 } : { minHeight: 160 }}>
          <h3
            className="text-xl font-black uppercase tracking-wide text-white mb-1"
            style={{ fontFamily: 'var(--mb-font-heading)' }}
          >
            {combo.name}
          </h3>
          <p className="text-xs text-white/60 mb-3 line-clamp-1">{combo.description}</p>
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-black"
              style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
            >
              ${combo.comboPrice}
            </span>
            {combo.savings > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                Save ${combo.savings}!
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Landscape — wider hero card
  return (
    <div className="relative rounded-2xl overflow-hidden flex-1" style={height ? { height } : { minHeight: 200 }}>
      {/* Background image */}
      {showImage ? (
        <img
          src={heroImage}
          alt={combo.name}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--mb-primary), rgba(0,0,0,0.9))' }}
        />
      )}
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col justify-end h-full" style={height ? { minHeight: 0 } : { minHeight: 200 }}>
        <h3
          className="text-2xl font-black uppercase tracking-wide text-white mb-1 drop-shadow-lg"
          style={{ fontFamily: 'var(--mb-font-heading)' }}
        >
          {combo.name}
        </h3>
        <p className="text-sm text-white/60 mb-3 line-clamp-2">{combo.description}</p>
        <div className="flex items-center gap-3">
          <span
            className="text-3xl font-black drop-shadow-lg"
            style={{ color: 'var(--mb-secondary, var(--mb-primary))' }}
          >
            ${combo.comboPrice}
          </span>
          {combo.savings > 0 && (
            <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-green-500/25 text-green-300 border border-green-500/30 shadow-lg">
              Save ${combo.savings}!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComboHero;
