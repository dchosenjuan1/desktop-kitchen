import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import type { Prospect, ProspectStatus, Commission } from '../types'
import Header from '../components/Header'
import StatsBar, { repStatsCards } from '../components/StatsBar'
import ProspectCard from '../components/ProspectCard'
import ProspectModal from '../components/ProspectModal'
import CommissionTable from '../components/CommissionTable'

const statusTabs: { value: ProspectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visited', label: 'Visited' },
  { value: 'interested', label: 'Interested' },
  { value: 'demo_scheduled', label: 'Demo' },
  { value: 'trial', label: 'Trial' },
  { value: 'converted', label: 'Converted' },
]

export default function RepDashboard() {
  const { stats, refreshProfile } = useAuth()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [tab, setTab] = useState<ProspectStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.getProspects(), api.getCommissions()])
      setProspects(p)
      setCommissions(c)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    const updated = await api.updateProspect(id, { status })
    setProspects(prev => prev.map(p => p.id === id ? updated : p))
    refreshProfile()
  }

  const handleCreate = async (data: Record<string, string>) => {
    const created = await api.createProspect(data)
    setProspects(prev => [created, ...prev])
    refreshProfile()
  }

  const filtered = tab === 'all' ? prospects : prospects.filter(p => p.status === tab)

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Prospect
          </button>
        }
      />

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {stats && <StatsBar stats={repStatsCards(stats)} />}

        {/* Pipeline */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Pipeline</h2>
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {statusTabs.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === t.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {t.label}
                {t.value !== 'all' && (
                  <span className="ml-1 text-neutral-500">
                    {prospects.filter(p => p.status === t.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              No prospects {tab !== 'all' ? `with status "${tab}"` : 'yet'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(p => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  onStatusChange={handleStatusChange}
                  onProspectUpdated={updated => setProspects(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </div>
          )}
        </section>

        {/* Commissions */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Commissions</h2>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <CommissionTable commissions={commissions} />
          </div>
        </section>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showModal && <ProspectModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}
    </div>
  )
}
