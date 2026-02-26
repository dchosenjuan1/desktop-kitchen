import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Rocket, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import { redirectToTenant } from '../lib/tenantResolver';
import { ownerLogin, requestPasswordReset } from '../api';

type View = 'login' | 'forgot' | 'forgot-sent';

const PlatformGateway: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password required'); return; }

    setIsLoading(true);
    setError('');

    try {
      const data = await ownerLogin(email, password);

      // Store owner token and tenant ID
      if (data.token) localStorage.setItem('owner_token', data.token);
      if (data.tenant?.id) localStorage.setItem('tenant_id', data.tenant.id);

      // Redirect to the tenant's subdomain
      redirectToTenant(data.tenant.subdomain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }

    setIsLoading(true);
    setError('');

    try {
      await requestPasswordReset(email);
      setView('forgot-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToForgot = () => {
    setError('');
    setPassword('');
    setView('forgot');
  };

  const switchToLogin = () => {
    setError('');
    setPassword('');
    setView('login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">DK</span>
          </div>
          <span className="text-white font-semibold text-lg">Desktop Kitchen</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">

          {/* ==================== Login View ==================== */}
          {view === 'login' && (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Welcome back</h1>
                <p className="text-neutral-400 mt-2">Sign in to manage your restaurant</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="owner@restaurant.com"
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Your owner password"
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-neutral-950 text-neutral-500">or</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/onboarding')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-teal-600 text-teal-400 font-semibold rounded-lg hover:bg-teal-600/10 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Get Started — Create Your Restaurant
              </button>
            </>
          )}

          {/* ==================== Forgot Password View ==================== */}
          {view === 'forgot' && (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Reset password</h1>
                <p className="text-neutral-400 mt-2">Enter your email and we'll send a reset link</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="owner@restaurant.com"
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-teal-600"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={switchToLogin}
                  className="w-full flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </form>
            </>
          )}

          {/* ==================== Forgot-Sent View ==================== */}
          {view === 'forgot-sent' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-teal-600/20 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-teal-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Check your email</h1>
                <p className="text-neutral-400 mt-2">
                  If an account exists for <span className="text-white">{email}</span>, we sent a password reset link. The link expires in 1 hour.
                </p>
              </div>

              <button
                onClick={switchToLogin}
                className="flex items-center justify-center gap-2 mx-auto text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-neutral-800 flex items-center justify-center">
        <button
          onClick={() => navigate('/super-admin')}
          className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-400 text-xs transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin
        </button>
      </footer>
    </div>
  );
};

export default PlatformGateway;
