import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, Users, Copy, Plus, KeyRound } from 'lucide-react';
import { createEmployee } from '../../api';

type Step = 'form' | 'saving' | 'success';
type RoleType = 'cashier' | 'kitchen' | 'bar' | 'manager' | 'admin';

interface AddedEmployee {
  name: string;
  pin: string;
  role: RoleType;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded?: () => void;
}

const ROLE_OPTIONS: { value: RoleType; label: string; description: string }[] = [
  { value: 'cashier', label: 'Cashier', description: 'Takes orders and payments' },
  { value: 'kitchen', label: 'Kitchen', description: 'Views kitchen display' },
  { value: 'bar', label: 'Bar', description: 'Views bar orders' },
  { value: 'manager', label: 'Manager', description: 'Reports + settings access' },
  { value: 'admin', label: 'Admin', description: 'Full access to everything' },
];

const ROLE_COLORS: Record<RoleType, string> = {
  cashier: 'bg-green-600/20 text-green-400 border-green-800',
  kitchen: 'bg-blue-600/20 text-blue-400 border-blue-800',
  bar: 'bg-amber-600/20 text-amber-400 border-amber-800',
  manager: 'bg-purple-600/20 text-purple-400 border-purple-800',
  admin: 'bg-brand-600/20 text-brand-400 border-brand-800',
};

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function AddStaffModal({ isOpen, onClose, onStaffAdded }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [pin, setPin] = useState(generatePin());
  const [role, setRole] = useState<RoleType>('cashier');
  const [error, setError] = useState('');
  const [addedEmployees, setAddedEmployees] = useState<AddedEmployee[]>([]);
  const [lastAdded, setLastAdded] = useState<AddedEmployee | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('form');
    setName('');
    setPin(generatePin());
    setRole('cashier');
    setError('');
    setAddedEmployees([]);
    setLastAdded(null);
    setCopied(false);
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Enter the employee name');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits');
      return;
    }

    setStep('saving');
    setError('');

    try {
      await createEmployee({ name: name.trim(), pin, role });
      const added: AddedEmployee = { name: name.trim(), pin, role };
      setAddedEmployees(prev => [...prev, added]);
      setLastAdded(added);
      setStep('success');
      onStaffAdded?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
      setStep('form');
    }
  };

  const handleAddAnother = () => {
    setStep('form');
    setName('');
    setPin(generatePin());
    setRole('cashier');
    setError('');
    setLastAdded(null);
    setCopied(false);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleCopyPin = () => {
    if (lastAdded) {
      navigator.clipboard.writeText(lastAdded.pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <Users size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Staff</h2>
              <p className="text-xs text-neutral-400">
                {addedEmployees.length === 0
                  ? 'Create login PINs for your team'
                  : `${addedEmployees.length} employee${addedEmployees.length > 1 ? 's' : ''} added`}
              </p>
            </div>
          </div>
          {step !== 'saving' && (
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 p-1">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Name</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="e.g. Maria, Carlos..."
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        role === r.value
                          ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">
                  {ROLE_OPTIONS.find(r => r.value === role)?.description}
                </p>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Login PIN</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pin}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(v);
                    }}
                    maxLength={4}
                    className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center text-lg tracking-[0.3em] font-bold focus:outline-none focus:border-brand-600"
                  />
                  <button
                    onClick={() => setPin(generatePin())}
                    className="px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 text-sm transition-colors"
                  >
                    Randomize
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">This PIN is used to clock in at the POS</p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="w-full py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-brand-600 hover:bg-brand-500"
              >
                Add Employee
              </button>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={36} className="text-brand-400 animate-spin" />
              <p className="text-neutral-300 text-sm">Creating employee...</p>
            </div>
          )}

          {step === 'success' && lastAdded && (
            <div className="space-y-5">
              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-900/30 flex items-center justify-center mb-3">
                  <Check size={28} className="text-green-400" />
                </div>
                <p className="text-white font-bold text-lg">{lastAdded.name} added!</p>
                <span className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[lastAdded.role]}`}>
                  {lastAdded.role}
                </span>
              </div>

              {/* PIN display */}
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-400 text-xs mb-2">
                  <KeyRound size={14} />
                  <span>Login PIN — share with {lastAdded.name}</span>
                </div>
                <p className="text-3xl font-bold text-white tracking-[0.3em] mb-3">{lastAdded.pin}</p>
                <button
                  onClick={handleCopyPin}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy PIN'}
                </button>
              </div>

              {/* Previously added list */}
              {addedEmployees.length > 1 && (
                <div className="border border-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-2">Added this session:</p>
                  <div className="space-y-1.5">
                    {addedEmployees.slice(0, -1).map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300">{e.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${ROLE_COLORS[e.role]}`}>{e.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAddAnother}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  <Plus size={16} /> Add Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-500 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
