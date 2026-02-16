import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (error) {
      setLocalError(error);
      setShake(true);
      setPin('');
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePinInput = async (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);
    setLocalError('');

    if (newPin.length === 4) {
      try {
        await login(newPin);
        navigate('/pos');
      } catch {
        // Error handling is done in useEffect
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setLocalError('');
  };

  const handleClear = () => {
    setPin('');
    setLocalError('');
  };

  const handleKitchenDisplay = () => {
    navigate('/kitchen');
  };

  const numpadButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Logo & Header */}
      <div className="text-center mb-12">
        <img
          src="/logo.png"
          alt="Juanberto's"
          className="h-28 mx-auto mb-6"
        />
        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
          Juanberto's
        </h1>
        <p className="text-xl font-semibold text-red-600 tracking-tight">
          California Burritos
        </p>
        <p className="text-lg text-neutral-400 mt-2">Employee Login</p>
      </div>

      {/* PIN Entry Display */}
      <div
        className={`mb-10 transition-all duration-150 ${
          shake ? 'scale-95 translate-x-2' : 'scale-100'
        }`}
      >
        <div className="flex gap-4 justify-center mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center border-2 border-neutral-700"
            >
              {pin.length > index ? (
                <div className="w-6 h-6 bg-red-600 rounded-full"></div>
              ) : (
                <div className="w-6 h-6 bg-neutral-800 rounded-full"></div>
              )}
            </div>
          ))}
        </div>

        {localError && (
          <div className="text-center mb-4">
            <p className="text-lg font-semibold text-red-500">{localError}</p>
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {numpadButtons.map((digit) => (
            <button
              key={digit}
              onClick={() => handlePinInput(digit)}
              disabled={isLoading || pin.length === 4}
              className="w-20 h-20 bg-neutral-900 text-2xl font-bold text-white rounded-xl hover:bg-neutral-800 active:bg-neutral-700 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-700 touch-manipulation"
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleBackspace}
            disabled={isLoading || pin.length === 0}
            className="flex-1 h-16 bg-neutral-800 text-white text-lg font-bold rounded-xl hover:bg-neutral-700 active:bg-neutral-600 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-700 touch-manipulation"
          >
            Back
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="flex-1 h-16 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 active:bg-red-800 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mb-6">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-center text-neutral-400 mt-2 text-sm">Logging in...</p>
        </div>
      )}

      {/* Quick Access */}
      <div className="mt-8">
        <button
          onClick={handleKitchenDisplay}
          className="px-6 py-3 bg-neutral-800 text-white text-sm font-semibold rounded-lg border border-neutral-700 hover:bg-neutral-700 active:bg-neutral-600 transition-all duration-75 touch-manipulation"
        >
          Kitchen Display
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-neutral-600 text-xs">
        <p>Tap a 4-digit PIN to login</p>
        <p className="mt-1">POS System v1.0</p>
      </div>
    </div>
  );
};

export default LoginScreen;
