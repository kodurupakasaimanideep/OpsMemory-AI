import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Clock, Layers, Zap, CheckCircle2 } from 'lucide-react';
import { fetchAnalytics } from '../services/api';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetchAnalytics();
      if (res) setData(res);
    }
    load();
  }, []);

  const metrics = data?.metrics || {
    incidents_this_month: 38,
    average_resolution_time_min: 18,
    repeat_incident_rate_percent: 21,
    resolutions_from_memory_percent: 64,
  };

  const rootCauseDistribution = data?.root_cause_distribution || [
    { category: 'Database Connection / Pool', count: 14, percentage: 37, color: 'var(--accent-cyan)' },
    { category: 'Deployment / Config Mismatch', count: 10, percentage: 26, color: 'var(--accent-purple)' },
    { category: 'Network & Gateway Timeouts', count: 8, percentage: 21, color: 'var(--accent-amber)' },
    { category: 'Memory / OOM / Pod Crashes', count: 6, percentage: 16, color: 'var(--accent-rose)' },
  ];

  const topRecurring = data?.top_recurring_incidents || [
    { title: 'Database connection exhaustion', occurrences: 7, avg_mttr: '14 min', resolved_by_memory: '100%' },
    { title: 'Deployment configuration mismatch', occurrences: 5, avg_mttr: '19 min', resolved_by_memory: '80%' },
    { title: 'API Gateway 504 timeout', occurrences: 4, avg_mttr: '22 min', resolved_by_memory: '75%' },
    { title: 'Memory pressure & OOMKilled', occurrences: 3, avg_mttr: '25 min', resolved_by_memory: '66%' },
  ];

  return (
    <div className="page-view">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge">
            <BarChart3 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Incident Analytics</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Operational health benchmarks, root-cause patterns, and institutional memory ROI
            </div>
          </div>
        </div>
      </div>

      {/* 4 Analytics KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Incidents This Month</div>
          <div className="stat-value">{metrics.incidents_this_month}</div>
          <div className="stat-sub">Across 18 microservices</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Average Resolution Time</div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            {metrics.average_resolution_time_min} min
          </div>
          <div className="stat-sub">Down from 42 min baseline</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Repeat Incident Rate</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            {metrics.repeat_incident_rate_percent}%
          </div>
          <div className="stat-sub">Flagged by pre-deploy checks</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Resolutions from Memory</div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {metrics.resolutions_from_memory_percent}%
          </div>
          <div className="stat-sub">Resolved via Hindsight matches</div>
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Root Cause Distribution */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '18px' }}>
            ROOT CAUSE PATTERNS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {rootCauseDistribution.map((item: any, idx: number) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{item.category}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.count} incidents ({item.percentage}%)</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${item.percentage * 2}%`,
                      background: item.color || 'var(--accent-cyan)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recurring Incidents */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '18px' }}>
            TOP RECURRING INCIDENTS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topRecurring.map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Occurrences: <strong style={{ color: 'var(--accent-amber)' }}>{item.occurrences}</strong> • Avg MTTR: {item.avg_mttr}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Memory Resolution</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {item.resolved_by_memory}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
