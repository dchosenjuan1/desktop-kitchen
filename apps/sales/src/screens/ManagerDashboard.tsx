import { useState, useEffect, useCallback } from 'react'
import { Users, Target, TrendingUp, DollarSign, Plus, Key } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as api from '../api'
import type { RepWithStats, Prospect, Commission, ProspectStatus } from '../types'
import Header from '../components/Header'
import StatsBar, { repStatsCards } from '../components/StatsBar'
import ProspectCard from '../components/ProspectCard'
import ProspectModal from '../components/ProspectModal'
import CommissionTable from '../components/CommissionTable'
import ApprovalQueue from '../components/ApprovalQueue'
import StatusBadge from '../components/StatusBadge'
import VelocityTab from '../components/VelocityTab'

type Tab = 'pipeline' | 'overview' | 'reps' | 'prospects' | 'commissions' | 'velocity'

export default function ManagerDashboard() {
  const { stats, refreshProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('pipeline')
  const [reps, setReps] = useState<RepWithStats[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [myProspects, setMyProspects] = useState<Prospect[]>([])
  const [myCommissions, setMyCommissions] = useState<Commission[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [repFilter, setRepFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pipelineTab, setPipelineTab] = useState<ProspectStatus | 'all'>('all')

  // Modals
  const [showCreateRep, setShowCreateRep] = useState(false)
  const [showProspectModal, setShowProspectModal] = useState(false)
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [r, p, c, mp, mc] = await Promise.all([
        api.getManagerReps(),
        api.getManagerProspects(),
        api.getManagerCommissions(),
        api.getProspects(),
        api.getCommissions(),
      ])
      setReps(r)
      setProspects(p)
      setCommissions(c)
      setMyProspects(mp)
      setMyCommissions(mc)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    const updated = await api.updateProspect(id, { status })
    setProspects(prev => prev.map(p => p.id === id ? updated : p))
    setMyProspects(prev => prev.map(p => p.id === id ? updated : p))
    refreshProfile()
  }

  const handleCreateProspect = async (data: Record<string, string>) => {
    const created = await api.createProspect(data)
    setMyProspects(prev => [created, ...prev])
    setProspects(prev => [created, ...prev])
    refreshProfile()
  }

  const handleCommissionAction = async (id: string, status: string, notes?: string) => {
    await api.updateCommission(id, { status, notes })
    await loadData()
    refreshProfile()
  }

  // Aggregated stats
  const totalProspects = reps.reduce((s, r) => s + r.total_prospects, 0)
  const totalConverted = reps.reduce((s, r) => s + r.conversion_count, 0)
  const totalPending = reps.reduce((s, r) => s + Number(r.pending_commissions_total), 0)
  const totalPaid = reps.reduce((s, r) => s + Number(r.paid_commissions_total), 0)

  const overviewStats = [
    { label: 'Total Prospects', value: totalProspects, icon: <Target className="w-4 h-4" /> },
    { label: 'Conversions', value: totalConverted, icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Pending $', value: `$${totalPending.toFixed(0)}`, icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Paid $', value: `$${totalPaid.toFixed(0)}`, icon: <DollarSign className="w-4 h-4" /> },
  ]

  // Filtered data
  const filteredProspects = prospects.filter(p => {
    if (repFilter && p.sales_rep_id !== repFilter) return false
    if (statusFilter && p.status !== statusFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  const pipelineStatuses: { value: ProspectStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'visited', label: 'Visited' },
    { value: 'interested', label: 'Interested' },
    { value: 'demo_scheduled', label: 'Demo' },
    { value: 'trial', label: 'Trial' },
    { value: 'converted', label: 'Converted' },
  ]

  const filteredMyProspects = pipelineTab === 'all'
    ? myProspects
    : myProspects.filter(p => p.status === pipelineTab)

  const tabs: { value: Tab; label: string }[] = [
    { value: 'pipeline', label: 'My Pipeline' },
    { value: 'overview', label: 'Overview' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'reps', label: 'Reps' },
    { value: 'prospects', label: 'All Prospects' },
    { value: 'commissions', label: 'Commissions' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header
        actions={tab === 'pipeline' ? (
          <button
            onClick={() => setShowProspectModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Prospect
          </button>
        ) : undefined}
      />

      {/* Tab nav */}
      <div className="border-b border-neutral-800 px-4">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.value
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* My Pipeline */}
        {tab === 'pipeline' && (
          <>
            {stats && <StatsBar stats={repStatsCards(stats)} />}

            <section>
              <h2 className="text-sm font-semibold text-neutral-300 mb-3">Pipeline</h2>
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {pipelineStatuses.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setPipelineTab(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      pipelineTab === t.value
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    {t.label}
                    {t.value !== 'all' && (
                      <span className="ml-1 text-neutral-500">
                        {myProspects.filter(p => p.status === t.value).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {filteredMyProspects.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  No prospects {pipelineTab !== 'all' ? `with status "${pipelineTab}"` : 'yet'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMyProspects.map(p => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      onStatusChange={handleStatusChange}
                      onProspectUpdated={updated => {
                        setMyProspects(prev => prev.map(x => x.id === updated.id ? updated : x))
                        setProspects(prev => prev.map(x => x.id === updated.id ? updated : x))
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-neutral-300 mb-3">Commissions</h2>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
                <CommissionTable commissions={myCommissions} />
              </div>
            </section>
          </>
        )}

        {/* Overview */}
        {tab === 'overview' && (
          <>
            <StatsBar stats={overviewStats} />

            <section>
              <h2 className="text-sm font-semibold text-neutral-300 mb-3">Leaderboard</h2>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-400 border-b border-neutral-700">
                        <th className="p-3">Rep</th>
                        <th className="p-3 text-center">Prospects</th>
                        <th className="p-3 text-center">Converted</th>
                        <th className="p-3 text-center">Rate</th>
                        <th className="p-3 text-right">Pending $</th>
                        <th className="p-3 text-right">Paid $</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {reps.map(r => {
                        const rate = r.total_prospects > 0
                          ? ((r.conversion_count / r.total_prospects) * 100).toFixed(0)
                          : '0'
                        return (
                          <tr key={r.id} className="text-neutral-200 hover:bg-neutral-800/50">
                            <td className="p-3 font-medium">{r.full_name}</td>
                            <td className="p-3 text-center">{r.total_prospects}</td>
                            <td className="p-3 text-center">{r.conversion_count}</td>
                            <td className="p-3 text-center text-neutral-400">{rate}%</td>
                            <td className="p-3 text-right">${Number(r.pending_commissions_total).toFixed(0)}</td>
                            <td className="p-3 text-right text-green-400">${Number(r.paid_commissions_total).toFixed(0)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Velocity */}
        {tab === 'velocity' && <VelocityTab />}

        {/* Reps */}
        {tab === 'reps' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-300">Sales Reps</h2>
              <button
                onClick={() => setShowCreateRep(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Rep
              </button>
            </div>

            <div className="space-y-3">
              {reps.map(r => (
                <div key={r.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{r.full_name}</p>
                      <p className="text-xs text-neutral-400">{r.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.is_manager && (
                        <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs rounded-full">Manager</span>
                      )}
                      <button
                        onClick={() => setPasswordModal({ id: r.id, name: r.full_name })}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        title="Set password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500">Prospects</span>
                      <p className="text-neutral-200 font-medium">{r.total_prospects}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Converted</span>
                      <p className="text-neutral-200 font-medium">{r.conversion_count}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Pending</span>
                      <p className="text-neutral-200 font-medium">${Number(r.pending_commissions_total).toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Paid</span>
                      <p className="text-green-400 font-medium">${Number(r.paid_commissions_total).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prospects */}
        {tab === 'prospects' && (
          <section>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-semibold text-neutral-300">All Prospects</h2>
              <select
                value={repFilter}
                onChange={e => setRepFilter(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
              >
                <option value="">All Reps</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="visited">Visited</option>
                <option value="interested">Interested</option>
                <option value="demo_scheduled">Demo Scheduled</option>
                <option value="trial">Trial</option>
                <option value="converted">Converted</option>
                <option value="not_interested">Not Interested</option>
              </select>
            </div>

            {filteredProspects.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-sm">No prospects found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProspects.map(p => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    onStatusChange={handleStatusChange}
                    onProspectUpdated={updated => setProspects(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    showRep
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Commissions */}
        {tab === 'commissions' && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-300 mb-4">Commission Approval</h2>
            <ApprovalQueue commissions={commissions} onAction={handleCommissionAction} />
          </section>
        )}
      </main>

      {/* Prospect Modal */}
      {showProspectModal && <ProspectModal onClose={() => setShowProspectModal(false)} onSubmit={handleCreateProspect} />}

      {/* Create Rep Modal */}
      {showCreateRep && <CreateRepModal onClose={() => setShowCreateRep(false)} onCreated={loadData} />}

      {/* Set Password Modal */}
      {passwordModal && (
        <SetPasswordModal
          repId={passwordModal.id}
          repName={passwordModal.name}
          onClose={() => setPasswordModal(null)}
        />
      )}
    </div>
  )
}

// ---- Inline modals ----

function CreateRepModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', is_manager: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.createRep({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password || undefined,
        is_manager: form.is_manager,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rep')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add Sales Rep</h2>
        {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg p-2 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <ModalField label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
          <ModalField label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
          <ModalField label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" />
          <ModalField label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.is_manager}
              onChange={e => setForm(f => ({ ...f, is_manager: e.target.checked }))}
              className="rounded border-neutral-600"
            />
            Manager access
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-neutral-400 hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SetPasswordModal({ repId, repName, onClose }: { repId: string; repName: string; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.setRepPassword(repId, password)
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Set Password</h2>
        <p className="text-sm text-neutral-400 mb-4">{repName}</p>
        {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg p-2 mb-3">{error}</p>}
        {success ? (
          <p className="text-sm text-green-400 bg-green-900/20 rounded-lg p-3">Password updated successfully</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <ModalField label="New Password" value={password} onChange={setPassword} type="password" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-neutral-400 hover:text-white text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50">
                {loading ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ModalField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
      />
    </div>
  )
}
