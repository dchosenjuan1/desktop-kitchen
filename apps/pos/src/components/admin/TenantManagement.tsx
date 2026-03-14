import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Download, Loader2, Check } from 'lucide-react';
import {
  createTenant, patchTenant, resetTenantPassword, exportTenantData, deleteTenant,
  type TenantRecord, type CreateTenantPayload,
} from '../../api/superAdmin';

// ==================== Shared Modal Wrapper ====================

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
        <X size={20} />
      </button>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-neutral-400 text-sm mb-1">{label}</label>
      <input
        {...props}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-sm"
      />
    </div>
  );
}

function PrimaryButton({ children, disabled, loading, className = '', ...props }: {
  children: React.ReactNode; disabled?: boolean; loading?: boolean; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${className || 'bg-teal-600 text-white hover:bg-teal-700'}`}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : children}
    </button>
  );
}

// ==================== Create Tenant Modal ====================

export function CreateTenantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation('superAdmin');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState('free');
  const [color, setColor] = useState('#0d9488');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  const autoSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(autoSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: CreateTenantPayload = {
        id: slug,
        name,
        owner_email: email,
        owner_password: password,
        subdomain: slug,
        plan,
        branding_json: { primaryColor: color },
      };
      const result = await createTenant(payload);
      setCreatedPin(result.pin);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Success state — show PIN
  if (createdPin) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-teal-900/50 rounded-full flex items-center justify-center mx-auto">
            <Check size={24} className="text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{t('tenantManagement.tenantCreated')}</h3>
          <p className="text-neutral-400 text-sm">{t('tenantManagement.adminPinFor')} <strong className="text-white">{name}</strong>:</p>
          <p className="text-4xl font-mono font-bold text-teal-400 tracking-widest">{createdPin}</p>
          <p className="text-neutral-500 text-xs">{t('tenantManagement.pinEmailed', { email })}</p>
          <PrimaryButton onClick={onClose}>{t('tenantManagement.done')}</PrimaryButton>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={t('tenantManagement.createTitle')} onClose={onClose} />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('tenantManagement.restaurantName')} value={name} onChange={e => handleNameChange(e.target.value)} required />
        <Input
          label={t('tenantManagement.slugId')}
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
          pattern="[a-z0-9-]+"
          title={t('tenantManagement.slugPattern')}
          required
        />
        <Input label={t('tenantManagement.ownerEmail')} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input label={t('tenantManagement.password')} type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-neutral-400 text-sm mb-1">{t('tenantManagement.plan')}</label>
            <select
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="free">{t('tenantManagement.free')}</option>
              <option value="pro">{t('tenantManagement.pro')}</option>
            </select>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-1">{t('tenantManagement.brandColor')}</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-12 h-[42px] bg-neutral-800 border border-neutral-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
        <PrimaryButton type="submit" loading={loading} disabled={!name || !slug || !email || !password}>
          {t('tenantManagement.createButton')}
        </PrimaryButton>
      </form>
    </ModalOverlay>
  );
}

// ==================== Edit Tenant Modal ====================

export function EditTenantModal({ tenant, onClose, onSuccess }: {
  tenant: TenantRecord; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation('superAdmin');
  const [name, setName] = useState(tenant.name);
  const [subdomain, setSubdomain] = useState(tenant.subdomain);
  const [ownerEmail, setOwnerEmail] = useState(tenant.owner_email);
  const [plan, setPlan] = useState(tenant.plan);
  const [color, setColor] = useState(() => {
    try {
      const b = typeof tenant.branding_json === 'string' ? JSON.parse(tenant.branding_json) : tenant.branding_json;
      return b?.primaryColor || '#0d9488';
    } catch { return '#0d9488'; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await patchTenant(tenant.id, {
        name,
        subdomain,
        owner_email: ownerEmail,
        plan,
        branding_json: { primaryColor: color },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={t('tenantManagement.editTitle')} onClose={onClose} />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('tenantManagement.restaurantName')} value={name} onChange={e => setName(e.target.value)} required />
        <Input label={t('tenantManagement.subdomain')} value={subdomain} onChange={e => setSubdomain(e.target.value)} required />
        <Input label={t('tenantManagement.ownerEmail')} type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-neutral-400 text-sm mb-1">{t('tenantManagement.plan')}</label>
            <select
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="free">{t('tenantManagement.free')}</option>
              <option value="pro">{t('tenantManagement.pro')}</option>
            </select>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-1">{t('tenantManagement.brandColor')}</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-12 h-[42px] bg-neutral-800 border border-neutral-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
        <PrimaryButton type="submit" loading={loading}>{t('tenantManagement.saveChanges')}</PrimaryButton>
      </form>
    </ModalOverlay>
  );
}

// ==================== Reset Password Modal ====================

export function ResetPasswordModal({ tenant, onClose }: {
  tenant: TenantRecord; onClose: () => void;
}) {
  const { t } = useTranslation('superAdmin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetTenantPassword(tenant.id, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-teal-900/50 rounded-full flex items-center justify-center mx-auto">
            <Check size={24} className="text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{t('tenantManagement.passwordReset')}</h3>
          <p className="text-neutral-400 text-sm">{t('tenantManagement.passwordResetFor')} <strong className="text-white">{tenant.name}</strong> {t('tenantManagement.hasBeenReset')}</p>
          <PrimaryButton onClick={onClose}>{t('tenantManagement.done')}</PrimaryButton>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={t('tenantManagement.resetPasswordTitle')} onClose={onClose} />
      <p className="text-neutral-400 text-sm mb-4">{t('tenantManagement.newPasswordFor')} <strong className="text-white">{tenant.name}</strong>.</p>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('tenantManagement.newPassword')} type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required placeholder={t('tenantManagement.minChars')} />
        <PrimaryButton type="submit" loading={loading} disabled={password.length < 8}>{t('tenantManagement.resetButton')}</PrimaryButton>
      </form>
    </ModalOverlay>
  );
}

// ==================== Delete Tenant Modal ====================

export function DeleteTenantModal({ tenant, onClose, onSuccess }: {
  tenant: TenantRecord; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation('superAdmin');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExportFirst = async () => {
    setExporting(true);
    try {
      await downloadTenantExport(tenant.id, tenant.name);
    } catch (err: any) {
      setError(err.message);
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await deleteTenant(tenant.id, tenant.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const canDelete = confirmText === tenant.id;

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={t('tenantManagement.deleteTitle')} onClose={onClose} />
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">{t('tenantManagement.permanentDataLoss')}</p>
              <p className="text-red-300/70 text-xs mt-1">
                {t('tenantManagement.deleteWarning', { name: tenant.name })}
              </p>
            </div>
          </div>
        </div>

        {tenant.stripe_subscription_id && (
          <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-3">
            <p className="text-amber-400 text-xs">
              {t('tenantManagement.stripeWarning')}
            </p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleExportFirst}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-neutral-600 text-sm transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {t('tenantManagement.exportDataFirst')}
        </button>

        <div>
          <label className="block text-neutral-400 text-sm mb-1">
            {t('tenantManagement.typeToConfirm')} <strong className="text-white font-mono">{tenant.id}</strong> {t('tenantManagement.toConfirm')}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={tenant.id}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 text-sm font-mono"
          />
        </div>

        <PrimaryButton
          onClick={handleDelete}
          loading={loading}
          disabled={!canDelete}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
        >
          {t('tenantManagement.deletePermanently')}
        </PrimaryButton>
      </div>
    </ModalOverlay>
  );
}

// ==================== Export Utility ====================

export async function downloadTenantExport(id: string, name: string) {
  const data = await exportTenantData(id);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
