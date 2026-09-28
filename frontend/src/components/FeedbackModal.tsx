/**
 * VYAVSAYMITRA — User Feedback Component (Phase 11)
 *
 * Lightweight, non-intrusive feedback collection for continuous improvement.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { feedbackApi } from '../api/apiClient';
import { useBodyScrollLock } from '../hooks';
import './FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  defaultCategory?: string;
  defaultFeature?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  businessId,
  defaultCategory = 'overall_experience',
  defaultFeature = 'general'
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const feedbackBodyRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when feedback modal is open
  useBodyScrollLock(isOpen);

  // Reset scroll position to top on every open
  useEffect(() => {
    if (isOpen && feedbackBodyRef.current) {
      feedbackBodyRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await feedbackApi.submit({
        rating,
        category,
        message: message.trim(),
        business_id: businessId,
        feature: defaultFeature
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share Your Feedback">
        <div className="feedback-modal-header">
          <h3>
            <span>💬</span> Share Your Feedback
          </h3>
          <button className="feedback-modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="feedback-success-card">
            <div className="feedback-success-icon">✓</div>
            <h4 className="feedback-success-title">Thank You!</h4>
            <p className="feedback-success-msg">
              Your feedback directly helps us improve VyavsayMitra for rural and MSME entrepreneurs across India.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="feedback-modal-body" ref={feedbackBodyRef}>
              {error && <div className="feedback-error-banner" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

              <div className="feedback-rating-group">
                <span className="feedback-rating-label">How was your experience?</span>
                <div className="feedback-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`feedback-star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-category">What are you providing feedback on?</label>
                <select
                  id="feedback-category"
                  className="feedback-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="overall_experience">Overall Platform Experience</option>
                  <option value="ai_mitra">AI Mitra Advisory</option>
                  <option value="business_analysis">Financial & Business Analysis</option>
                  <option value="action_plan">Action Plan & Milestones</option>
                  <option value="document_vault">Document Vault & Verification</option>
                  <option value="dpr">Bankable DPR Report</option>
                  <option value="market_intelligence">Market Prices & Mandi Trends</option>
                  <option value="applications">Statutory Schemes & Applications</option>
                </select>
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-message">Your Comments & Suggestions (Optional)</label>
                <textarea
                  id="feedback-message"
                  className="feedback-textarea"
                  placeholder="Tell us what you liked or what we can improve..."
                  maxLength={2000}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <span className="feedback-char-count">{message.length}/2000</span>
              </div>
            </div>

            <div className="feedback-modal-footer">
              <button type="button" className="feedback-btn-cancel" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="feedback-btn-submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

