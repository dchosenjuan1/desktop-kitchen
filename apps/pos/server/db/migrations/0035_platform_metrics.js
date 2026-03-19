export const version = 35;
export const name = 'platform_metrics_alerts';

export async function up(sql) {
  // Platform metrics — time-series data for monitoring dashboard
  await sql`
    CREATE TABLE IF NOT EXISTS platform_metrics (
      id SERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metric_type VARCHAR(50) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      value DOUBLE PRECISION NOT NULL DEFAULT 0,
      metadata JSONB
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_platform_metrics_type_time ON platform_metrics (metric_type, recorded_at DESC)`;

  // Platform alerts — triggered by alert rules
  await sql`
    CREATE TABLE IF NOT EXISTS platform_alerts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      severity VARCHAR(20) NOT NULL DEFAULT 'warning',
      category VARCHAR(50),
      title VARCHAR(200) NOT NULL,
      message TEXT,
      metadata JSONB,
      acknowledged BOOLEAN NOT NULL DEFAULT false,
      acknowledged_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_platform_alerts_ack_time ON platform_alerts (acknowledged, created_at DESC)`;

  // Platform alert rules — configurable thresholds
  await sql`
    CREATE TABLE IF NOT EXISTS platform_alert_rules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      metric_type VARCHAR(50) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      condition VARCHAR(10) NOT NULL DEFAULT '>',
      threshold DOUBLE PRECISION NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'warning',
      cooldown_minutes INTEGER NOT NULL DEFAULT 5,
      webhook_url TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Seed default alert rules
  await sql`
    INSERT INTO platform_alert_rules (name, metric_type, metric_name, condition, threshold, severity, cooldown_minutes) VALUES
      ('Tenant pool utilization > 80%', 'pool', 'utilization_pct', '>', 80, 'critical', 5),
      ('Error rate > 5%', 'request', 'error_rate', '>', 5, 'warning', 10),
      ('Heap memory > 85%', 'memory', 'heap_pct', '>', 85, 'warning', 10),
      ('External service down', 'service', 'postgres', '>=', 2, 'critical', 5),
      ('Pool reserve failures', 'pool', 'failures', '>', 0, 'critical', 5)
    ON CONFLICT DO NOTHING
  `;
}
