import { useState, useEffect, useCallback } from 'react'
import { Database, Trash2, Loader2, Link } from 'lucide-react'
import type { Prospect, DemoStatusResponse, TenantSummary } from '../types'
import { generateDemo, getDemoStatus, deleteDemo, getTenants, updateProspect } from '../api'

const DEMO_STATUSES = new Set(['demo_scheduled', 'trial', 'converted'])

interface Props {
  prospect: Prospect
  onProspectUpdated?: (updated: Prospect) => void
}

export default function DemoDataButton({ prospect, onProspectUpdated }: Props) {
  const [status, setStatus] = useState<DemoStatusResponse | null>(null)
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<'generate' | 'delete' | 'link' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState('')

  const eligible = DEMO_STATUSES.has(prospect.status)

  const fetchStatus = useCallback(async () => {
    if (!eligible) return
    setLoading(true)
    try {
      const s = await getDemoStatus(prospect.id)
      setStatus(s)
      // If no tenant linked, also fetch available tenants
      if (!s.hasTenant) {
        const t = await getTenants()
        setTenants(t)
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [prospect.id, eligible])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (!eligible) return null

  if (loading && !status) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking demo data...
      </div>
    )
  }

  if (!status) return null

  const handleLinkTenant = async () => {
    if (!selectedTenantId) return
    setActing('link')
    setError(null)
    try {
      const updated = await updateProspect(prospect.id, { converted_tenant_id: selectedTenantId })
      onProspectUpdated?.(updated)
      // Re-fetch status now that tenant is linked
      const s = await getDemoStatus(prospect.id)
      setStatus(s)
      setTenants(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to link tenant')
    } finally {
      setActing(null)
    }
  }

  const handleGenerate = async () => {
    setActing('generate')
    setError(null)
    try {
      await generateDemo(prospect.id)
      await fetchStatus()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setActing(null)
    }
  }

  const handleDelete = async () => {
    setActing('delete')
    setError(null)
    try {
      await deleteDemo(prospect.id)
      await fetchStatus()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActing(null)
    }
  }

  // No tenant linked — show tenant picker
  if (!status.hasTenant) {
    return (
      <div className="mt-3 border-t border-neutral-800 pt-3">
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <p className="text-xs text-neutral-500 mb-2">Link a tenant to enable demo data:</p>
        <div className="flex gap-2">
          <select
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">Select tenant...</option>
            {tenants?.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
            ))}
          </select>
          <button
            onClick={handleLinkTenant}
            disabled={!selectedTenantId || acting !== null}
            className="flex items-center gap-1 px-2 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
          >
            {acting === 'link' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
            Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-neutral-800 pt-3">
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <p className="text-[10px] text-neutral-500 mb-2">
        Tenant: <span className="text-neutral-400">{status.tenant_name}</span>
      </p>

      {status.hasDemo && status.counts ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {status.counts.orders > 0 && (
              <span className="text-[10px] bg-brand-900/40 text-brand-400 px-1.5 py-0.5 rounded">
                {status.counts.orders} orders
              </span>
            )}
            {status.counts.customers > 0 && (
              <span className="text-[10px] bg-brand-900/40 text-brand-400 px-1.5 py-0.5 rounded">
                {status.counts.customers} customers
              </span>
            )}
            {status.counts.delivery_orders > 0 && (
              <span className="text-[10px] bg-brand-900/40 text-brand-400 px-1.5 py-0.5 rounded">
                {status.counts.delivery_orders} delivery
              </span>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={acting !== null}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {acting === 'delete' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Clear Demo Data
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={acting !== null}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
        >
          {acting === 'generate' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Database className="w-3 h-3" />
          )}
          Populate Demo Data
        </button>
      )}
    </div>
  )
}
