import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';
import TopInfoBar from '../../components/layout/TopInfoBar';
import './Auth.css';

const ROLES = [
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'investor', label: 'Investor' },
  { value: 'government', label: 'Government Official' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const addToast = useUIStore((s) => s.addToast);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('entrepreneur');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.phone.trim()) errs.phone = 'Mobile number is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!agreedToTerms) errs.terms = 'You must agree to the Terms & Conditions';
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
      preferredLanguage: 'en',
      location: { state: '', district: '', block: '', village: '' },
    });
    if (success) {
      addToast({ type: 'success', message: 'Account created! Let\'s set up your profile.' });
      navigate('/onboarding');
    }
  };

  return (
    <div className="auth-fullscreen">
      <TopInfoBar />

      <div className="auth-page">
        {/* Left Branding Panel — Green rural landscape */}
        <div className="auth-page__left auth-page__left--signup">
          <div className="auth-brand">
            <Link to="/" className="auth-brand__logo-link">
              <img src="/logo.png" alt="VYAVSAYMITRA" className="auth-brand__logo-img" />
            </Link>
            <h2 className="auth-brand__handwritten">
              Be a Part of<br />Rural Growth
            </h2>
            <div className="auth-brand__underline" />
            <p className="auth-brand__description">
              Create your account and start<br />building your business dreams.
            </p>
            <div className="auth-brand__features">
              <div className="auth-brand__feature-card">
                <span className="auth-brand__feature-icon">📊</span>
                Better Planning
              </div>
              <div className="auth-brand__feature-card">
                <span className="auth-brand__feature-icon">🌱</span>
                More Opportunities
              </div>
              <div className="auth-brand__feature-card">
                <span className="auth-brand__feature-icon">🤝</span>
                Stronger Communities
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-page__right">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Create Your Account</h1>
            <p className="auth-subtitle">
              Join thousands of rural entrepreneurs
            </p>

            {/* Role Selector */}
            <div className="role-selector">
              <span className="role-selector__label">I am a</span>
              <div className="role-selector__grid">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className={`role-selector__option ${selectedRole === role.value ? 'role-selector__option--active' : ''}`}
                    onClick={() => setSelectedRole(role.value)}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className="form-group">
                <div className="form-input-wrapper">
                  <User size={18} className="form-input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    className={`form-input form-input--with-icon ${errors.name ? 'form-input--error' : ''}`}
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="form-group">
                <div className="form-input-wrapper">
                  <Mail size={18} className="form-input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    className={`form-input form-input--with-icon ${errors.email ? 'form-input--error' : ''}`}
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Email Address"
                  />
                </div>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <div className="form-input-wrapper">
                  <Phone size={18} className="form-input-icon" />
                  <input
                    id="reg-phone"
                    type="tel"
                    className={`form-input form-input--with-icon ${errors.phone ? 'form-input--error' : ''}`}
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Mobile Number"
                  />
                </div>
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <div className="form-input-wrapper">
                  <Lock size={18} className="form-input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input form-input--with-icon ${errors.password ? 'form-input--error' : ''}`}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              {/* Terms & Conditions */}
              <div className="auth-terms">
                <input
                  type="checkbox"
                  id="reg-terms"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errors.terms) {
                      setErrors((prev) => { const n = { ...prev }; delete n.terms; return n; });
                    }
                  }}
                />
                <label htmlFor="reg-terms" className="auth-terms__text">
                  I agree to the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && <span className="form-error">{errors.terms}</span>}

              <button type="submit" className="btn btn--green btn--full btn--lg" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            {/* Social and Switch Links */}
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <div className="auth-social">
              <button className="btn btn--google btn--full" disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="auth-switch">
              Already have an account?{' '}
              <Link to="/login" className="auth-link auth-link--bold">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
