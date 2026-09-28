/**
 * VYAVSAYMITRA — Loan & Funding Comparison Component
 *
 * Displays side-by-side loan scenario comparison with EMI, interest,
 * cash flow impact, and debt burden rating.
 */
import { useState, useEffect } from 'react';
import { intelligenceApi } from '../../api/apiClient';

interface LoanScenario {
  id: string;
  name: string;
  status: string;
  loanAmount: number;
  originalLoanAmount?: number;
  subsidyAmount?: number;
  subsidyPct?: number;
  interestRate: number;
  tenureYears: number;
  moratoriumMonths: number;
  emi: number;
  totalRepayment: number;
  totalInterest: number;
  moratoriumInterest?: number;
  cashFlowImpact: {
    estimatedMonthlyProfit: number | null;
    monthlyEmi: number;
    cashFlowAfterEmi: number | null;
    emiAsPercentOfProfit: number | null;
    debtBurdenRating: string;
  };
  source: string;
  dataStatus: string;
}

interface LoanResult {
  status: string;
  totalProjectCost: number;
  promoterEquity: number;
  fundingGap: number;
  scenarios: LoanScenario[];
  provenance: any;
}

interface Props {
  businessId: string;
  analysisStatus?: string;
}

export default function LoanComparison({ businessId, analysisStatus }: Props) {
  const [data, setData] = useState<LoanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);

  useEffect(() => {
    if (businessId && analysisStatus === 'ANALYSIS_COMPLETE') {
      loadComparison();
    }
  }, [businessId, analysisStatus]);

  async function loadComparison() {
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceApi.getLoanComparison(businessId);
      if (res.success && res.data?.status === 'SUCCESS') {
        setData(res.data);
        if (res.data.scenarios?.length > 0) {
          setSelectedLoan(res.data.scenarios[0].id);
        }
      } else {
        setError(res.data?.message || 'Could not generate loan comparison');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load loan comparison');
    } finally {
      setLoading(false);
    }
  }

  if (analysisStatus !== 'ANALYSIS_COMPLETE') {
    return (
      <div className="loan-comparison-empty">
        <div className="empty-icon">🏦</div>
        <p>Complete business analysis to view funding comparison</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loan-loading">
        <div className="pulse-loader"></div>
        <p>Calculating funding scenarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loan-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={loadComparison} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!data || !data.scenarios || data.scenarios.length === 0) return null;

  function fmt(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  }

  function getBurdenColor(rating: string) {
    if (rating === 'COMFORTABLE') return '#6ee7b7';
    if (rating === 'MODERATE') return '#fcd34d';
    if (rating === 'HIGH') return '#fca5a5';
    return 'rgba(255,255,255,0.5)';
  }

  function getBurdenIcon(rating: string) {
    if (rating === 'COMFORTABLE') return '✅';
    if (rating === 'MODERATE') return '⚠️';
    if (rating === 'HIGH') return '🔴';
    return '❓';
  }

  const selectedScenario = data.scenarios.find(s => s.id === selectedLoan);

  return (
    <div className="loan-comparison">
      <div className="loan-header">
        <h3>
          <span className="header-icon">🏦</span>
          Funding & Loan Comparison
        </h3>
        <span className="data-badge formula">Verified EMI Formula</span>
      </div>

      {/* Summary Bar */}
      <div className="funding-summary">
        <div className="summary-item">
          <span className="summary-label">Project Cost</span>
          <span className="summary-value">{fmt(data.totalProjectCost)}</span>
        </div>
        <div className="summary-divider">→</div>
        <div className="summary-item">
          <span className="summary-label">Your Equity</span>
          <span className="summary-value equity">{fmt(data.promoterEquity)}</span>
        </div>
        <div className="summary-divider">+</div>
        <div className="summary-item">
          <span className="summary-label">Funding Needed</span>
          <span className="summary-value gap">{fmt(data.fundingGap)}</span>
        </div>
      </div>

      {/* Loan Tabs */}
      <div className="loan-tabs">
        {data.scenarios.map(s => (
          <button
            key={s.id}
            className={`loan-tab ${selectedLoan === s.id ? 'active' : ''}`}
            onClick={() => setSelectedLoan(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Selected Loan Detail */}
      {selectedScenario && selectedScenario.status === 'CALCULATED' && (
        <div className="loan-detail">
          <div className="emi-highlight">
            <div className="emi-amount">
              <span className="emi-label">Monthly EMI</span>
              <span className="emi-value">{fmt(selectedScenario.emi)}</span>
            </div>
            <div className="emi-badge" style={{ color: getBurdenColor(selectedScenario.cashFlowImpact.debtBurdenRating) }}>
              {getBurdenIcon(selectedScenario.cashFlowImpact.debtBurdenRating)}{' '}
              {selectedScenario.cashFlowImpact.debtBurdenRating} Debt Burden
            </div>
          </div>

          <div className="loan-metrics-grid">
            <div className="loan-metric">
              <span className="lm-label">Loan Amount</span>
              <span className="lm-value">{fmt(selectedScenario.loanAmount)}</span>
              {(selectedScenario.subsidyAmount ?? 0) > 0 && (
                <span className="lm-note subsidy">
                  After {selectedScenario.subsidyPct}% subsidy (−{fmt(selectedScenario.subsidyAmount!)})
                </span>
              )}
            </div>
            <div className="loan-metric">
              <span className="lm-label">Interest Rate</span>
              <span className="lm-value">{selectedScenario.interestRate}% p.a.</span>
            </div>
            <div className="loan-metric">
              <span className="lm-label">Tenure</span>
              <span className="lm-value">{selectedScenario.tenureYears} years</span>
              {selectedScenario.moratoriumMonths > 0 && (
                <span className="lm-note">{selectedScenario.moratoriumMonths} months moratorium</span>
              )}
            </div>
            <div className="loan-metric">
              <span className="lm-label">Total Interest Paid</span>
              <span className="lm-value interest">{fmt(selectedScenario.totalInterest)}</span>
            </div>
            <div className="loan-metric">
              <span className="lm-label">Total Repayment</span>
              <span className="lm-value">{fmt(selectedScenario.totalRepayment)}</span>
            </div>
            {selectedScenario.cashFlowImpact.cashFlowAfterEmi !== null && (
              <div className="loan-metric">
                <span className="lm-label">Monthly Cash After EMI</span>
                <span className={`lm-value ${(selectedScenario.cashFlowImpact.cashFlowAfterEmi ?? 0) > 0 ? 'positive' : 'negative'}`}>
                  {fmt(selectedScenario.cashFlowImpact.cashFlowAfterEmi!)}
                </span>
              </div>
            )}
          </div>

          {/* Cash Flow Bar */}
          {selectedScenario.cashFlowImpact.emiAsPercentOfProfit !== null && (
            <div className="cashflow-bar-container">
              <span className="cashflow-label">
                EMI as % of Monthly Profit: <strong>{selectedScenario.cashFlowImpact.emiAsPercentOfProfit}%</strong>
              </span>
              <div className="cashflow-bar-bg">
                <div
                  className="cashflow-bar-fill"
                  style={{
                    width: `${Math.min(100, selectedScenario.cashFlowImpact.emiAsPercentOfProfit)}%`,
                    background: getBurdenColor(selectedScenario.cashFlowImpact.debtBurdenRating)
                  }}
                />
                <div className="cashflow-marker" style={{ left: '40%' }} title="Comfortable limit (40%)" />
                <div className="cashflow-marker warn" style={{ left: '60%' }} title="Warning limit (60%)" />
              </div>
              <div className="cashflow-labels">
                <span>0%</span>
                <span style={{ marginLeft: 'calc(40% - 20px)' }}>40% Safe</span>
                <span style={{ marginLeft: 'calc(20% - 40px)' }}>60% Caution</span>
                <span>100%</span>
              </div>
            </div>
          )}

          <div className="loan-source">
            Source: {selectedScenario.source}
            <span className={`data-status-inline ${selectedScenario.dataStatus?.toLowerCase()}`}>
              {selectedScenario.dataStatus}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .loan-comparison {
          background: var(--card-bg, #1a1a2e);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .loan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .loan-header h3 {
          margin: 0;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-icon { font-size: 1.3rem; }
        .data-badge.formula {
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          text-transform: uppercase;
        }
        .funding-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .summary-item { display: flex; flex-direction: column; gap: 2px; }
        .summary-label {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.45);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-value {
          font-size: 1rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .summary-value.equity { color: #6ee7b7; }
        .summary-value.gap { color: #fcd34d; }
        .summary-divider {
          color: rgba(255,255,255,0.2);
          font-size: 1.2rem;
        }
        .loan-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .loan-tab {
          padding: 8px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.6);
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .loan-tab:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .loan-tab.active {
          background: rgba(99,102,241,0.15);
          border-color: rgba(99,102,241,0.4);
          color: #a5b4fc;
          font-weight: 600;
        }
        .loan-detail {
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .emi-highlight {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
          gap: 8px;
        }
        .emi-label {
          display: block;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.45);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .emi-value {
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
          font-variant-numeric: tabular-nums;
        }
        .emi-badge {
          font-size: 0.82rem;
          font-weight: 600;
        }
        .loan-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .loan-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lm-label {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.45);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .lm-value {
          font-size: 0.95rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .lm-value.interest { color: #fca5a5; }
        .lm-value.positive { color: #6ee7b7; }
        .lm-value.negative { color: #fca5a5; }
        .lm-note {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
        }
        .lm-note.subsidy { color: #6ee7b7; }
        .cashflow-bar-container {
          margin: 16px 0;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
        }
        .cashflow-label {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
          display: block;
          margin-bottom: 8px;
        }
        .cashflow-bar-bg {
          position: relative;
          width: 100%;
          height: 12px;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          overflow: visible;
        }
        .cashflow-bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s ease;
        }
        .cashflow-marker {
          position: absolute;
          top: -3px;
          width: 2px;
          height: 18px;
          background: rgba(255,255,255,0.3);
        }
        .cashflow-marker.warn { background: rgba(245,158,11,0.5); }
        .cashflow-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.6rem;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
        }
        .loan-source {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.35);
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .data-status-inline {
          font-size: 0.6rem;
          padding: 1px 6px;
          border-radius: 6px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .data-status-inline.verified {
          background: rgba(16,185,129,0.15);
          color: #6ee7b7;
        }
        .data-status-inline.projected {
          background: rgba(245,158,11,0.15);
          color: #fcd34d;
        }
        .loan-comparison-empty, .loan-loading, .loan-error {
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
        .retry-btn {
          margin-top: 8px;
          padding: 6px 16px;
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 8px;
          cursor: pointer;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .loan-metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .funding-summary { flex-direction: column; text-align: center; }
          .summary-divider { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
