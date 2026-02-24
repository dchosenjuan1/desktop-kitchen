import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Store, Palette, CreditCard, X, Loader2 } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { redirectToTenant, tenantUrl } from '../lib/tenantResolver';
import { validatePromoCode } from '../api';

const API_BASE = '/api';

interface OnboardingData {
  restaurant_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  primaryColor: string;
  logo_url: string;
  plan: 'trial' | 'starter' | 'pro';
}

type PromoState = 'idle' | 'expanded' | 'loading' | 'valid' | 'invalid';

const PLANS = [
  { id: 'trial' as const, name: 'Free Trial', price: 'Free for 14 days', description: 'Try everything — no card needed' },
  { id: 'starter' as const, name: 'Starter', price: '$29/mo', description: '1 location, 5 employees, basic reports' },
  { id: 'pro' as const, name: 'Pro', price: '$79/mo', description: 'Unlimited locations, AI insights, delivery analytics' },
];

const COLOR_PRESETS = [
  '#0d9488', '#ea580c', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#dc2626',
];

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshBranding } = useBranding();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [data, setData] = useState<OnboardingData>({
    restaurant_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    primaryColor: '#0d9488',
    logo_url: '',
    plan: 'trial',
  });

  // Promo code state
  const [promoState, setPromoState] = useState<PromoState>('idle');
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState(''); // validated code string
  const [promoDescription, setPromoDescription] = useState('');
  const [promoError, setPromoError] = useState('');

  // Pre-fill from URL query params (e.g. ?promo_code=MEXICO50&restaurant_name=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlPromo = params.get('promo_code');
    const urlName = params.get('restaurant_name');
    const urlEmail = params.get('email');

    if (urlName) setData(prev => ({ ...prev, restaurant_name: urlName }));
    if (urlEmail) setData(prev => ({ ...prev, email: urlEmail }));

    if (urlPromo) {
      const code = urlPromo.trim().toUpperCase();
      setPromoInput(code);
      setPromoCode(code);
      setPromoState('valid');
      setPromoDescription('Descuento aplicado desde enlace de campaña');
    }
  }, []);

  const handleValidatePromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoState('loading');
    setPromoError('');
    try {
      const result = await validatePromoCode(code);
      if (result.valid) {
        setPromoState('valid');
        setPromoCode(result.code || code);
        setPromoDescription(result.discount_description || 'Descuento aplicado');
      } else {
        setPromoState('invalid');
        setPromoError(result.message || 'Código inválido o expirado');
      }
    } catch {
      setPromoState('invalid');
      setPromoError('Error al validar el código');
    }
  };

  const handleRemovePromo = () => {
    setPromoState('idle');
    setPromoInput('');
    setPromoCode('');
    setPromoDescription('');
    setPromoError('');
  };

  const update = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!data.restaurant_name.trim()) return 'Restaurant name is required';
    if (!data.email.trim() || !data.email.includes('@')) return 'Valid email is required';
    if (data.password.length < 8) return 'Password must be at least 8 characters';
    if (data.password !== data.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const registerBody: Record<string, string> = {
        email: data.email,
        password: data.password,
        restaurant_name: data.restaurant_name,
      };
      if (data.primaryColor !== '#0d9488') registerBody.primaryColor = data.primaryColor;
      if (data.logo_url) registerBody.logoUrl = data.logo_url;
      if (promoCode) registerBody.promo_code = promoCode;

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerBody),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Registration failed');

      // Store generated PIN, subdomain, and JWT + tenant info
      if (result.pin) setGeneratedPin(result.pin);
      if (result.tenant.subdomain) setTenantSubdomain(result.tenant.subdomain);
      localStorage.setItem('owner_token', result.token);
      localStorage.setItem('tenant_id', result.tenant.id);
      localStorage.setItem('tenant_name', result.tenant.name);

      // Re-fetch branding with the new tenant ID so colors/name update
      await refreshBranding();

      // Done — redirect to POS login
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToPOS = () => {
    if (tenantSubdomain) {
      redirectToTenant(tenantSubdomain);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${s <= step ? 'bg-teal-600' : 'bg-neutral-800'}`} />
            </div>
          ))}
        </div>

        {/* Step 1: Restaurant Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Store className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white">Set up your restaurant</h1>
              <p className="text-neutral-400 mt-1">Create your POS account in minutes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Restaurant name</label>
              <input
                type="text"
                value={data.restaurant_name}
                onChange={e => update('restaurant_name', e.target.value)}
                placeholder="e.g. Tacos El Rey"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Owner email</label>
              <input
                type="email"
                value={data.email}
                onChange={e => update('email', e.target.value)}
                placeholder="you@restaurant.com"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
              <input
                type="password"
                value={data.password}
                onChange={e => update('password', e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Confirm password</label>
              <input
                type="password"
                value={data.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Palette className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white">Brand your POS</h1>
              <p className="text-neutral-400 mt-1">Pick your primary color and upload a logo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">Primary color</label>
              <div className="flex gap-3 flex-wrap">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => update('primaryColor', color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      data.primaryColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm text-neutral-400">Custom:</span>
                <input
                  type="color"
                  value={data.primaryColor}
                  onChange={e => update('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-sm text-neutral-500 font-mono">{data.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Logo URL (optional)</label>
              <input
                type="url"
                value={data.logo_url}
                onChange={e => update('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
              />
              {data.logo_url && (
                <div className="mt-3 flex justify-center">
                  <img src={data.logo_url} alt="Logo preview" className="h-16 rounded" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            {/* Live preview */}
            <div className="p-4 rounded-lg border border-neutral-800">
              <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: data.primaryColor }}>
                  {data.restaurant_name?.charAt(0) || '?'}
                </div>
                <span className="text-white font-semibold">{data.restaurant_name || 'Your Restaurant'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Choose Plan */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CreditCard className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white">Choose your plan</h1>
              <p className="text-neutral-400 mt-1">Start free, upgrade anytime</p>
            </div>

            <div className="space-y-3">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => update('plan', plan.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    data.plan === plan.id
                      ? 'border-teal-600 bg-teal-600/10'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">{plan.name}</span>
                      <span className="text-neutral-400 ml-2 text-sm">{plan.price}</span>
                    </div>
                    {data.plan === plan.id && <Check className="w-5 h-5 text-teal-500" />}
                  </div>
                  <p className="text-sm text-neutral-400 mt-1">{plan.description}</p>
                </button>
              ))}
            </div>

            {/* Promo Code */}
            <div className="mt-4">
              {promoState === 'idle' && (
                <button
                  type="button"
                  onClick={() => setPromoState('expanded')}
                  className="text-sm text-teal-500 hover:text-teal-400 transition-colors"
                >
                  ¿Tienes un código de descuento?
                </button>
              )}

              {(promoState === 'expanded' || promoState === 'loading' || promoState === 'invalid') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => {
                        setPromoInput(e.target.value.toUpperCase());
                        if (promoState === 'invalid') {
                          setPromoState('expanded');
                          setPromoError('');
                        }
                      }}
                      placeholder="Ingresa tu código"
                      className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-teal-600"
                      disabled={promoState === 'loading'}
                      onKeyDown={e => { if (e.key === 'Enter') handleValidatePromo(); }}
                    />
                    <button
                      type="button"
                      onClick={handleValidatePromo}
                      disabled={promoState === 'loading' || !promoInput.trim()}
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {promoState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {promoState === 'invalid' && promoError && (
                    <p className="text-red-400 text-sm">{promoError}</p>
                  )}
                </div>
              )}

              {promoState === 'valid' && (
                <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-green-400 font-semibold text-sm">{promoCode}</span>
                  <span className="text-neutral-400 text-sm mx-1">&mdash;</span>
                  <span className="text-green-300 text-sm flex-1">{promoDescription}</span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && !error && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">You're all set!</h1>
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 space-y-3">
              <p className="text-neutral-400 text-sm">Your admin login PIN</p>
              <p className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{generatedPin}</p>
              <p className="text-neutral-500 text-sm">
                A copy has been sent to <span className="text-neutral-300">{data.email}</span>
              </p>
            </div>
            {tenantSubdomain && (
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
                <p className="text-neutral-400 text-sm mb-1">Your POS is live at</p>
                <p className="text-teal-400 font-semibold">{tenantUrl(tenantSubdomain).replace('https://', '')}</p>
              </div>
            )}
            <button
              onClick={handleGoToPOS}
              className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Go to Your POS
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button onClick={handleBack} className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            )}
          </div>
        )}

        {/* Login link */}
        {step === 1 && (
          <p className="text-center text-neutral-500 text-sm mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/')} className="text-teal-500 hover:text-teal-400">
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
