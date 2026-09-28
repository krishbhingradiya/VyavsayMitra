import React, { useState } from 'react';
import { fieldOpsApi } from '../../api/apiClient';
import { VerificationChecklist, type ChecklistItemData } from './VerificationChecklist';
import { EvidenceUpload } from './EvidenceUpload';

export interface FieldVisitData {
  id: string;
  business_id: string;
  officer_id: string;
  scheduled_date: string;
  visit_type: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'ACTION_REQUIRED' | 'CANCELLED' | 'COMPLETED';
  verification_result?: string;
  notes?: string;
  checklist?: ChecklistItemData[] | string;
  created_at: string;
}

interface FieldVisitCardProps {
  visit: FieldVisitData;
  onVisitUpdated?: () => void;
}

export const FieldVisitCard: React.FC<FieldVisitCardProps> = ({ visit, onVisitUpdated }) => {
  const [showChecklist, setShowChecklist] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedChecklist: ChecklistItemData[] =
    typeof visit.checklist === 'string'
      ? JSON.parse(visit.checklist || '[]')
      : visit.checklist || [];

  const handleStatusTransition = async (newStatus: string, verificationResult?: string) => {
    try {
      setUpdating(true);
      setError(null);
      const res = await fieldOpsApi.updateVisit(visit.business_id, visit.id, {
        status: newStatus,
        verificationResult
      });

      if (res.success && onVisitUpdated) {
        onVisitUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Status transition failed.');
    } finally {
      setUpdating(false);
    }
  };

  const statusClass = `status-${visit.status.toLowerCase()}`;

  return (
    <div className="visit-card" id={`visit-${visit.id}`}>
      <div className="visit-card-header">
        <div className="visit-card-title">
          <span className="visit-type-badge">{visit.visit_type.replace(/_/g, ' ')}</span>
          <span style={{ fontWeight: 600, color: '#2d3748' }}>Visit #{visit.id.slice(0, 8)}</span>
        </div>
        <span className={`visit-status-badge ${statusClass}`}>{visit.status.replace(/_/g, ' ')}</span>
      </div>

      {error && (
        <div className="blocking-alert" style={{ marginBottom: 12 }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="visit-body">
        <div className="visit-info-group">
          <span className="visit-info-label">Scheduled Date</span>
          <span className="visit-info-value">
            📅 {new Date(visit.scheduled_date).toLocaleDateString()}
          </span>
        </div>

        <div className="visit-info-group">
          <span className="visit-info-label">Assigned Field Officer</span>
          <span className="visit-info-value">👤 {visit.officer_id || 'Assigned Officer'}</span>
        </div>

        <div className="visit-info-group">
          <span className="visit-info-label">Verification Result</span>
          <span className="visit-info-value">
            {visit.verification_result ? (
              <strong>{visit.verification_result}</strong>
            ) : (
              <span style={{ color: '#a0aec0' }}>Pending field inspection</span>
            )}
          </span>
        </div>
      </div>

      {visit.notes && (
        <div style={{ marginBottom: 14, fontSize: '0.875rem', color: '#4a5568' }}>
          <strong>Field Notes:</strong> {visit.notes}
        </div>
      )}

      <div className="visit-actions-bar">
        <button
          type="button"
          className="btn-secondary-field"
          onClick={() => setShowChecklist(prev => !prev)}
        >
          {showChecklist ? '▲ Hide Checklist' : '▼ View Verification Checklist'}
        </button>

        <button
          type="button"
          className="btn-secondary-field"
          onClick={() => setShowEvidenceUpload(prev => !prev)}
        >
          {showEvidenceUpload ? '▲ Close Evidence Form' : '📷 Attach Field Evidence'}
        </button>

        {/* State Transitions */}
        {visit.status === 'SCHEDULED' && (
          <button
            type="button"
            className="btn-primary-field"
            disabled={updating}
            onClick={() => handleStatusTransition('IN_PROGRESS')}
          >
            ▶ Begin Visit
          </button>
        )}

        {visit.status === 'IN_PROGRESS' && (
          <>
            <button
              type="button"
              className="btn-primary-field"
              disabled={updating}
              onClick={() => handleStatusTransition('VERIFICATION_PENDING')}
            >
              ✓ Complete Inspection
            </button>
            <button
              type="button"
              className="btn-secondary-field"
              style={{ color: '#c53030' }}
              disabled={updating}
              onClick={() => handleStatusTransition('ACTION_REQUIRED', 'REJECTED')}
            >
              ⚠️ Flag Action Required
            </button>
          </>
        )}

        {visit.status === 'VERIFICATION_PENDING' && (
          <>
            <button
              type="button"
              className="btn-primary-field"
              style={{ background: '#38a169' }}
              disabled={updating}
              onClick={() => handleStatusTransition('VERIFIED', 'VERIFIED')}
            >
              ✅ Sign-off & Verify Enterprise
            </button>
            <button
              type="button"
              className="btn-secondary-field"
              style={{ color: '#c53030' }}
              disabled={updating}
              onClick={() => handleStatusTransition('ACTION_REQUIRED', 'REQUIRES_CORRECTION')}
            >
              ⚠️ Request Correction
            </button>
          </>
        )}

        {visit.status === 'VERIFIED' && (
          <button
            type="button"
            className="btn-secondary-field"
            disabled={updating}
            onClick={() => handleStatusTransition('COMPLETED')}
          >
            Mark Completed
          </button>
        )}
      </div>

      {showChecklist && (
        <VerificationChecklist
          businessId={visit.business_id}
          visitId={visit.id}
          checklist={parsedChecklist}
          onChecklistUpdated={onVisitUpdated}
        />
      )}

      {showEvidenceUpload && (
        <EvidenceUpload
          businessId={visit.business_id}
          onUploadSuccess={() => {
            setShowEvidenceUpload(false);
            if (onVisitUpdated) onVisitUpdated();
          }}
          onCancel={() => setShowEvidenceUpload(false)}
        />
      )}
    </div>
  );
};
