import React, { useEffect, useState } from 'react';
import { journeyApi } from '../../api/apiClient';
import './BusinessJourney.css';

export interface JourneyStage {
  id: number;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ACTION_REQUIRED' | 'PENDING' | 'NOT_STARTED';
  progress: number;
  blockingIssue: string | null;
  nextAction: string;
  evidenceRequirement: string;
  lastUpdatedAt: string | null;
}

interface BusinessJourneyProps {
  businessId: string;
}

export const BusinessJourney: React.FC<BusinessJourneyProps> = ({ businessId }) => {
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadJourney = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await journeyApi.getJourney(businessId);
        if (isMounted && res.success && res.stages) {
          setStages(res.stages);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to load enterprise journey state.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (businessId) {
      loadJourney();
    }

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  if (loading) {
    return (
      <div className="journey-container">
        <div className="journey-loading">
          <span>Loading your business journey progress from verified records...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="journey-container">
        <div className="blocking-alert" style={{ background: '#fff5f5', color: '#c53030' }}>
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  const completedCount = stages.filter(s => s.status === 'COMPLETED').length;
  const overallPct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="journey-container" id="business-journey-section">
      <div className="journey-header">
        <div className="journey-title-wrap">
          <h2>
            <span>🗺️</span> Entrepreneur Execution Journey
          </h2>
          <p className="journey-subtitle">
            Step-by-step verified pathway from business baseline to bank disbursement and sustainable profitability.
          </p>
        </div>
        <div className="journey-overall-progress">
          <span className="progress-pill">
            {completedCount} / {stages.length} Milestones ({overallPct}%)
          </span>
        </div>
      </div>

      <div className="journey-grid">
        {stages.map((stage) => {
          const statusClass = `status-${stage.status.toLowerCase().replace(/_/g, '-')}`;
          const badgeClass = `badge-${stage.status.toLowerCase()}`;
          const fillClass = stage.status === 'COMPLETED' ? 'fill-completed' : stage.status === 'ACTION_REQUIRED' ? 'fill-action-required' : '';

          return (
            <div key={stage.id} className={`journey-stage-card ${statusClass}`} id={`journey-stage-${stage.id}`}>
              <div>
                <div className="stage-top">
                  <span className="stage-number">Stage {stage.id}</span>
                  <span className={`stage-status-badge ${badgeClass}`}>
                    {stage.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="stage-name">{stage.name}</h3>

                <div className="stage-progress-bar">
                  <div
                    className={`stage-progress-fill ${fillClass}`}
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>

                {stage.blockingIssue && (
                  <div className="blocking-alert">
                    <span>⚠️</span>
                    <span>{stage.blockingIssue}</span>
                  </div>
                )}

                <div className="stage-details">
                  <div className="detail-row">
                    <span className="detail-label">Next Action:</span>
                    <span>{stage.nextAction}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Evidence:</span>
                    <span className="evidence-tag">📄 {stage.evidenceRequirement}</span>
                  </div>
                </div>
              </div>

              <div className="stage-footer">
                <span>Progress: {stage.progress}%</span>
                <span>
                  {stage.lastUpdatedAt
                    ? `Updated: ${new Date(stage.lastUpdatedAt).toLocaleDateString()}`
                    : 'Not yet initiated'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
