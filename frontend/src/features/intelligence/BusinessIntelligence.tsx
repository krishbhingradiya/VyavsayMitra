/**
 * VYAVSAYMITRA — Business Intelligence Dashboard
 *
 * Aggregates Gemini-structured analysis, scenario comparison, and loan comparison
 * into a single unified intelligence view with data freshness, stale indicators,
 * and source transparency.
 */
import { useState, useEffect, useCallback } from 'react';
import { intelligenceApi } from '../../api/apiClient';
import ScenarioComparison from './ScenarioComparison';
import LoanComparison from './LoanComparison';
import CompetitorMapping from '../business/CompetitorMapping';

interface Props {
  businessId: string;
  analysisStatus?: string;
  businessName?: string;
}

interface GeminiAnalysis {
  executiveSummary: string;
  financialInterpretation: string[];
  marketInsights: string[];
  fundingInsights: string[];
  competitorInsights: string[];
  keyRisks: string[];
  missingInformation: string[];
  recommendedActions: string[];
  dataLimitations: string[];
  sourcesUsed: string[];
  source: string;
  generatedAt: string;
}

interface IntelligenceData {
  geminiAnalysis: GeminiAnalysis;
  scenarioAnalysis: any;
  loanComparison: any;
  analysisStale: boolean;
  dataFreshness: {
    analysisCompletedAt: string | null;
    isAnalysisStale: boolean;
  };
}

export default function BusinessIntelligence({ businessId, analysisStatus, businessName }: Props) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string>('overview');

  const loadIntelligence = useCallback(async () => {
    if (!businessId || analysisStatus !== 'ANALYSIS_COMPLETE') return;
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceApi.getStructuredAnalysis(businessId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Could not load business intelligence');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence analysis');
    } finally {
      setLoading(false);
    }
  }, [businessId, analysisStatus]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  if (analysisStatus !== 'ANALYSIS_COMPLETE') {
    return (
      <div className="bi-container">
        <div className="bi-empty">
          <div className="bi-empty-icon">🧠</div>
          <h3>Business Intelligence</h3>
          <p>Complete business analysis to unlock AI-powered intelligence, scenario planning, and funding comparison.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bi-container">
        <div className="bi-loading">
          <div className="bi-loading-stages">
            <div className="stage active">
              <div className="stage-dot"></div>
              <span>Loading verified financial data</span>
            </div>
            <div className="stage">
              <div className="stage-dot"></div>
              <span>Generating scenario analysis</span>
            </div>
            <div className="stage">
              <div className="stage-dot"></div>
              <span>Calculating funding options</span>
            </div>
            <div className="stage">
              <div className="stage-dot"></div>
              <span>AI intelligence synthesis</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bi-container">
        <div className="bi-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={loadIntelligence} className="bi-retry">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const gemini = data.geminiAnalysis;
  const isGeminiPowered = gemini?.source === 'gemini_structured';
  const isStale = data.analysisStale;

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'scenarios', label: 'Scenarios', icon: '📊' },
    { id: 'funding', label: 'Funding', icon: '🏦' },
    { id: 'competitors', label: 'Competitors', icon: '👥' },
    { id: 'risks', label: 'Risks', icon: '🛡️' },
    { id: 'actions', label: 'Actions', icon: '✅' },
  ];

  return (
    <div className="bi-container">
      {/* Stale Banner */}
      {isStale && (
        <div className="stale-banner">
          <span>⚠️</span>
          <span>Business inputs have changed since last analysis. Results may be outdated.</span>
          <button className="bi-reanalyze" onClick={loadIntelligence}>Refresh</button>
        </div>
      )}

      {/* Header */}
      <div className="bi-header">
        <div className="bi-title-row">
          <h2>
            <span className="bi-icon">🧠</span>
            Business Intelligence {businessName ? `— ${businessName}` : ''}
          </h2>
          <div className="bi-badges">
            <span className={`source-badge ${isGeminiPowered ? 'gemini' : 'fallback'}`}>
              {isGeminiPowered ? '✨ AI-Enhanced' : '📐 Rule-Based'}
            </span>
            {data.dataFreshness?.analysisCompletedAt && (
              <span className="freshness-badge">
                Analysis: {formatAge(data.dataFreshness.analysisCompletedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bi-tabs">
        {sections.map(s => (
          <button
            key={s.id}
            className={`bi-tab ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            <span className="tab-icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bi-content">
        {activeSection === 'overview' && gemini && (
          <div className="bi-overview">
            {/* Executive Summary */}
            <div className="bi-card summary-card">
              <h3>Executive Summary</h3>
              <p className="executive-summary">{gemini.executiveSummary}</p>
            </div>

            {/* Financial Interpretation */}
            {gemini.financialInterpretation?.length > 0 && (
              <div className="bi-card">
                <h3><span>💰</span> Financial Interpretation</h3>
                <ul className="insight-list">
                  {gemini.financialInterpretation.map((f, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Insights */}
            {gemini.marketInsights?.length > 0 && (
              <div className="bi-card">
                <h3><span>📈</span> Market Insights</h3>
                <ul className="insight-list">
                  {gemini.marketInsights.map((m, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet">▸</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Information */}
            {gemini.missingInformation?.length > 0 && (
              <div className="bi-card warning-card">
                <h3><span>📝</span> Missing Information</h3>
                <ul className="insight-list warning">
                  {gemini.missingInformation.map((m, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet warning">!</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Limitations */}
            {gemini.dataLimitations?.length > 0 && (
              <div className="bi-card info-card">
                <h3><span>ℹ️</span> Data Limitations</h3>
                <ul className="insight-list muted">
                  {gemini.dataLimitations.map((d, i) => (
                    <li key={i} className="insight-item muted">{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {gemini.sourcesUsed?.length > 0 && (
              <div className="bi-sources">
                <span className="sources-label">Sources:</span>
                {gemini.sourcesUsed.map((s, i) => (
                  <span key={i} className="source-tag">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'scenarios' && (
          <ScenarioComparison businessId={businessId} analysisStatus={analysisStatus} />
        )}

        {activeSection === 'funding' && (
          <div className="bi-funding-section">
            <LoanComparison businessId={businessId} analysisStatus={analysisStatus} />
            {gemini?.fundingInsights?.length > 0 && (
              <div className="bi-card" style={{ marginTop: '16px' }}>
                <h3><span>💡</span> Funding Insights</h3>
                <ul className="insight-list">
                  {gemini.fundingInsights.map((f, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeSection === 'competitors' && (
          <div className="bi-competitors-section">
            <CompetitorMapping businessId={businessId} />
          </div>
        )}

        {activeSection === 'risks' && gemini && (
          <div className="bi-risks-section">
            {gemini.keyRisks?.length > 0 && (
              <div className="bi-card">
                <h3><span>🛡️</span> Key Business Risks</h3>
                <ul className="risk-list">
                  {gemini.keyRisks.map((r, i) => (
                    <li key={i} className="risk-item">
                      <span className="risk-indicator">⚠️</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gemini.competitorInsights?.length > 0 && (
              <div className="bi-card">
                <h3><span>🏢</span> Competitor & Market Position</h3>
                <ul className="insight-list">
                  {gemini.competitorInsights.map((c, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet">▸</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeSection === 'actions' && gemini && (
          <div className="bi-actions-section">
            {gemini.recommendedActions?.length > 0 && (
              <div className="bi-card">
                <h3><span>✅</span> Recommended Actions</h3>
                <ol className="action-list">
                  {gemini.recommendedActions.map((a, i) => (
                    <li key={i} className="action-item">
                      <span className="action-number">{i + 1}</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .bi-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .stale-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 12px;
          font-size: 0.85rem;
          color: #fcd34d;
        }
        .bi-reanalyze {
          margin-left: auto;
          padding: 4px 12px;
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #fcd34d;
          border-radius: 8px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .bi-reanalyze:hover { background: rgba(245,158,11,0.25); }
        .bi-header { margin-bottom: 4px; }
        .bi-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .bi-title-row h2 {
          margin: 0;
          font-size: 1.3rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bi-icon { font-size: 1.5rem; }
        .bi-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .source-badge {
          font-size: 0.7rem;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 600;
        }
        .source-badge.gemini {
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15));
          color: #c4b5fd;
          border: 1px solid rgba(168,85,247,0.3);
        }
        .source-badge.fallback {
          background: rgba(99,102,241,0.1);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.2);
        }
        .freshness-badge {
          font-size: 0.68rem;
          padding: 3px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .bi-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .bi-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .bi-tab:hover { color: rgba(255,255,255,0.8); }
        .bi-tab.active {
          color: #a5b4fc;
          border-bottom-color: #6366f1;
          font-weight: 600;
        }
        .tab-icon { font-size: 1rem; }
        .bi-content { min-height: 200px; }
        .bi-card {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .bi-card h3 {
          margin: 0 0 12px;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .summary-card {
          background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05));
          border-color: rgba(99,102,241,0.15);
        }
        .executive-summary {
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(255,255,255,0.85);
        }
        .warning-card {
          border-color: rgba(245,158,11,0.2);
          background: rgba(245,158,11,0.03);
        }
        .info-card {
          border-color: rgba(99,102,241,0.15);
          background: rgba(99,102,241,0.03);
        }
        .insight-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.85rem;
          line-height: 1.5;
          color: rgba(255,255,255,0.75);
        }
        .insight-item.muted { color: rgba(255,255,255,0.5); font-size: 0.8rem; }
        .insight-bullet {
          color: #6366f1;
          font-weight: bold;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .insight-bullet.warning { color: #f59e0b; }
        .risk-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .risk-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.04);
          border: 1px solid rgba(239,68,68,0.1);
          border-radius: 10px;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.8);
        }
        .risk-indicator { flex-shrink: 0; font-size: 1rem; }
        .action-list {
          list-style: none;
          padding: 0;
          margin: 0;
          counter-reset: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .action-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(16,185,129,0.04);
          border: 1px solid rgba(16,185,129,0.1);
          border-radius: 10px;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.8);
        }
        .action-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(16,185,129,0.15);
          color: #6ee7b7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .bi-sources {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .sources-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .source-tag {
          font-size: 0.68rem;
          padding: 2px 8px;
          border-radius: 8px;
          background: rgba(99,102,241,0.08);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(99,102,241,0.12);
        }
        .bi-empty {
          text-align: center;
          padding: 48px 24px;
          color: rgba(255,255,255,0.5);
        }
        .bi-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .bi-empty h3 { margin: 0 0 8px; font-size: 1.2rem; color: rgba(255,255,255,0.7); }
        .bi-empty p { font-size: 0.9rem; max-width: 400px; margin: 0 auto; }
        .bi-loading {
          padding: 48px 24px;
          text-align: center;
        }
        .bi-loading-stages {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 320px;
          margin: 0 auto;
        }
        .stage {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.3);
          font-size: 0.85rem;
          transition: all 0.4s;
        }
        .stage.active { color: #a5b4fc; }
        .stage-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        .stage.active .stage-dot {
          background: #6366f1;
          animation: pulse-dot 1.2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        .bi-error {
          text-align: center;
          padding: 48px 24px;
          color: rgba(255,255,255,0.5);
        }
        .bi-retry {
          margin-top: 12px;
          padding: 8px 20px;
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .bi-retry:hover { background: rgba(99,102,241,0.25); }
        @media (max-width: 768px) {
          .bi-tabs { gap: 2px; }
          .bi-tab { padding: 8px 10px; font-size: 0.78rem; }
          .bi-card { padding: 14px; }
        }
      `}</style>
    </div>
  );
}

function formatAge(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'Unknown';
  }
}
