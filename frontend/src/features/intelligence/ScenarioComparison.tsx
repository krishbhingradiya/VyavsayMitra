/**
 * VYAVSAYMITRA — Scenario Analysis Comparison Component
 *
 * Displays BASE / CONSERVATIVE / UPSIDE scenario comparison with visual bars,
 * viability indicators, and transparent assumptions.
 */
import { useState, useEffect } from 'react';
import { intelligenceApi } from '../../api/apiClient';

interface ScenarioData {
  scenarioKey: string;
  label: string;
  adjustedRevenue: number;
  adjustedOperatingCost: number;
  adjustedNetProfit: number;
  adjustedRoi: number;
  profitMarginPct: number;
  breakEvenMonths: number | null;
  dscr: number | null;
  isViable: boolean;
  dataStatus: string;
  assumptions: string[];
}

interface ScenarioResult {
  status: string;
  baseMetrics: any;
  scenarios: ScenarioData[];
  provenance: any;
}

interface Props {
  businessId: string;
  analysisStatus?: string;
}

export default function ScenarioComparison({ businessId, analysisStatus }: Props) {
  const [data, setData] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    if (businessId && analysisStatus === 'ANALYSIS_COMPLETE') {
      loadScenarios();
    }
  }, [businessId, analysisStatus]);

  async function loadScenarios() {
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceApi.getScenarioAnalysis(businessId);
      if (res.success && res.data?.status === 'SUCCESS') {
        setData(res.data);
      } else {
        setError(res.data?.message || 'Could not generate scenarios');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scenario analysis');
    } finally {
      setLoading(false);
    }
  }

  if (analysisStatus !== 'ANALYSIS_COMPLETE') {
    return (
      <div className="scenario-comparison-empty">
        <div className="empty-icon">📊</div>
        <p>Complete business analysis to view scenario comparison</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scenario-loading">
        <div className="pulse-loader"></div>
        <p>Generating scenario analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={loadScenarios} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!data || !data.scenarios || data.scenarios.length === 0) return null;

  const maxRevenue = Math.max(...data.scenarios.map(s => Math.abs(s.adjustedRevenue)));
  const maxProfit = Math.max(...data.scenarios.map(s => Math.abs(s.adjustedNetProfit)));

  function fmt(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  }

  function getScenarioColor(key: string) {
    if (key === 'conservative') return 'var(--color-amber, #f59e0b)';
    if (key === 'upside') return 'var(--color-green, #10b981)';
    return 'var(--color-primary, #6366f1)';
  }

  function getScenarioIcon(key: string) {
    if (key === 'conservative') return '🛡️';
    if (key === 'upside') return '🚀';
    return '📐';
  }

  return (
    <div className="scenario-comparison">
      <div className="scenario-header">
        <h3>
          <span className="header-icon">📊</span>
          Scenario Analysis
        </h3>
        <div className="scenario-badges">
          <span className="data-badge formula">Deterministic Engine</span>
          <button
            className="toggle-assumptions"
            onClick={() => setShowAssumptions(!showAssumptions)}
          >
            {showAssumptions ? 'Hide' : 'Show'} Assumptions
          </button>
        </div>
      </div>

      <div className="scenario-grid">
        {data.scenarios.map(scenario => (
          <div
            key={scenario.scenarioKey}
            className={`scenario-card ${scenario.scenarioKey} ${scenario.isViable ? 'viable' : 'not-viable'}`}
            style={{ '--scenario-color': getScenarioColor(scenario.scenarioKey) } as any}
          >
            <div className="scenario-card-header">
              <span className="scenario-icon">{getScenarioIcon(scenario.scenarioKey)}</span>
              <h4>{scenario.label}</h4>
              <span className={`data-status ${scenario.dataStatus.toLowerCase()}`}>
                {scenario.dataStatus}
              </span>
            </div>

            <div className="scenario-metrics">
              <div className="metric">
                <span className="metric-label">Revenue</span>
                <div className="metric-bar-container">
                  <div
                    className="metric-bar revenue"
                    style={{ width: `${(scenario.adjustedRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="metric-value">{fmt(scenario.adjustedRevenue)}</span>
              </div>

              <div className="metric">
                <span className="metric-label">Operating Cost</span>
                <span className="metric-value cost">{fmt(scenario.adjustedOperatingCost)}</span>
              </div>

              <div className="metric highlight">
                <span className="metric-label">Net Profit</span>
                <div className="metric-bar-container">
                  <div
                    className={`metric-bar profit ${scenario.adjustedNetProfit < 0 ? 'negative' : ''}`}
                    style={{ width: `${Math.min(100, (Math.abs(scenario.adjustedNetProfit) / maxProfit) * 100)}%` }}
                  />
                </div>
                <span className={`metric-value ${scenario.adjustedNetProfit < 0 ? 'negative' : 'positive'}`}>
                  {scenario.adjustedNetProfit < 0 ? '-' : ''}{fmt(Math.abs(scenario.adjustedNetProfit))}
                </span>
              </div>

              <div className="metric-row">
                <div className="mini-metric">
                  <span className="mini-label">ROI</span>
                  <span className={`mini-value ${scenario.adjustedRoi >= 20 ? 'good' : scenario.adjustedRoi >= 10 ? 'moderate' : 'low'}`}>
                    {scenario.adjustedRoi}%
                  </span>
                </div>
                <div className="mini-metric">
                  <span className="mini-label">Margin</span>
                  <span className="mini-value">{scenario.profitMarginPct}%</span>
                </div>
                {scenario.breakEvenMonths && (
                  <div className="mini-metric">
                    <span className="mini-label">Break-even</span>
                    <span className="mini-value">{scenario.breakEvenMonths} mo</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`viability-badge ${scenario.isViable ? 'viable' : 'not-viable'}`}>
              {scenario.isViable ? '✅ Viable' : '⚠️ Not Viable'}
            </div>
          </div>
        ))}
      </div>

      {showAssumptions && (
        <div className="assumptions-panel">
          <h4>Scenario Assumptions & Methodology</h4>
          {data.scenarios.map(s => (
            <div key={s.scenarioKey} className="assumption-group">
              <h5 style={{ color: getScenarioColor(s.scenarioKey) }}>
                {getScenarioIcon(s.scenarioKey)} {s.label}
              </h5>
              <ul>
                {s.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          ))}
          <div className="provenance-note">
            <strong>Source:</strong> {data.provenance?.source || 'Deterministic Engine'}
            <br />
            <strong>Method:</strong> {data.provenance?.method || 'Configurable multiplier-based sensitivity analysis'}
          </div>
        </div>
      )}

      <style>{`
        .scenario-comparison {
          background: var(--card-bg, #1a1a2e);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .scenario-header h3 {
          margin: 0;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-icon { font-size: 1.3rem; }
        .scenario-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .data-badge {
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .data-badge.formula {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
        }
        .toggle-assumptions {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-assumptions:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .scenario-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .scenario-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--scenario-color);
        }
        .scenario-card:hover {
          border-color: var(--scenario-color);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .scenario-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .scenario-icon { font-size: 1.3rem; }
        .scenario-card-header h4 {
          margin: 0;
          font-size: 0.95rem;
          flex: 1;
        }
        .data-status {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .data-status.verified {
          background: rgba(16,185,129,0.15);
          color: #6ee7b7;
        }
        .data-status.projected {
          background: rgba(245,158,11,0.15);
          color: #fcd34d;
        }
        .scenario-metrics { display: flex; flex-direction: column; gap: 10px; }
        .metric { display: flex; flex-direction: column; gap: 4px; }
        .metric-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-bar-container {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .metric-bar {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
        }
        .metric-bar.revenue { background: var(--scenario-color); }
        .metric-bar.profit { background: #10b981; }
        .metric-bar.profit.negative { background: #ef4444; }
        .metric-value {
          font-size: 0.9rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .metric-value.cost { color: rgba(255,255,255,0.6); }
        .metric-value.positive { color: #6ee7b7; }
        .metric-value.negative { color: #fca5a5; }
        .metric.highlight { padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); }
        .metric-row {
          display: flex;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .mini-metric { display: flex; flex-direction: column; gap: 2px; }
        .mini-label {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
        }
        .mini-value { font-size: 0.85rem; font-weight: 600; }
        .mini-value.good { color: #6ee7b7; }
        .mini-value.moderate { color: #fcd34d; }
        .mini-value.low { color: #fca5a5; }
        .viability-badge {
          margin-top: 12px;
          text-align: center;
          padding: 6px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .viability-badge.viable { background: rgba(16,185,129,0.1); color: #6ee7b7; }
        .viability-badge.not-viable { background: rgba(239,68,68,0.1); color: #fca5a5; }
        .assumptions-panel {
          margin-top: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .assumptions-panel h4 {
          margin: 0 0 12px;
          font-size: 0.9rem;
        }
        .assumption-group { margin-bottom: 12px; }
        .assumption-group h5 {
          margin: 0 0 4px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .assumption-group ul {
          margin: 0;
          padding-left: 20px;
          list-style: disc;
        }
        .assumption-group li {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 2px;
        }
        .provenance-note {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(99,102,241,0.08);
          border-radius: 8px;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.6);
        }
        .scenario-comparison-empty, .scenario-loading, .scenario-error {
          text-align: center;
          padding: 32px;
          color: rgba(255,255,255,0.5);
        }
        .empty-icon { font-size: 2rem; margin-bottom: 8px; }
        .pulse-loader {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        .error-icon { font-size: 1.5rem; }
        .retry-btn {
          margin-top: 8px;
          padding: 6px 16px;
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .retry-btn:hover { background: rgba(99,102,241,0.25); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .scenario-grid { grid-template-columns: 1fr; }
          .scenario-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
