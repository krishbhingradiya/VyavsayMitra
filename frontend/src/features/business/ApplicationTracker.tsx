import { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
  X,
  History,
  Trash2,
  Link,
  ChevronRight
} from 'lucide-react';
import { businessesApi } from '../../api/apiClient';
import { useUIStore } from '../../store/useUIStore';
import './ApplicationTracker.css';

export interface BusinessApplication {
  id: string;
  business_id: string;
  user_id: string;
  application_type: string;
  scheme_name?: string;
  institution_name?: string;
  application_reference?: string;
  submitted_at?: string;
  expected_response_date?: string;
  status:
    | 'DRAFT'
    | 'DOCUMENTS_PENDING'
    | 'READY_TO_SUBMIT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ACTION_REQUIRED'
    | 'APPROVED'
    | 'REJECTED'
    | 'WITHDRAWN'
    | 'COMPLETED';
  current_stage?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  documentsSummary?: {
    totalLinked: number;
    totalRequired: number;
    uploadedRequired: number;
    verifiedRequired: number;
    isDocumentReady: boolean;
  };
}

interface ApplicationTrackerProps {
  businessId: string;
  domain: string;
  onApplicationChange?: () => void;
}

export default function ApplicationTracker({ businessId, domain, onApplicationChange }: ApplicationTrackerProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [timelineApp, setTimelineApp] = useState<BusinessApplication | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [linkDocApp, setLinkDocApp] = useState<BusinessApplication | null>(null);
  const [businessDocs, setBusinessDocs] = useState<any[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // New Application Form State
  const [formData, setFormData] = useState({
    application_type: domain === 'foodtech' ? 'FSSAI Food Safety License' : 'Kisan Credit Card (KCC) Crop Loan',
    institution_name: domain === 'foodtech' ? 'FSSAI State Licensing Authority' : 'State Bank of India',
    scheme_name: domain === 'foodtech' ? 'PMFME Credit-Linked Scheme' : 'Pradhan Mantri Kisan Samman Nidhi',
    application_reference: '',
    expected_response_date: '',
    status: 'SUBMITTED' as string,
    current_stage: 'Application Preparation',
    notes: ''
  });
  const [savingApp, setSavingApp] = useState(false);

  // Status Update Modal State
  const [statusModalApp, setStatusModalApp] = useState<BusinessApplication | null>(null);
  const [newStatus, setNewStatus] = useState<BusinessApplication['status']>('SUBMITTED');
  const [statusNotes, setStatusNotes] = useState('');
  const [newStage, setNewStage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await businessesApi.listApplications(businessId);
      if (res.success && res.data) {
        setApplications(res.data.applications || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadApplications();
    }
  }, [businessId]);

  // Create Application
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.application_type.trim()) {
      addToast('Application type is required', 'error');
      return;
    }
    try {
      setSavingApp(true);
      const res = await businessesApi.createApplication(businessId, formData);
      if (res.success) {
        addToast(`Application "${formData.application_type}" created!`, 'success');
        setIsCreateOpen(false);
        setFormData({
          application_type: domain === 'foodtech' ? 'FSSAI Food Safety License' : 'Kisan Credit Card (KCC) Crop Loan',
          institution_name: domain === 'foodtech' ? 'FSSAI State Licensing Authority' : 'State Bank of India',
          scheme_name: domain === 'foodtech' ? 'PMFME Credit-Linked Scheme' : 'Pradhan Mantri Kisan Samman Nidhi',
          application_reference: '',
          expected_response_date: '',
          status: 'SUBMITTED',
          current_stage: 'Application Preparation',
          notes: ''
        });
        loadApplications();
        if (onApplicationChange) onApplicationChange();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to create application', 'error');
    } finally {
      setSavingApp(false);
    }
  };

  // Open Timeline Drawer
  const openTimeline = async (app: BusinessApplication) => {
    setTimelineApp(app);
    setLoadingTimeline(true);
    try {
      const res = await businessesApi.getApplicationTimeline(businessId, app.id);
      if (res.success && res.data) {
        setTimelineEvents(res.data.timeline || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load application timeline', 'error');
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Open Link Documents Modal
  const openLinkDocsModal = async (app: BusinessApplication) => {
    setLinkDocApp(app);
    setLoadingDocs(true);
    try {
      const [allDocsRes, appDetailsRes] = await Promise.all([
        businessesApi.getDocuments(businessId),
        businessesApi.getApplication(businessId, app.id)
      ]);
      if (allDocsRes.success && allDocsRes.data) {
        const rawDocs = Array.isArray(allDocsRes.data)
          ? allDocsRes.data
          : (Array.isArray((allDocsRes.data as any)?.documents)
              ? (allDocsRes.data as any).documents
              : (Array.isArray((allDocsRes as any)?.documents) ? (allDocsRes as any).documents : []));
        setBusinessDocs(rawDocs);
      }
      if (appDetailsRes.success && appDetailsRes.data) {
        setLinkedDocs(appDetailsRes.data.linkedDocuments || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load documents for linking', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Toggle Document Link
  const handleToggleDocLink = async (docId: string, isCurrentlyLinked: boolean) => {
    if (!linkDocApp) return;
    try {
      if (isCurrentlyLinked) {
        await businessesApi.unlinkApplicationDocument(businessId, linkDocApp.id, docId);
        setLinkedDocs((prev) => prev.filter((l) => l.document_id !== docId && l.document?.id !== docId));
        addToast('Document unlinked', 'info');
      } else {
        const res = await businessesApi.linkApplicationDocument(businessId, linkDocApp.id, docId, true);
        if (res.success && res.data) {
          const docObj = businessDocs.find((d) => d.id === docId);
          setLinkedDocs((prev) => [...prev, { ...res.data, document: docObj }]);
          addToast('Document linked to application', 'success');
        }
      }
      loadApplications();
      if (onApplicationChange) onApplicationChange();
    } catch (err: any) {
      addToast(err.message || 'Failed to update document link', 'error');
    }
  };

  // Update Application Status
  const handleUpdateStatusSubmit = async () => {
    if (!statusModalApp) return;
    try {
      setUpdatingStatus(true);
      const res = await businessesApi.updateApplication(businessId, statusModalApp.id, {
        status: newStatus,
        current_stage: newStage || undefined,
        notes: statusNotes || undefined
      });
      if (res.success) {
        addToast(`Application status updated to ${newStatus}`, 'success');
        setStatusModalApp(null);
        setStatusNotes('');
        setNewStage('');
        loadApplications();
        if (onApplicationChange) onApplicationChange();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Application
  const handleDeleteApp = async (app: BusinessApplication) => {
    if (!window.confirm(`Are you sure you want to remove the tracking for "${app.application_type}"?`)) return;
    try {
      const res = await businessesApi.deleteApplication(businessId, app.id);
      if (res.success) {
        addToast('Application deleted', 'success');
        loadApplications();
        if (onApplicationChange) onApplicationChange();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to delete application', 'error');
    }
  };

  // Summary Metrics
  const totalApps = applications.length;
  const underReviewCount = applications.filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED').length;
  const actionRequiredCount = applications.filter((a) => a.status === 'ACTION_REQUIRED').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED' || a.status === 'COMPLETED').length;

  return (
    <div className="app-tracker-container">
      {/* Tracker Header */}
      <div className="app-tracker-header">
        <div className="tracker-title-group">
          <h2>Bank & Government Application Tracking</h2>
          <p>
            Track and manage your credit applications, statutory licenses, and government scheme submissions from
            preparation to final approval.
          </p>
        </div>

        <button className="new-app-btn" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} /> New Application
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="app-metrics-grid">
        <div className="app-metric-card">
          <span className="metric-title">Total Applications</span>
          <span className="metric-number">{totalApps}</span>
        </div>
        <div className="app-metric-card">
          <span className="metric-title">In Progress / Review</span>
          <span className="metric-number info">{underReviewCount}</span>
        </div>
        {actionRequiredCount > 0 && (
          <div className="app-metric-card alert">
            <span className="metric-title">Action Required</span>
            <span className="metric-number warning">{actionRequiredCount}</span>
          </div>
        )}
        <div className="app-metric-card">
          <span className="metric-title">Approved / Sanctioned</span>
          <span className="metric-number success">{approvedCount}</span>
        </div>
      </div>

      {/* Application Cards List */}
      {loading ? (
        <div className="tracker-loading-state">
          <Clock className="spin-icon" size={32} />
          <p>Loading application records...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="tracker-empty-state">
          <Landmark size={44} />
          <h3>No Active Applications Tracked</h3>
          <p>
            Initiate a tracking record for your Kisan Credit Card, Mudra loan, FSSAI registration, or PMFME subsidy.
          </p>
          <button className="new-app-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} /> Start Application Tracking
          </button>
        </div>
      ) : (
        <div className="app-cards-list">
          {applications.map((app) => {
            const docSummary = app.documentsSummary;
            const isActionRequired = app.status === 'ACTION_REQUIRED';
            const isApproved = app.status === 'APPROVED' || app.status === 'COMPLETED';

            // Check if expected date is approaching (within 7 days)
            const isDueSoon =
              app.expected_response_date &&
              new Date(app.expected_response_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
              new Date(app.expected_response_date).getTime() > Date.now();

            return (
              <div key={app.id} className={`app-card status-${app.status.toLowerCase()}`}>
                <div className="app-card-main">
                  <div className="app-card-header">
                    <div className="app-title-area">
                      <div className="app-inst-badge">
                        <Landmark size={14} />
                        <span>{app.institution_name || 'Financial Institution'}</span>
                      </div>
                      <h3 className="app-type-title">{app.application_type}</h3>
                      {app.scheme_name && <span className="app-scheme-name">Scheme: {app.scheme_name}</span>}
                    </div>

                    <span className={`status-badge status-${app.status.toLowerCase()}`}>
                      {isApproved && <CheckCircle2 size={13} />}
                      {isActionRequired && <AlertCircle size={13} />}
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="app-card-details">
                    <div className="detail-item">
                      <span className="detail-label">Current Stage</span>
                      <span className="detail-value">{app.current_stage || 'Application Preparation'}</span>
                    </div>

                    {app.application_reference && (
                      <div className="detail-item">
                        <span className="detail-label">Reference No.</span>
                        <span className="detail-value code">{app.application_reference}</span>
                      </div>
                    )}

                    {app.submitted_at && (
                      <div className="detail-item">
                        <span className="detail-label">Submitted On</span>
                        <span className="detail-value">{new Date(app.submitted_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {app.expected_response_date && (
                      <div className={`detail-item ${isDueSoon ? 'due-soon' : ''}`}>
                        <span className="detail-label">Expected Response</span>
                        <span className="detail-value">
                          <Calendar size={13} />
                          {new Date(app.expected_response_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {docSummary && (
                      <div className="detail-item">
                        <span className="detail-label">Document Readiness</span>
                        <span className={`detail-value ${docSummary.isDocumentReady ? 'text-success' : 'text-warning'}`}>
                          <FileCheck size={13} />
                          {docSummary.uploadedRequired} / {docSummary.totalRequired} Required
                        </span>
                      </div>
                    )}
                  </div>

                  {app.notes && (
                    <div className="app-notes-snippet">
                      <em>Notes:</em> {app.notes}
                    </div>
                  )}
                </div>

                <div className="app-card-actions">
                  <button className="card-action-btn" onClick={() => openTimeline(app)}>
                    <History size={14} /> Timeline
                  </button>

                  <button className="card-action-btn" onClick={() => openLinkDocsModal(app)}>
                    <Link size={14} /> Link Documents
                  </button>

                  <button
                    className="card-action-btn primary"
                    onClick={() => {
                      setStatusModalApp(app);
                      setNewStatus(app.status);
                      setNewStage(app.current_stage || '');
                      setStatusNotes(app.notes || '');
                    }}
                  >
                    Update Status <ChevronRight size={14} />
                  </button>

                  <button
                    className="card-action-btn danger"
                    onClick={() => handleDeleteApp(app)}
                    title="Delete Application"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREATE APPLICATION ──────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="modal-backdrop">
          <div className="app-modal">
            <div className="modal-header">
              <h3>Track New Application</h3>
              <button className="close-btn" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-body">
              {/* Quick Template Fill Buttons */}
              <div className="templates-row">
                <span className="template-label">Quick Suggestions:</span>
                <div className="template-chips">
                  {domain === 'foodtech' ? (
                    <>
                      <button
                        type="button"
                        className="template-chip"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            application_type: 'FSSAI Food Safety License',
                            institution_name: 'FSSAI Licensing Authority',
                            scheme_name: 'Food Safety and Standards Act'
                          })
                        }
                      >
                        FSSAI License
                      </button>
                      <button
                        type="button"
                        className="template-chip"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            application_type: 'PMFME Credit-Linked Subsidy',
                            institution_name: 'Lead District Bank',
                            scheme_name: 'PM Formalisation of Micro Food Processing Enterprises'
                          })
                        }
                      >
                        PMFME Subsidy
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="template-chip"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            application_type: 'Kisan Credit Card (KCC) Crop Loan',
                            institution_name: 'State Bank of India',
                            scheme_name: 'KCC Interest Subvention Scheme'
                          })
                        }
                      >
                        KCC Crop Loan
                      </button>
                      <button
                        type="button"
                        className="template-chip"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            application_type: 'Agriculture Infrastructure Fund (AIF)',
                            institution_name: 'Bank of Baroda',
                            scheme_name: 'AIF 3% Interest Subvention'
                          })
                        }
                      >
                        AIF Infrastructure
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        application_type: 'MUDRA Term / Working Capital Loan',
                        institution_name: 'Canara Bank',
                        scheme_name: 'Pradhan Mantri MUDRA Yojana (Tarun)'
                      })
                    }
                  >
                    MUDRA Loan
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Application Type *</label>
                <input
                  type="text"
                  value={formData.application_type}
                  onChange={(e) => setFormData({ ...formData, application_type: e.target.value })}
                  placeholder="e.g. Kisan Credit Card Loan"
                  required
                />
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Institution / Bank Name</label>
                  <input
                    type="text"
                    value={formData.institution_name}
                    onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                    placeholder="e.g. State Bank of India - Anand Branch"
                  />
                </div>

                <div className="input-group">
                  <label>Scheme Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.scheme_name}
                    onChange={(e) => setFormData({ ...formData, scheme_name: e.target.value })}
                    placeholder="e.g. PMEGP or KCC"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Application Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.application_reference}
                    onChange={(e) => setFormData({ ...formData, application_reference: e.target.value })}
                    placeholder="e.g. APP-2026-98124"
                  />
                </div>

                <div className="input-group">
                  <label>Expected Response Date</label>
                  <input
                    type="date"
                    value={formData.expected_response_date}
                    onChange={(e) => setFormData({ ...formData, expected_response_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Application Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="DRAFT">Draft (Preparing documentation)</option>
                    <option value="SUBMITTED">Submitted (Formally lodged with authority)</option>
                    <option value="UNDER_REVIEW">Under Review (Desk / Officer appraisal)</option>
                    <option value="ACTION_REQUIRED">Additional Documents Required</option>
                    <option value="APPROVED">Approved (Sanction letter issued)</option>
                    <option value="REJECTED">Rejected (Declined / Ineligible)</option>
                    <option value="COMPLETED">Completed (Disbursed / Operational)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Current Stage / Processing Milestone</label>
                  <input
                    type="text"
                    value={formData.current_stage}
                    onChange={(e) => setFormData({ ...formData, current_stage: e.target.value })}
                    placeholder="e.g. Branch Verification / Inspection"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Notes / Context</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Branch manager requested 6-month bank statement."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsCreateOpen(false)} disabled={savingApp}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={savingApp}>
                  {savingApp ? 'Saving...' : 'Start Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: UPDATE STATUS ───────────────────────────────────────────── */}
      {statusModalApp && (
        <div className="modal-backdrop">
          <div className="app-modal">
            <div className="modal-header">
              <h3>Update Status: {statusModalApp.application_type}</h3>
              <button className="close-btn" onClick={() => setStatusModalApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Application Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                >
                  <option value="DRAFT">Draft (Preparing)</option>
                  <option value="DOCUMENTS_PENDING">Documents Pending (Collecting)</option>
                  <option value="READY_TO_SUBMIT">Ready to Submit</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review by Institution</option>
                  <option value="ACTION_REQUIRED">Action Required (Need Details)</option>
                  <option value="APPROVED">Approved / Sanctioned</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="COMPLETED">Completed / Disbursed</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>

              <div className="input-group">
                <label>Current Stage</label>
                <input
                  type="text"
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  placeholder="e.g. Field Inspection by Bank Officer"
                />
              </div>

              <div className="input-group">
                <label>Status Change Notes</label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Describe update, officer remarks, or next requirements..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setStatusModalApp(null)} disabled={updatingStatus}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleUpdateStatusSubmit} disabled={updatingStatus}>
                {updatingStatus ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LINK DOCUMENTS ──────────────────────────────────────────── */}
      {linkDocApp && (
        <div className="modal-backdrop">
          <div className="app-modal">
            <div className="modal-header">
              <h3>Link Documents: {linkDocApp.application_type}</h3>
              <button className="close-btn" onClick={() => setLinkDocApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="link-doc-desc">
                Select documents from your Document Vault to link with this application package.
              </p>

              {loadingDocs ? (
                <p>Loading documents checklist...</p>
              ) : businessDocs.length === 0 ? (
                <p>No documents found in vault.</p>
              ) : (
                <div className="link-docs-list">
                  {businessDocs.map((doc) => {
                    const isLinked = linkedDocs.some((l) => l.document_id === doc.id || l.document?.id === doc.id);
                    const isUploaded = Boolean(doc.storage_path || doc.status === 'uploaded' || doc.status === 'verified');

                    return (
                      <div key={doc.id} className={`link-doc-row ${isLinked ? 'linked' : ''}`}>
                        <label className="link-doc-label">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => handleToggleDocLink(doc.id, isLinked)}
                          />
                          <div className="link-doc-info">
                            <span className="link-doc-name">{doc.document_name}</span>
                            <span className="link-doc-status">
                              {isUploaded ? '✓ Uploaded' : 'Missing'} • {doc.source === 'required' ? 'Mandatory' : 'Optional'}
                            </span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="submit-btn" onClick={() => setLinkDocApp(null)}>
                Done Linking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: APPLICATION TIMELINE ───────────────────────────────────── */}
      {timelineApp && (
        <div className="modal-backdrop" onClick={() => setTimelineApp(null)}>
          <div className="timeline-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Application Audit Trail</h3>
              <button className="close-btn" onClick={() => setTimelineApp(null)}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              <div className="drawer-app-summary">
                <strong>{timelineApp.application_type}</strong>
                <span>{timelineApp.institution_name} • {timelineApp.status}</span>
              </div>

              {loadingTimeline ? (
                <p>Loading timeline events...</p>
              ) : timelineEvents.length === 0 ? (
                <p className="no-events-notice">No audit events recorded for this application yet.</p>
              ) : (
                <div className="timeline-events-list">
                  {timelineEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="app-timeline-event">
                      <div className="event-marker" />
                      <div className="event-content">
                        <strong className="event-title">{evt.title}</strong>
                        {evt.description && <p className="event-desc">{evt.description}</p>}
                        <span className="event-time">{new Date(evt.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
