import { useState, useEffect, useCallback } from 'react'
import { Database, Trash2, Loader2 } from 'lucide-react'
import type { Prospect, DemoStatusResponse } from '../types'
import { generateDemo, getDemoStatus, deleteDemo } from '../api'

const DEMO_STATUSES = new Set(['demo_scheduled', 'trial', 'converted'])

interface Props {
  prospect: Prospect
}

export default function DemoDataButton({ prospect }: Props) {
  const [status, setStatus] = useState<DemoStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<'generate' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const eligible = DEMO_STATUSES.has(prospect.status)

  const fetchStatus = useCallback(async () => {
    if (!eligible) return
    setLoading(true)
    try {
      const s = await getDemoStatus(prospect.id)
      setStatus(s)
    } catch {
      // silently ignore — button just won't show
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

  if (!status.hasTenant) {
    return (
      <p className="mt-3 text-xs text-neutral-600 italic">
        No tenant linked — set converted_tenant_id to enable demo data
      </p>
    )
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

  return (
    <div className="mt-3 border-t border-neutral-800 pt-3">
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

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
