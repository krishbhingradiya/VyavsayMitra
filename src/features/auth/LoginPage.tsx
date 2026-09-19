import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import TopInfoBar from '../../components/layout/TopInfoBar';
import './Login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const addToast = useUIStore((s) => s.addToast);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Errors & Feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const validateForm = () => {
    const errs: Record<string, string> = {};
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      errs.identifier = 'Please enter your email or mobile number';
    }

    if (!password) {
      errs.password = 'Please enter your password';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    try {
      const success = await login(identifier.trim(), password);
      if (success) {
        addToast({
          type: 'success',
          message: 'Welcome back! Redirecting to dashboard...',
        });
        navigate('/dashboard');
      } else {
        setGeneralError('Invalid email/mobile or password. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setGeneralError(message);
    }
  };

  const handleGoogleLogin = () => {
    addToast({
      type: 'info',
      message: 'Google Sign-In is opening...',
    });
  };

  return (
    <div className="login-fullscreen">
      {/* 1. Thin Top Government Information Bar */}
      <TopInfoBar />

      {/* 2. Main Login Composition Area */}
      <div className="login-main">
        {/* Background Image — Crisp HD unzoomed composition matching IMAGE 1 */}
        <img
          src="/login-bg-hd.jpg"
          className="login-bg-image"
          alt="Rural India"
        />

        {/* Invisible Hitbox over the Logo on left side for Home navigation */}
        <Link to="/" className="login-logo-link" title="VYAVSAYMITRA Home" />

        {/* Mobile-only Hero Header */}
        <div className="login-mobile-hero" />

        {/* Right Side Container holding the Login Card */}
        <div className="login-card-container">
          <div className="login-card">
            {/* Card Header */}
            <h1 className="login-card__title">Welcome Back</h1>
            <p className="login-card__subtitle">
              Login to continue your journey with<br />VyavsayMitra
            </p>

            {generalError && (
              <div className="login-alert-error" role="alert">
                {generalError}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email or Mobile Number Field */}
              <div className="login-form__group">
                <label className="login-form__label" htmlFor="login-identifier">
                  Email or Mobile Number
                </label>
                <div className="login-input__wrapper">
                  <Mail className="login-input__icon" size={18} />
                  <input
                    id="login-identifier"
                    type="text"
                    className={`login-input ${errors.identifier ? 'login-input--error' : ''}`}
                    placeholder="Enter your email or mobile number"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) {
                        setErrors((prev) => ({ ...prev, identifier: '' }));
                      }
                      if (generalError) setGeneralError('');
                    }}
                    autoComplete="username"
                  />
                </div>
                {errors.identifier && (
                  <span className="login-error-text">{errors.identifier}</span>
                )}
              </div>

              {/* Password Field */}
              <div className="login-form__group">
                <label className="login-form__label" htmlFor="login-password">
                  Password
                </label>
                <div className="login-input__wrapper">
                  <Lock className="login-input__icon" size={18} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`login-input ${errors.password ? 'login-input--error' : ''}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }
                      if (generalError) setGeneralError('');
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-password__toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="login-error-text">{errors.password}</span>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="login-form__row">
                <label className="login-checkbox__label">
                  <input
                    type="checkbox"
                    className="login-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot Password?
                </Link>
              </div>

              {/* Green Login Button */}
              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </button>

              {/* OR Divider */}
              <div className="login-divider">
                <span className="login-divider__line" />
                <span className="login-divider__text">OR</span>
                <span className="login-divider__line" />
              </div>

              {/* Continue with Google Button */}
              <button
                type="button"
                className="login-google-btn"
                onClick={handleGoogleLogin}
              >
                <svg className="login-google__icon" width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Sign Up Navigation */}
              <div className="login-signup__prompt">
                Don't have an account?{' '}
                <Link to="/register" className="login-signup__link">
                  Sign Up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
