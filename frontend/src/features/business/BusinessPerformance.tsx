/**
 * VYAVSAYMITRA — Business Performance & Outcomes Feature (Phase 11)
 *
 * Visualizes deterministic Projected vs Actual metrics, tracks recommendation
 * execution effectiveness, and allows recording verified real-world outcomes.
 */

import React, { useState, useEffect } from 'react';
import { outcomesApi } from '../../api/apiClient';
import './BusinessPerformance.css';

interface BusinessPerformanceProps {
  businessId: string;
}

export const BusinessPerformance: React.FC<BusinessPerformanceProps> = ({ businessId }) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [effectivenessData, setEffectivenessData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form state for recording an outcome
  const [outcomeType, setOutcomeType] = useState<string>('actual_investment');
  const [value, setValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('INR');
  const [period, setPeriod] = useState<string>('');
  const [source, setSource] = useState<string>('user_reported');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [perfRes, effRes, anRes] = await Promise.all([
        outcomesApi.getPerformance(businessId).catch(() => null),
        outcomesApi.getEffectiveness(businessId).catch(() => null),
        outcomesApi.getAnalytics(businessId).catch(() => null)
      ]);

      if (perfRes?.performance) setPerformanceData(perfRes.performance);
      if (effRes?.effectiveness) setEffectivenessData(effRes.effectiveness);
      if (anRes?.metrics) setAnalyticsData(anRes.metrics);
    } catch (_) {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setError('Please enter a valid numeric value.');
      setSaving(false);
      return;
    }

    try {
      await outcomesApi.create(businessId, {
        outcome_type: outcomeType,
        value: numVal,
        unit,
        period: period.trim(),
        source,
        notes: notes.trim()
      });
      setValue('');
      setNotes('');
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record outcome. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !performanceData) {
    return (
      <div className="biz-performance-container">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          Loading performance metrics...
        </div>
      </div>
    );
  }

  const comparisons = performanceData?.comparisons || [];
  const recordedOutcomes = performanceData?.allRecordedOutcomes || [];

  return (
    <div className="biz-performance-container">
      {/* Header */}
      <div className="biz-performance-header">
        <div className="biz-performance-title">
          <h2>Business Performance & Outcomes</h2>
          <p>Deterministic verification comparing baseline projections against real-world progress</p>
        </div>
        <button
          className="biz-record-outcome-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Close Form' : '+ Record Real-World Outcome'}
        </button>
      </div>

      {/* Record Outcome Form */}
      {showForm && (
        <div className="biz-outcome-form-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Record Actual Business Milestone or Metric
          </h3>
          {error && <div style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
          <form onSubmit={handleRecordOutcome}>
            <div className="biz-form-row">
              <div className="biz-field">
                <label>Metric Type</label>
                <select value={outcomeType} onChange={e => setOutcomeType(e.target.value)}>
                  <option value="actual_investment">Actual Investment (Total Capital)</option>
                  <option value="actual_monthly_revenue">Actual Monthly Revenue</option>
                  <option value="actual_operating_cost">Actual Operating Cost</option>
                  <option value="actual_production_quantity">Actual Production Output</option>
                  <option value="funding_received">Funding / Bank Loan Received</option>
                  <option value="subsidy_received">Government Subsidy Received</option>
                </select>
              </div>

              <div className="biz-field">
                <label>Actual Value</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 250000"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  required
                />
              </div>

              <div className="biz-field">
                <label>Unit</label>
                <input
                  type="text"
                  placeholder="e.g. INR, INR/month, quintals"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="biz-form-row">
              <div className="biz-field">
                <label>Reporting Period (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. FY 2025-26, Aug 2026"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                />
              </div>

              <div className="biz-field">
                <label>Verification Source</label>
                <select value={source} onChange={e => setSource(e.target.value)}>
                  <option value="user_reported">User Reported (Self-Declared)</option>
                  <option value="verified_document">Verified Document (Bank/Bill)</option>
                  <option value="application_record">Application Record</option>
                </select>
              </div>

              <div className="biz-field">
                <label>Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Details, bill reference, invoice number..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="biz-record-outcome-btn"
                style={{ background: '#e2e8f0', color: '#475569' }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="biz-record-outcome-btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards: Projected vs Actual */}
      <div className="biz-perf-grid">
        {comparisons.map((c: any) => {
          const isAvail = c.status === 'available';
          const varianceClass =
            c.variance > 0
              ? 'variance-positive'
              : c.variance < 0
              ? 'variance-negative'
              : 'variance-neutral';

          return (
            <div key={c.metricKey} className="biz-perf-kpi-card">
              <div className="biz-perf-kpi-title">
                <span>{c.metric}</span>
                <span className={`biz-val-badge ${isAvail ? 'badge-available' : 'badge-pending'}`}>
                  {isAvail ? c.source?.replace('_', ' ') : 'Not enough data'}
                </span>
              </div>

              <div className="biz-perf-values">
                <div className="biz-val-group">
                  <span className="biz-val-label">Projected</span>
                  <span className="biz-val-number">
                    {c.projected !== null ? `₹${Number(c.projected).toLocaleString('en-IN')}` : 'N/A'}
                  </span>
                </div>
                <div className="biz-val-group" style={{ textAlign: 'right' }}>
                  <span className="biz-val-label">Actual</span>
                  <span className="biz-val-number">
                    {c.actual !== null ? `₹${Number(c.actual).toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>
              </div>

              {isAvail && (
                <div className={`biz-variance-badge ${varianceClass}`}>
                  Variance: {c.variance > 0 ? '+' : ''}
                  ₹{Number(c.variance).toLocaleString('en-IN')} ({c.variancePercentage > 0 ? '+' : ''}
                  {c.variancePercentage}%)
                </div>
              )}

              {!isAvail && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {c.status}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendation Effectiveness Section */}
      {effectivenessData && (
        <div className="biz-perf-section">
          <h3>
            <span>🎯</span> Recommendation Execution Effectiveness
          </h3>
          <div className="biz-perf-grid" style={{ marginBottom: '1rem' }}>
            <div className="biz-perf-kpi-card" style={{ background: '#f8fafc' }}>
              <span className="biz-val-label">Recommendations Tracked</span>
              <span className="biz-val-number">{effectivenessData.totalRecommendations}</span>
            </div>
            <div className="biz-perf-kpi-card" style={{ background: '#f8fafc' }}>
              <span className="biz-val-label">Acceptance Rate</span>
              <span className="biz-val-number" style={{ color: '#059669' }}>
                {effectivenessData.acceptanceRate}%
              </span>
            </div>
            <div className="biz-perf-kpi-card" style={{ background: '#f8fafc' }}>
              <span className="biz-val-label">Task Conversion Rate</span>
              <span className="biz-val-number" style={{ color: '#0284c7' }}>
                {effectivenessData.conversionRate}%
              </span>
            </div>
            <div className="biz-perf-kpi-card" style={{ background: '#f8fafc' }}>
              <span className="biz-val-label">Execution Completion</span>
              <span className="biz-val-number" style={{ color: '#7c3aed' }}>
                {effectivenessData.completionRate}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execution Readiness Summary */}
      {analyticsData && (
        <div className="biz-perf-section">
          <h3>
            <span>📋</span> Operational Execution Health
          </h3>
          <div className="biz-perf-grid">
            <div className="biz-perf-kpi-card">
              <span className="biz-val-label">Task Completion Rate</span>
              <span className="biz-val-number">{analyticsData.execution?.taskCompletionRate}%</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {analyticsData.execution?.completedTasks} of {analyticsData.execution?.totalTasks} milestones done
              </span>
            </div>
            <div className="biz-perf-kpi-card">
              <span className="biz-val-label">Document Readiness</span>
              <span className="biz-val-number">{analyticsData.documentation?.docReadinessRate}%</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {analyticsData.documentation?.verifiedDocuments} verified statutory docs
              </span>
            </div>
            <div className="biz-perf-kpi-card">
              <span className="biz-val-label">Bankable DPR Status</span>
              <span className="biz-val-number">
                {analyticsData.dpr?.hasImmutableSnapshot ? '✓ Verified' : 'Pending'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {analyticsData.dpr?.versionCount} immutable snapshot(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Outcomes History Ledger */}
      <div className="biz-perf-section">
        <h3>
          <span>📖</span> Recorded Real-World Outcomes Ledger
        </h3>
        {recordedOutcomes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            No actual outcomes recorded yet. Use the "+ Record Real-World Outcome" button above to log your verified milestones.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="biz-perf-table">
              <thead>
                <tr>
                  <th>Outcome Type</th>
                  <th>Value</th>
                  <th>Period</th>
                  <th>Source</th>
                  <th>Recorded At</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {recordedOutcomes.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.outcome_type?.replace(/_/g, ' ')}</td>
                    <td>
                      {typeof item.value === 'number' ? `₹${item.value.toLocaleString('en-IN')}` : item.value}{' '}
                      {item.unit}
                    </td>
                    <td>{item.period || '—'}</td>
                    <td>
                      <span className="biz-val-badge badge-available">
                        {item.source?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
