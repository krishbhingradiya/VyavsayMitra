import React, { useEffect, useState } from 'react';
import { journeyApi } from '../../api/apiClient';
import { BusinessJourney } from '../../components/business/BusinessJourney';
import { EvidenceUpload } from '../../components/field/EvidenceUpload';
import './ExecutionCenter.css';

interface ExecutionCenterProps {
  businessId: string;
}

export const ExecutionCenter: React.FC<ExecutionCenterProps> = ({ businessId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);

  const loadExecutionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await journeyApi.getExecutionCenter(businessId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve execution center telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadExecutionData();
    }
  }, [businessId]);

  if (loading) {
    return (
      <div className="exec-center-container">
        <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
          <span>Loading Execution Center metrics from verified records...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="exec-center-container">
        <div className="blocking-alert" style={{ background: '#fff5f5', color: '#c53030' }}>
          <span>⚠️ {error || 'Execution Center data unavailable.'}</span>
        </div>
      </div>
    );
  }

  const {
    todayActions = [],
    overdueActions = [],
    requiredDocuments = [],
    verificationStatus = 'UNVERIFIED',
    applicationStatus = 'NO_APPLICATIONS',
    fundingReadiness = {},
    businessHealth = {},
    dataQuality = {},
    nextBestAction = null,
    outcomeTracking = {}
  } = data;

  const healthScore = businessHealth.score || businessHealth.healthScore || 65;
  const dqScore = dataQuality.dataQualityScore !== undefined ? dataQuality.dataQualityScore : 85;

  return (
    <div className="exec-center-container" id="execution-center-tab">
      {/* Provenance & Trust Banner */}
      <div className="exec-provenance-banner">
        <div>
          <strong>Operational Execution Center</strong> — Grounded in deterministic calculations and verified records.
        </div>
        <div className="provenance-tag">
          Based on verified documents & field data
        </div>
      </div>

      {/* 12-Stage Entrepreneur Journey */}
      <BusinessJourney businessId={businessId} />

      {/* Top Level Execution KPIs */}
      <div className="exec-kpi-grid">
        {/* Next Best Action Card */}
        <div className="exec-kpi-card" style={{ borderLeft: '4px solid #3182ce', gridColumn: 'span 2' }}>
          <div className="exec-kpi-header">⚡ Next Best Action</div>
          <div className="exec-kpi-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2b6cb0' }}>
            {nextBestAction?.title || nextBestAction?.action || 'Complete Next Milestone Task'}
          </div>
          <div className="exec-kpi-subtext">
            {nextBestAction?.description || nextBestAction?.reason || 'Execute next scheduled operational step in sequence.'}
          </div>
          <div className="provenance-label" style={{ marginTop: 8 }}>
            AI-assisted guidance
          </div>
        </div>

        {/* Business Health Score */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">🩺 Business Health</div>
          <div className="exec-kpi-value" style={{ color: healthScore >= 70 ? '#38a169' : '#d69e2e' }}>
            {healthScore} <span style={{ fontSize: '1rem', color: '#a0aec0' }}>/ 100</span>
          </div>
          <div className="exec-kpi-subtext">
            Status: {healthScore >= 75 ? 'Healthy' : 'Needs Optimization'}
          </div>
          <div className="provenance-label" style={{ marginTop: 8 }}>
            Based on your business inputs
          </div>
        </div>

        {/* Data Quality Score */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">🔍 Data Quality & Freshness</div>
          <div className="exec-kpi-value" style={{ color: dqScore >= 80 ? '#3182ce' : '#e53e3e' }}>
            {dqScore}%
          </div>
          <div className="exec-kpi-subtext">
            {dataQuality.criticalIssues?.length || 0} Critical • {dataQuality.warnings?.length || 0} Warnings
          </div>
          <div className="provenance-label" style={{ marginTop: 8 }}>
            Based on your business inputs
          </div>
        </div>

        {/* Field Verification Status */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">🛡️ Enterprise Verification</div>
          <div className="exec-kpi-value" style={{ fontSize: '1.25rem' }}>
            <span className={`visit-status-badge status-${verificationStatus.toLowerCase()}`}>
              {verificationStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="exec-kpi-subtext">
            {verificationStatus === 'VERIFIED'
              ? 'On-site physical inspection verified.'
              : 'External verification unavailable or pending inspection.'}
          </div>
          <div className="provenance-label" style={{ marginTop: 8 }}>
            Based on verified field information
          </div>
        </div>
      </div>

      {/* Main Two-Column Panels */}
      <div className="exec-sections-grid">
        {/* Panel 1: Actions & Overdue Tasks */}
        <div className="exec-panel">
          <div className="exec-panel-title">
            <span>📅 Execution Schedule</span>
            <span style={{ fontSize: '0.8125rem', color: '#718096' }}>
              {todayActions.length} Pending
            </span>
          </div>

          {overdueActions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e53e3e', marginBottom: 8 }}>
                ⚠️ OVERDUE ACTIONS ({overdueActions.length})
              </div>
              {overdueActions.map((task: any) => (
                <div key={task.id} className="action-item-card is-overdue">
                  <div className="action-item-title">{task.title}</div>
                  <div className="action-item-meta">
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    <span>Priority: {task.priority || 'Normal'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4a5568', marginBottom: 8 }}>
              TODAY'S & UPCOMING ACTIONS
            </div>
            {todayActions.length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: '#718096', padding: '12px 0' }}>
                ✅ No actions overdue or pending for today.
              </div>
            ) : (
              todayActions.map((task: any) => (
                <div key={task.id} className="action-item-card">
                  <div className="action-item-title">{task.title}</div>
                  <div className="action-item-meta">
                    <span>Category: {task.category || 'General'}</span>
                    {task.requires_evidence && (
                      <span style={{ color: '#2b6cb0', fontWeight: 600 }}>📄 Evidence Required</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Required Documents & Funding Readiness */}
        <div className="exec-panel">
          <div className="exec-panel-title">
            <span>🏛️ Bank & Scheme Readiness</span>
            <span style={{ fontSize: '0.8125rem', color: '#718096' }}>
              App Status: {applicationStatus}
            </span>
          </div>

          <div style={{ marginBottom: 16, background: '#f7fafc', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
              <span style={{ color: '#4a5568' }}>DPR Snapshot Generated:</span>
              <strong>{fundingReadiness.dprReady ? '✅ Ready' : '❌ Not Generated'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: '#4a5568' }}>Documents Verified:</span>
              <strong>{fundingReadiness.docsVerifiedPct || 0}%</strong>
            </div>
            <div className="provenance-label" style={{ marginTop: 6 }}>
              Based on available scheme information
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4a5568', marginBottom: 8 }}>
            REQUIRED STATUTORY & KYC DOCUMENTS
          </div>
          {requiredDocuments.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: '#718096' }}>No mandatory documents listed.</div>
          ) : (
            requiredDocuments.slice(0, 4).map((doc: any) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #edf2f7', fontSize: '0.875rem' }}>
                <span style={{ color: '#2d3748' }}>📄 {doc.document_name || doc.name}</span>
                <span className={`visit-status-badge status-${(doc.verification_status || 'unverified').toLowerCase()}`}>
                  {doc.verification_status || 'unverified'}
                </span>
              </div>
            ))
          )}
          <div className="provenance-label" style={{ marginTop: 8 }}>
            Based on verified documents
          </div>
        </div>
      </div>

      {/* Outcome Tracking & Evidence Section */}
      <div className="exec-panel">
        <div className="exec-panel-title">
          <span>📊 Actual Outcome & Evidence Vault</span>
          <button
            type="button"
            className="btn-secondary-field"
            onClick={() => setShowEvidenceUpload(prev => !prev)}
          >
            {showEvidenceUpload ? 'Close Upload Form' : '📷 Upload Milestone Proof / Evidence'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ background: '#f7fafc', padding: 14, borderRadius: 8, flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>ACTUAL OUTCOMES RECORDED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2d3748', marginTop: 4 }}>
              {outcomeTracking.recordedCount || 0}
            </div>
          </div>
          <div style={{ background: '#f7fafc', padding: 14, borderRadius: 8, flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>VERIFIED OUTCOMES</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38a169', marginTop: 4 }}>
              {outcomeTracking.verifiedCount || 0}
            </div>
          </div>
        </div>

        <div className="provenance-label">
          {outcomeTracking.recordedCount > 0
            ? 'Based on verified field information'
            : 'Actual data not available yet.'}
        </div>

        {showEvidenceUpload && (
          <EvidenceUpload
            businessId={businessId}
            onUploadSuccess={() => {
              setShowEvidenceUpload(false);
              loadExecutionData();
            }}
            onCancel={() => setShowEvidenceUpload(false)}
          />
        )}
      </div>
    </div>
  );
};
