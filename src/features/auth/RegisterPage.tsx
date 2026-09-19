import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { INDIAN_STATES, LANGUAGES as LANG_OPTIONS } from '../../config/constants';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const addToast = useUIStore((s) => s.addToast);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    preferredLanguage: 'en' as 'en' | 'hi' | 'gu',
    state: '', district: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Mobile number is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.state) errs.state = 'Please select your state';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await register({
      name: form.name,
      phone: form.phone,
      email: form.email,
      preferredLanguage: form.preferredLanguage,
      location: { state: form.state, district: form.district, block: '', village: '' },
    });
    if (success) {
      addToast({ type: 'success', message: 'Account created! Let\'s set up your profile.' });
      navigate('/onboarding');
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
            <div className="auth-brand__feature">✓ Free to use</div>
            <div className="auth-brand__feature">✓ Available in Hindi, English & Gujarati</div>
            <div className="auth-brand__feature">✓ Complete business planning tools</div>
            <div className="auth-brand__feature">✓ AI-powered guidance</div>
          </div>
        </div>
      </div>
      <div className="auth-page__right">
        <div className="auth-form-wrapper">
          <h1 className="auth-title">{t('auth.registerTitle')}</h1>
          <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">{t('auth.name')}</label>
              <input id="reg-name" type="text" className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Ramesh Patel" />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-phone">{t('auth.phone')}</label>
                <input id="reg-phone" type="tel" className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                  value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">{t('auth.email')}</label>
                <input id="reg-email" type="email" className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="ramesh@example.com" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">{t('auth.password')}</label>
              <div className="auth-password-wrapper">
                <input id="reg-password" type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  value={form.password} onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimum 6 characters" />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-state">{t('auth.state')}</label>
                <select id="reg-state" className={`form-select ${errors.state ? 'form-input--error' : ''}`}
                  value={form.state} onChange={(e) => handleChange('state', e.target.value)}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <span className="form-error">{errors.state}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-district">{t('auth.district')}</label>
                <input id="reg-district" type="text" className="form-input"
                  value={form.district} onChange={(e) => handleChange('district', e.target.value)} placeholder="e.g. Anand" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-lang">{t('auth.preferredLanguage')}</label>
              <select id="reg-lang" className="form-select"
                value={form.preferredLanguage} onChange={(e) => handleChange('preferredLanguage', e.target.value)}>
                {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label} ({l.nativeLabel})</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn--green btn--full btn--lg" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : t('auth.registerBtn')}
            </button>
          </form>

          <p className="auth-switch">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="auth-link auth-link--bold">{t('nav.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
