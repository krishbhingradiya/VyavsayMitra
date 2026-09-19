import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const addToast = useUIStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email or phone is required';
    if (!password.trim()) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await login(email, password);
    if (success) {
      addToast({ type: 'success', message: 'Welcome back! Redirecting to dashboard...' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-brand">
          <Link to="/" className="auth-brand__logo">
            <div className="auth-brand__icon">V</div>
            <span className="auth-brand__name">VYAVSAYMITRA</span>
          </Link>
          <h2 className="auth-brand__tagline">"{t('app.tagline')}"</h2>
          <p className="auth-brand__sub">{t('app.taglineSecondary')}</p>
          <div className="auth-brand__features">
            <div className="auth-brand__feature">📊 Market Intelligence</div>
            <div className="auth-brand__feature">💰 Financial Planning</div>
            <div className="auth-brand__feature">🏦 Scheme Advisory</div>
            <div className="auth-brand__feature">🤖 AI Business Companion</div>
          </div>
        </div>
      </div>
      <div className="auth-page__right">
        <div className="auth-form-wrapper">
          <h1 className="auth-title">{t('auth.loginTitle')}</h1>
          <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">{t('auth.email')} / {t('auth.phone')}</label>
              <input
                id="login-email" type="text" className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com or +91 98765 43210"
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">{t('auth.password')}</label>
              <div className="auth-password-wrapper">
                <input
                  id="login-password" type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="auth-row">
              <label className="checkbox-wrapper">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="text-sm">{t('auth.rememberMe')}</span>
              </label>
              <Link to="/forgot-password" className="auth-link">{t('auth.forgotPassword')}</Link>
            </div>

            <button type="submit" className="btn btn--green btn--full btn--lg" disabled={isLoading}>
              {isLoading ? 'Signing in...' : t('auth.loginBtn')}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-social">
            <button className="btn btn--outline btn--full" disabled>Sign in with Google</button>
          </div>

          <p className="auth-switch">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="auth-link auth-link--bold">{t('nav.signUp')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
