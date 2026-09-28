import React, { useEffect, useState } from 'react';
import { fieldOpsApi } from '../api/apiClient';
import { FieldVisitCard, type FieldVisitData } from '../components/field/FieldVisitCard';
import '../components/field/FieldOperations.css';

export const FieldOperations: React.FC = () => {
  const [visits, setVisits] = useState<FieldVisitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New Visit Form State
  const [newBizId, setNewBizId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('ROUTINE_VERIFICATION');
  const [newNotes, setNewNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const loadVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fieldOpsApi.listVisits(undefined, {
        status: statusFilter || undefined,
        limit: 50
      });
      if (res.success && res.data) {
        setVisits(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load field visits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [statusFilter]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizId.trim() || !newDate) {
      alert('Business ID and Scheduled Date are required.');
      return;
    }

    try {
      setScheduling(true);
      const res = await fieldOpsApi.createVisit(newBizId.trim(), {
        scheduledDate: newDate,
        visitType: newType,
        notes: newNotes.trim()
      });

      if (res.success) {
        setShowScheduleModal(false);
        setNewBizId('');
        setNewDate('');
        setNewNotes('');
        loadVisits();
      }
    } catch (err: any) {
      alert('Failed to schedule visit: ' + err.message);
    } finally {
      setScheduling(false);
    }
  };

  const scheduledCount = visits.filter(v => v.status === 'SCHEDULED').length;
  const inProgressCount = visits.filter(v => v.status === 'IN_PROGRESS' || v.status === 'VERIFICATION_PENDING').length;
  const verifiedCount = visits.filter(v => v.status === 'VERIFIED' || v.status === 'COMPLETED').length;
  const actionRequiredCount = visits.filter(v => v.status === 'ACTION_REQUIRED').length;

  return (
    <div className="field-ops-page" id="field-operations-page">
      <div className="field-ops-header">
        <div className="field-ops-title">
          <h1>
            <span>🚜</span> Field Operations & Business Verification
          </h1>
          <p>
            Real-world field visits, on-site physical verification, and immutable proof evidence management.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn-primary-field"
            onClick={() => setShowScheduleModal(true)}
            id="btn-schedule-visit"
          >
            📅 Schedule Field Visit
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#718096', fontWeight: 600 }}>SCHEDULED VISITS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4a5568', marginTop: 4 }}>{scheduledCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#718096', fontWeight: 600 }}>IN PROGRESS / PENDING</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3182ce', marginTop: 4 }}>{inProgressCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#718096', fontWeight: 600 }}>VERIFIED ENTERPRISES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38a169', marginTop: 4 }}>{verifiedCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#718096', fontWeight: 600 }}>ACTION REQUIRED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e53e3e', marginTop: 4 }}>{actionRequiredCount}</div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="field-ops-filters">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter visits by status"
        >
          <option value="">All Visit Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="VERIFICATION_PENDING">Verification Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="ACTION_REQUIRED">Action Required</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="blocking-alert" style={{ marginBottom: 16 }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading ? (
        <div className="journey-loading">
          <span>Loading field operations records...</span>
        </div>
      ) : visits.length === 0 ? (
        <div className="visit-card" style={{ textAlign: 'center', padding: 40, color: '#718096' }}>
          <p style={{ margin: 0, fontSize: '1rem' }}>No field visits recorded matching the current filters.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>Click "Schedule Field Visit" to book an on-site physical inspection.</p>
        </div>
      ) : (
        <div className="field-visits-list">
          {visits.map((visit) => (
            <FieldVisitCard
              key={visit.id}
              visit={visit}
              onVisitUpdated={loadVisits}
            />
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">📅 Schedule New Field Visit</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="evidence-input-group" style={{ marginBottom: 12 }}>
                <label htmlFor="schedule-biz-id">Business Identifier *</label>
                <input
                  id="schedule-biz-id"
                  type="text"
                  className="evidence-input"
                  placeholder="biz_..."
                  value={newBizId}
                  onChange={(e) => setNewBizId(e.target.value)}
                  required
                />
              </div>

              <div className="evidence-input-group" style={{ marginBottom: 12 }}>
                <label htmlFor="schedule-date">Scheduled Visit Date *</label>
                <input
                  id="schedule-date"
                  type="date"
                  className="evidence-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>

              <div className="evidence-input-group" style={{ marginBottom: 12 }}>
                <label htmlFor="schedule-type">Visit Type</label>
                <select
                  id="schedule-type"
                  className="evidence-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="ROUTINE_VERIFICATION">Routine Verification</option>
                  <option value="PRE_SANCTION_INSPECTION">Pre-Sanction Inspection</option>
                  <option value="EQUIPMENT_AUDIT">Equipment / Machinery Audit</option>
                  <option value="POST_DISBURSEMENT_FOLLOWUP">Post-Disbursement Followup</option>
                </select>
              </div>

              <div className="evidence-input-group" style={{ marginBottom: 18 }}>
                <label htmlFor="schedule-notes">Initial Officer Instructions / Notes</label>
                <textarea
                  id="schedule-notes"
                  className="evidence-input"
                  rows={3}
                  placeholder="Specific items to verify on site..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary-field"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-field"
                  disabled={scheduling}
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldOperations;
