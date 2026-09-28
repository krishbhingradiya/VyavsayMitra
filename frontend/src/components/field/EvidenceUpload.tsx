import React, { useState } from 'react';
import { evidenceApi } from '../../api/apiClient';

interface EvidenceUploadProps {
  businessId: string;
  taskId?: string;
  outcomeId?: string;
  applicationId?: string;
  onUploadSuccess?: (evidence: any) => void;
  onCancel?: () => void;
}

const EVIDENCE_TYPES = [
  { value: 'business_photograph', label: 'Business Geotagged Photograph' },
  { value: 'equipment_photograph', label: 'Machinery / Equipment Photograph' },
  { value: 'infrastructure_photograph', label: 'Shed / Infrastructure Photograph' },
  { value: 'purchase_invoice', label: 'Purchase Invoice / Tax Bill' },
  { value: 'quotation', label: 'Authorized Vendor Quotation' },
  { value: 'bill', label: 'Electricity / Utility Bill' },
  { value: 'license_document', label: 'Statutory License / Registration (FSSAI/Udyam)' },
  { value: 'bank_document', label: 'Bank Statement / Sanction Letter' },
  { value: 'field_verification_record', label: 'Field Verification Report' },
  { value: 'production_record', label: 'Production / Processing Register' },
  { value: 'sales_record', label: 'Sales Invoice / GST Return' },
  { value: 'crop_record', label: 'Khasra / 7-12 Extract / Crop Sowing Record' },
  { value: 'other', label: 'Other Supporting Evidence' }
];

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  businessId,
  taskId,
  outcomeId,
  applicationId,
  onUploadSuccess,
  onCancel
}) => {
  const [title, setTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('business_photograph');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Content, setBase64Content] = useState<string>('');
  const [checksum, setChecksum] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute SHA-256 in browser for client-side provenance verification
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the safe 10MB limit.');
      return;
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (cleanName.includes('..')) {
      setError('Invalid file name.');
      return;
    }

    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      // Browser crypto SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setChecksum(hashHex);

      // Convert to base64 for transmission
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        setBase64Content(base64);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to compute secure file checksum: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Evidence title is required.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const payload = {
        title: title.trim(),
        evidenceType,
        notes: notes.trim(),
        source: 'user_upload',
        taskId: taskId || null,
        outcomeId: outcomeId || null,
        applicationId: applicationId || null,
        fileName: selectedFile?.name || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        fileContentBase64: base64Content || undefined,
        checksum: checksum || undefined
      };

      const res = await evidenceApi.createEvidence(businessId, payload);
      if (res.success) {
        if (onUploadSuccess) onUploadSuccess(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Evidence upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="evidence-upload-card" id="evidence-upload-form">
      <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: 700, color: '#2d3748' }}>
        📷 Upload Verifiable Proof / Evidence
      </h3>

      {error && (
        <div className="blocking-alert" style={{ marginBottom: 14 }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="evidence-form-grid">
          <div className="evidence-input-group">
            <label htmlFor="evidence-title">Evidence Title *</label>
            <input
              id="evidence-title"
              type="text"
              className="evidence-input"
              placeholder="e.g. Grain Milling Machine Invoice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="evidence-input-group">
            <label htmlFor="evidence-type">Evidence Category *</label>
            <select
              id="evidence-type"
              className="evidence-select"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              {EVIDENCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="evidence-input-group" style={{ marginBottom: 14 }}>
          <label htmlFor="evidence-file">Choose Verifiable File (Max 10MB: PDF, JPG, PNG, DOCX)</label>
          <input
            id="evidence-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.doc,.docx"
            onChange={handleFileChange}
            style={{ fontSize: '0.875rem' }}
          />
        </div>

        {checksum && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>SHA-256 CHECKSUM:</span>
            <div className="evidence-checksum-badge">{checksum}</div>
          </div>
        )}

        <div className="evidence-input-group" style={{ marginBottom: 16 }}>
          <label htmlFor="evidence-notes">Operational Notes / Context</label>
          <textarea
            id="evidence-notes"
            className="evidence-input"
            rows={2}
            placeholder="Details of purchase date, supplier name, serial number, or field observation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-primary-field" disabled={uploading}>
            {uploading ? 'Registering Evidence...' : '💾 Save & Register Evidence'}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary-field" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
