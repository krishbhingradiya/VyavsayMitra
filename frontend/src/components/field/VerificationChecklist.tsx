import React, { useState } from 'react';
import { fieldOpsApi } from '../../api/apiClient';

export interface ChecklistItemData {
  id: string;
  label: string;
  completed: boolean;
  evidenceRequired?: boolean;
  notes?: string;
  evidenceIds?: string[];
  updatedAt?: string;
}

interface VerificationChecklistProps {
  businessId: string;
  visitId: string;
  checklist: ChecklistItemData[];
  onChecklistUpdated?: () => void;
}

export const VerificationChecklist: React.FC<VerificationChecklistProps> = ({
  businessId,
  visitId,
  checklist = [],
  onChecklistUpdated
}) => {
  const [items, setItems] = useState<ChecklistItemData[]>(checklist);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggle = async (item: ChecklistItemData) => {
    try {
      setUpdatingId(item.id);
      const nextCompleted = !item.completed;
      const res = await fieldOpsApi.updateChecklistItem(businessId, visitId, {
        itemId: item.id,
        completed: nextCompleted,
        notes: item.notes || '',
        evidenceIds: item.evidenceIds || []
      });

      if (res.success) {
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, completed: nextCompleted } : i))
        );
        if (onChecklistUpdated) onChecklistUpdated();
      }
    } catch (err: any) {
      alert(`Failed to update checklist item: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotesChange = async (itemId: string, newNotes: string) => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    try {
      await fieldOpsApi.updateChecklistItem(businessId, visitId, {
        itemId,
        completed: target.completed,
        notes: newNotes,
        evidenceIds: target.evidenceIds || []
      });
      setItems(prev =>
        prev.map(i => (i.id === itemId ? { ...i, notes: newNotes } : i))
      );
      if (onChecklistUpdated) onChecklistUpdated();
    } catch (err: any) {
      console.error('Failed to update notes:', err);
    }
  };

  return (
    <div className="checklist-container">
      <div className="checklist-title">
        <span>📋</span> Physical Verification Checklist
      </div>

      <div className="checklist-items">
        {items.map((item) => (
          <div key={item.id} className="checklist-item">
            <input
              type="checkbox"
              className="checklist-checkbox"
              checked={item.completed}
              disabled={updatingId === item.id}
              onChange={() => handleToggle(item)}
              id={`chk-${visitId}-${item.id}`}
            />
            <div className="checklist-label-group" style={{ flex: 1 }}>
              <label
                htmlFor={`chk-${visitId}-${item.id}`}
                className={`checklist-label ${item.completed ? 'completed' : ''}`}
              >
                {item.label}
              </label>
              {item.evidenceRequired && (
                <span className="evidence-tag" style={{ marginLeft: 8 }}>
                  📷 Verifiable Evidence Mandatory
                </span>
              )}
              <div style={{ marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Officer verification notes..."
                  defaultValue={item.notes || ''}
                  onBlur={(e) => handleNotesChange(item.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: '0.8125rem',
                    borderRadius: 4,
                    border: '1px solid #cbd5e0'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
