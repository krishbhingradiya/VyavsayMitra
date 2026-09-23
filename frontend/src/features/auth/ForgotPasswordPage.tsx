import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import './Auth.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    addToast({ type: 'success', message: 'Reset link sent! Check your email or phone.' });
  };

  return (
    <div className="auth-page auth-page--centered">
      <div className="auth-form-wrapper auth-form-wrapper--compact">
        <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
          <BrandLogo asLink to="/" size="md" />
        </div>

        <h1 className="auth-title">{t('auth.forgotTitle')}</h1>
        <p className="auth-subtitle">{t('auth.forgotSubtitle')}</p>

        {submitted ? (
          <div className="auth-success">
            <div className="auth-success__icon">✓</div>
            <h3>Reset Link Sent!</h3>
            <p>If an account exists with this email/phone, you will receive a password reset link.</p>
            <Link to="/login" className="btn btn--primary btn--full btn--lg">
              <ArrowLeft size={16} /> {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">{t('auth.email')} / {t('auth.phone')}</label>
              <input id="forgot-email" type="text" className="form-input"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com or +91 98765 43210" />
            </div>
            <button type="submit" className="btn btn--green btn--full btn--lg">
              {t('auth.resetBtn')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} /> {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
