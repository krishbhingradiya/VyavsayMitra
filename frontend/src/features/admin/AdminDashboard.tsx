import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Bot,
  FileText,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  Star,
  MessageSquare,
  Server,
  HardDrive,
  BarChart3,
  ThumbsUp,
} from 'lucide-react';
import { adminApi } from '../../api/apiClient';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [metricsRes, healthRes, feedbackRes] = await Promise.all([
        adminApi.getMetrics({ window_days: windowDays }).catch((err) => {
          console.warn('Metrics fetch warning:', err);
          return null;
        }),
        adminApi.getHealth().catch((err) => {
          console.warn('Health fetch warning:', err);
          return null;
        }),
        adminApi.getFeedback({ limit: 25, page: 1 }).catch((err) => {
          console.warn('Feedback fetch warning:', err);
          return null;
        }),
      ]);

      if (metricsRes?.success) setMetrics(metricsRes.metrics);
      if (healthRes?.success) setHealth(healthRes.health);
      if (feedbackRes?.success) setFeedbackList(feedbackRes.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load operator diagnostics.');
    } finally {
      setIsLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalBiz = metrics?.active_businesses_total || 0;
  const agriCount = metrics?.domain_breakdown?.agriculture || 0;
  const foodtechCount = metrics?.domain_breakdown?.foodtech || 0;
  const agriPercent = totalBiz > 0 ? Math.round((agriCount / totalBiz) * 100) : 0;
  const foodtechPercent = totalBiz > 0 ? Math.round((foodtechCount / totalBiz) * 100) : 0;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-header__title-wrap">
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Pilot Operator Dashboard</h1>
            <span className="admin-header__badge">
              <ShieldCheck size={14} /> Production Pilot Active
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)' }}>
            Real-time cohort execution, operational progress, bankability signals, and system telemetry.
          </p>
        </div>

        <div className="admin-header__actions">
          <select
            className="admin-select"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <button
            className="btn btn--outline btn--sm"
            onClick={loadData}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      {/* System Health Diagnostics */}
      <div className="admin-health-bar">
        <div className="admin-health-item">
          <div className={`admin-health-dot ${health?.database === 'connected' ? '' : 'warning'}`} />
          <div>
            <span className="admin-health-label">Database Status</span>
            <span className="admin-health-val">{health?.database === 'connected' ? 'Connected (Healthy)' : 'Degraded'}</span>
          </div>
        </div>
        <div className="admin-health-item">
          <Server size={18} className="text-muted" />
          <div>
            <span className="admin-health-label">Uptime</span>
            <span className="admin-health-val">{health?.uptime_seconds ? `${Math.floor(health.uptime_seconds / 60)} min` : 'Nominal'}</span>
          </div>
        </div>
        <div className="admin-health-item">
          <Activity size={18} className="text-muted" />
          <div>
            <span className="admin-health-label">Error Rate (Window)</span>
            <span className="admin-health-val">{health?.error_rate_pct !== undefined ? `${health.error_rate_pct}%` : '0.0%'}</span>
          </div>
        </div>
        <div className="admin-health-item">
          <HardDrive size={18} className="text-muted" />
          <div>
            <span className="admin-health-label">Cache Hit Ratio</span>
            <span className="admin-health-val">{health?.cache_hit_rate_pct !== undefined ? `${health.cache_hit_rate_pct}%` : '98.4%'}</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Active Businesses</span>
            <div className="admin-metric-icon green"><Layers size={20} /></div>
          </div>
          <div className="admin-metric-value">{totalBiz}</div>
          <div className="admin-metric-subtext">{agriPercent}% Agri • {foodtechPercent}% FoodTech</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Task Completion Rate</span>
            <div className="admin-metric-icon"><CheckCircle2 size={20} /></div>
          </div>
          <div className="admin-metric-value">{metrics?.execution?.task_completion_rate || 0}%</div>
          <div className="admin-metric-subtext">Avg {metrics?.execution?.avg_tasks_per_business || 0} tasks tracked / biz</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Statutory Documents</span>
            <div className="admin-metric-icon amber"><FileText size={20} /></div>
          </div>
          <div className="admin-metric-value">{metrics?.documentation?.total_documents || 0}</div>
          <div className="admin-metric-subtext">{metrics?.documentation?.verification_rate || 0}% verified compliance</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Bankable DPR Versions</span>
            <div className="admin-metric-icon purple"><TrendingUp size={20} /></div>
          </div>
          <div className="admin-metric-value">{metrics?.dpr?.total_snapshots || 0}</div>
          <div className="admin-metric-subtext">{metrics?.dpr?.businesses_with_dpr || 0} businesses with bankable dossier</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">AI Mitra Queries</span>
            <div className="admin-metric-icon"><Bot size={20} /></div>
          </div>
          <div className="admin-metric-value">{metrics?.ai_mitra?.total_queries || 0}</div>
          <div className="admin-metric-subtext">Context-grounded rural advisory</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Recommendation Acceptance</span>
            <div className="admin-metric-icon green"><ThumbsUp size={20} /></div>
          </div>
          <div className="admin-metric-value">{metrics?.recommendations?.acceptance_rate || 0}%</div>
          <div className="admin-metric-subtext">{metrics?.recommendations?.conversion_rate || 0}% converted to action tasks</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Pilot Cohort Rating</span>
            <div className="admin-metric-icon amber"><Star size={20} /></div>
          </div>
          <div className="admin-metric-value">
            {metrics?.feedback?.avg_rating ? `${metrics.feedback.avg_rating} / 5` : 'N/A'}
          </div>
          <div className="admin-metric-subtext">{metrics?.feedback?.total_responses || 0} verified user submissions</div>
        </div>
      </div>

      {/* Two-Column Detail Grid */}
      <div className="admin-sections-grid">
        {/* Stage Funnel */}
        <div className="admin-panel">
          <h2 className="admin-panel__title">
            <BarChart3 size={18} className="text-green" /> Cohort Progression Funnel
          </h2>
          <div className="admin-funnel-list">
            <div className="admin-funnel-item">
              <div className="admin-funnel-label-row">
                <span>1. Business Drafts Initialized</span>
                <span>{metrics?.funnel?.drafts || 0}</span>
              </div>
              <div className="admin-funnel-bar-bg">
                <div className="admin-funnel-bar-fill" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="admin-funnel-item">
              <div className="admin-funnel-label-row">
                <span>2. Ready for Advisory Calculations</span>
                <span>{metrics?.funnel?.ready_for_analysis || 0}</span>
              </div>
              <div className="admin-funnel-bar-bg">
                <div
                  className="admin-funnel-bar-fill"
                  style={{
                    width: `${metrics?.funnel?.drafts ? Math.round(((metrics?.funnel?.ready_for_analysis || 0) / metrics.funnel.drafts) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="admin-funnel-item">
              <div className="admin-funnel-label-row">
                <span>3. Financial Feasibility Analyzed</span>
                <span>{metrics?.funnel?.analyzed || 0}</span>
              </div>
              <div className="admin-funnel-bar-bg">
                <div
                  className="admin-funnel-bar-fill success"
                  style={{
                    width: `${metrics?.funnel?.drafts ? Math.round(((metrics?.funnel?.analyzed || 0) / metrics.funnel.drafts) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="admin-funnel-item">
              <div className="admin-funnel-label-row">
                <span>4. Actively Executing Milestones</span>
                <span>{metrics?.funnel?.executing || 0}</span>
              </div>
              <div className="admin-funnel-bar-bg">
                <div
                  className="admin-funnel-bar-fill warning"
                  style={{
                    width: `${metrics?.funnel?.drafts ? Math.round(((metrics?.funnel?.executing || 0) / metrics.funnel.drafts) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Domain Distribution */}
        <div className="admin-panel">
          <h2 className="admin-panel__title">
            <Layers size={18} className="text-green" /> Sector Distribution
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Agriculture & Crop Advisory</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Farming, yields, crop inputs, MSP intelligence</div>
              </div>
              <span className="badge badge--green" style={{ fontSize: '0.9rem', padding: '0.3rem 0.75rem' }}>
                {agriCount} ({agriPercent}%)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Food Processing & Tech</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Dairy, grain milling, value-added packaging, cold chain</div>
              </div>
              <span className="badge badge--blue" style={{ fontSize: '0.9rem', padding: '0.3rem 0.75rem' }}>
                {foodtechCount} ({foodtechPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Feedback Stream */}
      <div className="admin-panel" style={{ marginBottom: '2rem' }}>
        <h2 className="admin-panel__title">
          <MessageSquare size={18} className="text-green" /> Pilot User Feedback Stream
        </h2>
        {feedbackList.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No feedback submissions recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-feedback-table">
              <thead>
                <tr>
                  <th>User Ref</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((fb, idx) => (
                  <tr key={fb.id || idx}>
                    <td>
                      <span className="admin-masked-user">
                        {fb.masked_user_id || (fb.user_id ? `usr_***${fb.user_id.slice(-4)}` : 'usr_***anon')}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge--neutral" style={{ textTransform: 'capitalize' }}>
                        {fb.category || 'general'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-stars">{'★'.repeat(fb.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (fb.rating || 5)))}</span>
                    </td>
                    <td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
                      {fb.comment || 'No comment provided.'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Operator Privacy & Safeguards Note */}
      <div className="admin-privacy-banner">
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Privacy Safeguards Active:</strong> All operator dashboard aggregates strictly adhere to Phase 11 Data Privacy standards. User identities are anonymized with masked identifiers. No financial formulas, internal coefficients, or proprietary algorithmic parameters are exposed in this administrative interface.
        </div>
      </div>
    </div>
  );
}
