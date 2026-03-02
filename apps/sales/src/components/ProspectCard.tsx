import { MapPin, Clock } from 'lucide-react'
import type { Prospect, ProspectStatus } from '../types'
import StatusBadge from './StatusBadge'
import DemoDataButton from './DemoDataButton'

const statusOptions: { value: ProspectStatus; label: string }[] = [
  { value: 'visited', label: 'Visited' },
  { value: 'interested', label: 'Interested' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'trial', label: 'Trial' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not Interested' },
]

interface Props {
  prospect: Prospect
  onStatusChange: (id: string, status: ProspectStatus) => void
  showRep?: boolean
}

export default function ProspectCard({ prospect, onStatusChange, showRep }: Props) {
  const timeAgo = formatTimeAgo(prospect.updated_at)

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 hover:border-neutral-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{prospect.business_name}</h3>
          {prospect.contact_name && (
            <p className="text-xs text-neutral-400 truncate">{prospect.contact_name}</p>
          )}
          {showRep && prospect.sales_rep_name && (
            <p className="text-xs text-brand-400 truncate">{prospect.sales_rep_name}</p>
          )}
        </div>
        <StatusBadge status={prospect.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
        {prospect.neighborhood && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {prospect.neighborhood}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo}
        </span>
      </div>

      <select
        value={prospect.status}
        onChange={e => onStatusChange(prospect.id, e.target.value as ProspectStatus)}
        className="w-full bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
      >
        {statusOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <DemoDataButton prospect={prospect} />
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
