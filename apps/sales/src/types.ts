export interface SalesRep {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_manager: boolean
  is_active: boolean
  created_at: string
}

export interface RepStats {
  total_prospects: number
  conversion_count: number
  pending_commissions_total: number
  approved_commissions_total: number
  paid_commissions_total: number
}

export interface RepWithStats extends SalesRep {
  total_prospects: number
  conversion_count: number
  pending_commissions_total: number
  approved_commissions_total: number
  paid_commissions_total: number
}

export type ProspectStatus = 'visited' | 'interested' | 'demo_scheduled' | 'trial' | 'converted' | 'not_interested'

export interface Prospect {
  id: string
  sales_rep_id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  neighborhood: string | null
  notes: string | null
  status: ProspectStatus
  converted_tenant_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  // joined fields (manager view)
  sales_rep_name?: string
}

export type CommissionStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface Commission {
  id: string
  sales_rep_id: string
  prospect_id: string
  tenant_id: string
  plan_name: string
  plan_price_usd: number
  commission_amount_usd: number
  status: CommissionStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  // joined fields
  prospect_business_name?: string
  prospect_contact_name?: string
  prospect_status?: string
  tenant_name?: string
  tenant_plan?: string
  approved_by_name?: string
  sales_rep_name?: string
}

// Velocity analytics
export interface MonthlyBucket {
  month: string
  count: number
}

export interface MonthlyMrr {
  month: string
  mrr: number
}

export interface CycleByRep {
  rep_id: string
  rep_name: string
  avg_days: number
  count: number
}

export interface ConversionRateByRep {
  rep_id: string
  rep_name: string
  rate: number
  total: number
  converted: number
}

export interface RepLeaderboardEntry {
  id: string
  name: string
  prospects_logged: number
  converted: number
  conversion_rate: number
  avg_cycle_days: number
  mrr_attributed: number
  commission_earned: number
  weekly_conversions: number[]
}

export interface CohortRow {
  cohort_week: string
  logged: number
  within_7d: number
  within_14d: number
  within_30d: number
  within_60d: number
  within_90d_plus: number
}

export interface VelocityData {
  monthly_pipeline: MonthlyBucket[]
  monthly_conversions: MonthlyBucket[]
  monthly_mrr_attributed: MonthlyMrr[]
  avg_cycle_days: { overall: number; by_rep: CycleByRep[] }
  conversion_rate_overall: { rate: number; total: number; converted: number }
  conversion_rate_by_rep: ConversionRateByRep[]
  sales_velocity_score: number
  total_mrr: number
  rep_leaderboard: RepLeaderboardEntry[]
  cohort_data: CohortRow[]
}

export interface TenantSummary {
  id: string
  name: string
  subdomain: string
  plan: string
}

export interface DemoStatusResponse {
  hasTenant: boolean
  tenant_id: string | null
  tenant_name: string | null
  hasDemo: boolean
  counts: {
    orders: number
    customers: number
    delivery_orders: number
    ai_snapshots: number
    financial_actuals: number
  } | null
}

export interface LoginResponse {
  token: string
  rep: SalesRep
}

export interface ProfileResponse {
  rep: SalesRep
  stats: RepStats
}
