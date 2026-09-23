import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, Home, ArrowLeft } from 'lucide-react';
import TopInfoBar from '../../components/layout/TopInfoBar';
import './Login.css';

const ROLES = [
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'investor', label: 'Investor' },
  { value: 'government', label: 'Government Official' },
];

interface LoginPageProps {
  initialMode?: 'login' | 'signup';
}

export default function LoginPage({ initialMode }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial mode from prop or current pathname
  const getRouteMode = () => {
    if (initialMode) return initialMode;
    return location.pathname.includes('register') ? 'signup' : 'login';
  };

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(getRouteMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // Store hooks
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const addToast = useUIStore((s) => s.addToast);

  // Extremely subtle mouse parallax (1-2% max)
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTransitioning) return;
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(hover: none)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    }
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);
    // Extremely subtle movement: max 3.5px horizontal, 2.5px vertical (~1%)
    setParallaxOffset({
      x: Math.round(normX * 3.5 * 10) / 10,
      y: Math.round(normY * 2.5 * 10) / 10,
    });
  };

  const handleCardMouseLeave = () => {
    setParallaxOffset({ x: 0, y: 0 });
  };

  // -------------------------------------------------------------
  // Login Form State
  // -------------------------------------------------------------
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginGeneralError, setLoginGeneralError] = useState('');

  // -------------------------------------------------------------
  // Sign Up Form State
  // -------------------------------------------------------------
  const [selectedRole, setSelectedRole] = useState('entrepreneur');
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  // Sync mode with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const mode = window.location.pathname.includes('register') ? 'signup' : 'login';
      setAuthMode(mode);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update mode when route changes externally
  useEffect(() => {
    const newMode = location.pathname.includes('register') ? 'signup' : 'login';
    if (newMode !== authMode) {
      setAuthMode(newMode);
    }
  }, [location.pathname]);

  // Mode switcher with debounce lock and URL update without full page reload
  const switchMode = (newMode: 'login' | 'signup') => {
    if (newMode === authMode || isTransitioning) return;
    setIsTransitioning(true);
    setParallaxOffset({ x: 0, y: 0 });
    setAuthMode(newMode);

    const targetPath = newMode === 'signup' ? '/register' : '/login';
    window.history.pushState(null, '', targetPath);

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 720);
  };

  // -------------------------------------------------------------
  // Login Handlers
  // -------------------------------------------------------------
  const validateLoginForm = () => {
    const errs: Record<string, string> = {};
    const trimmedId = loginIdentifier.trim();
    if (!trimmedId) {
      errs.identifier = 'Please enter your email or mobile number';
    }
    if (!loginPassword) {
      errs.password = 'Please enter your password';
    } else if (loginPassword.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginGeneralError('');

    if (!validateLoginForm()) return;

    try {
      const success = await login(loginIdentifier.trim(), loginPassword);
      if (success) {
        addToast({
          type: 'success',
          message: 'Welcome back! Redirecting to dashboard...',
        });
        navigate('/dashboard');
      } else {
        setLoginGeneralError('Invalid email/mobile or password. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setLoginGeneralError(message);
    }
  };

  // -------------------------------------------------------------
  // Sign Up Handlers
  // -------------------------------------------------------------
  const handleSignupChange = (field: string, value: string) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
    if (signupErrors[field]) {
      setSignupErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateSignupForm = () => {
    const errs: Record<string, string> = {};
    if (!signupForm.name.trim()) errs.name = 'Full name is required';
    if (!signupForm.email.trim()) errs.email = 'Email is required';
    if (!signupForm.phone.trim()) errs.phone = 'Mobile number is required';
    if (!signupForm.password || signupForm.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!agreedToTerms) errs.terms = 'You must agree to the Terms & Conditions';
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) return;

    const success = await register({
      name: signupForm.name,
      phone: signupForm.phone,
      email: signupForm.email,
      preferredLanguage: 'en',
      location: { state: '', district: '', block: '', village: '' },
    });

    if (success) {
      addToast({
        type: 'success',
        message: "Account created! Let's set up your profile.",
      });
      navigate('/onboarding');
    }
  };

  const handleGoogleAuth = () => {
    addToast({
      type: 'info',
      message: 'Google Sign-In is opening...',
    });
  };

  return (
    <div className="login-fullscreen">
      {/* 1. Thin Top Government Information Bar */}
      <TopInfoBar showTricolor={false} />

      {/* 2. Main Authentication Container Area */}
      <div className="login-main">
        <div
          ref={cardRef}
          className={`split-auth-card split-auth-card--${authMode} ${isTransitioning ? 'split-auth-card--transitioning' : ''}`}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          {/* =========================================================
              Sliding Rural Image Panel with Animated Text Overlay
              Moves smoothly from Right (Login) <-> Left (Sign Up)
              ========================================================= */}
          <div className="split-auth-sliding-panel">
            <img
              src="/rural-auth-panel.jpg"
              className="split-auth-image"
              alt="Rural India"
              style={{
                transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)`,
              }}
            />
            <div className="split-auth-image-overlay">
              {/* Overlay displayed during Login state */}
              <div className="split-auth-overlay-content split-auth-overlay-content--login">
                <h2 className="split-auth-overlay-title">Hello there</h2>
                <p className="split-auth-overlay-subtitle">
                  Begin your journey with VyavsayMitra.
                </p>
                <button
                  id="auth-overlay-signup-btn"
                  type="button"
                  className="split-auth-overlay-btn"
                  onClick={() => switchMode('signup')}
                >
                  SIGN UP
                </button>
              </div>

              {/* Overlay displayed during Sign-Up state */}
              <div className="split-auth-overlay-content split-auth-overlay-content--signup">
                <h2 className="split-auth-overlay-title">Welcome back</h2>
                <p className="split-auth-overlay-subtitle">
                  Login to continue your journey with VyavsayMitra.
                </p>
                <button
                  id="auth-overlay-login-btn"
                  type="button"
                  className="split-auth-overlay-btn"
                  onClick={() => switchMode('login')}
                >
                  LOGIN
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================
              Left Panel: Login Form
              Visible in Login State, slid/faded out in Sign Up State
              ========================================================= */}
          <div className="split-auth-form-panel split-auth-form-panel--left">
            {/* Back to Home Navigation Pill */}
            <div className="split-auth-back-wrapper">
              <Link
                to="/"
                className="split-auth-back-btn"
                id="login-back-to-home"
                aria-label="Back to Home"
              >
                <Home size={14} className="split-auth-back-icon-home" />
                <ArrowLeft size={13} className="split-auth-back-icon-arrow" />
                <span className="split-auth-back-text">Back to Home</span>
              </Link>
              <svg
                className="split-auth-back-leaf"
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 16C3.5 10 7.5 4 15 3C15 10.5 9 14.5 4 16Z"
                  fill="#16834A"
                />
                <path
                  d="M10 11C11.5 8 14 6.5 18 6C18 9.5 16 12 12.5 12.5"
                  fill="#2E7D32"
                  opacity="0.9"
                />
                <path
                  d="M5 15C8 12 11 8.5 14 4.5"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.65"
                />
              </svg>
            </div>

            <h1 className="split-auth-title">Login</h1>
            <p className="split-auth-subtitle">
              Sign in to continue to your dashboard
            </p>

            {loginGeneralError && (
              <div className="split-auth-alert-error" role="alert">
                {loginGeneralError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} noValidate>
              {/* Email or Mobile Number */}
              <div className="split-auth-group">
                <div className="split-auth-input-wrapper">
                  <Mail className="split-auth-input-icon" size={17} />
                  <input
                    id="login-identifier"
                    type="text"
                    className={`split-auth-input ${loginErrors.identifier ? 'split-auth-input--error' : ''}`}
                    placeholder="Email or Mobile Number"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      if (loginErrors.identifier) {
                        setLoginErrors((prev) => ({ ...prev, identifier: '' }));
                      }
                      if (loginGeneralError) setLoginGeneralError('');
                    }}
                    autoComplete="username"
                  />
                </div>
                {loginErrors.identifier && (
                  <span className="split-auth-error-text">{loginErrors.identifier}</span>
                )}
              </div>

              {/* Password Field */}
              <div className="split-auth-group">
                <div className="split-auth-input-wrapper">
                  <Lock className="split-auth-input-icon" size={17} />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    className={`split-auth-input ${loginErrors.password ? 'split-auth-input--error' : ''}`}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginErrors.password) {
                        setLoginErrors((prev) => ({ ...prev, password: '' }));
                      }
                      if (loginGeneralError) setLoginGeneralError('');
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="split-auth-password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {loginErrors.password && (
                  <span className="split-auth-error-text">{loginErrors.password}</span>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="split-auth-row">
                <label className="split-auth-checkbox-label">
                  <input
                    type="checkbox"
                    className="split-auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password" className="split-auth-forgot-link">
                  Forgot Password?
                </Link>
              </div>

              {/* Green Login Button */}
              <button
                type="submit"
                className="split-auth-submit-btn"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Signing in...' : 'Login'}</span>
                {!isLoading && <ArrowRight size={18} />}
              </button>

              {/* OR Divider */}
              <div className="split-auth-divider">
                <span className="split-auth-divider__line" />
                <span className="split-auth-divider__text">OR</span>
                <span className="split-auth-divider__line" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                className="split-auth-google-btn"
                onClick={handleGoogleAuth}
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
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

              {/* Switch to Sign Up */}
              <div className="split-auth-switch-prompt">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="split-auth-switch-btn"
                  onClick={() => switchMode('signup')}
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>

          {/* =========================================================
              Right Panel: Sign Up Form
              Visible in Sign Up State, slid/faded out in Login State
              ========================================================= */}
          <div className="split-auth-form-panel split-auth-form-panel--right">
            {/* Back to Home Navigation Pill */}
            <div className="split-auth-back-wrapper">
              <Link
                to="/"
                className="split-auth-back-btn"
                id="signup-back-to-home"
                aria-label="Back to Home"
              >
                <Home size={14} className="split-auth-back-icon-home" />
                <ArrowLeft size={13} className="split-auth-back-icon-arrow" />
                <span className="split-auth-back-text">Back to Home</span>
              </Link>
              <svg
                className="split-auth-back-leaf"
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 16C3.5 10 7.5 4 15 3C15 10.5 9 14.5 4 16Z"
                  fill="#16834A"
                />
                <path
                  d="M10 11C11.5 8 14 6.5 18 6C18 9.5 16 12 12.5 12.5"
                  fill="#2E7D32"
                  opacity="0.9"
                />
                <path
                  d="M5 15C8 12 11 8.5 14 4.5"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.65"
                />
              </svg>
            </div>

            <h1 className="split-auth-title">Create Your Account</h1>
            <p className="split-auth-subtitle">
              Join thousands of rural entrepreneurs
            </p>

            {/* Role Selection */}
            <div className="split-auth-role-section">
              <span className="split-auth-role-label">I am a</span>
              <div className="split-auth-role-grid">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className={`split-auth-role-btn ${selectedRole === role.value ? 'split-auth-role-btn--active' : ''}`}
                    onClick={() => setSelectedRole(role.value)}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSignupSubmit} noValidate>
              {/* Full Name */}
              <div className="split-auth-group split-auth-group--compact">
                <div className="split-auth-input-wrapper">
                  <User size={16} className="split-auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    className={`split-auth-input ${signupErrors.name ? 'split-auth-input--error' : ''}`}
                    placeholder="Full Name"
                    value={signupForm.name}
                    onChange={(e) => handleSignupChange('name', e.target.value)}
                  />
                </div>
                {signupErrors.name && (
                  <span className="split-auth-error-text">{signupErrors.name}</span>
                )}
              </div>

              {/* Email Address */}
              <div className="split-auth-group split-auth-group--compact">
                <div className="split-auth-input-wrapper">
                  <Mail size={16} className="split-auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className={`split-auth-input ${signupErrors.email ? 'split-auth-input--error' : ''}`}
                    placeholder="Email Address"
                    value={signupForm.email}
                    onChange={(e) => handleSignupChange('email', e.target.value)}
                  />
                </div>
                {signupErrors.email && (
                  <span className="split-auth-error-text">{signupErrors.email}</span>
                )}
              </div>

              {/* Mobile Number */}
              <div className="split-auth-group split-auth-group--compact">
                <div className="split-auth-input-wrapper">
                  <Phone size={16} className="split-auth-input-icon" />
                  <input
                    id="signup-phone"
                    type="tel"
                    className={`split-auth-input ${signupErrors.phone ? 'split-auth-input--error' : ''}`}
                    placeholder="Mobile Number"
                    value={signupForm.phone}
                    onChange={(e) => handleSignupChange('phone', e.target.value)}
                  />
                </div>
                {signupErrors.phone && (
                  <span className="split-auth-error-text">{signupErrors.phone}</span>
                )}
              </div>

              {/* Password */}
              <div className="split-auth-group split-auth-group--compact">
                <div className="split-auth-input-wrapper">
                  <Lock size={16} className="split-auth-input-icon" />
                  <input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    className={`split-auth-input ${signupErrors.password ? 'split-auth-input--error' : ''}`}
                    placeholder="Password"
                    value={signupForm.password}
                    onChange={(e) => handleSignupChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="split-auth-password-toggle"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signupErrors.password && (
                  <span className="split-auth-error-text">{signupErrors.password}</span>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="split-auth-terms-row">
                <input
                  type="checkbox"
                  id="signup-terms"
                  className="split-auth-checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (signupErrors.terms) {
                      setSignupErrors((prev) => {
                        const next = { ...prev };
                        delete next.terms;
                        return next;
                      });
                    }
                  }}
                />
                <label htmlFor="signup-terms" className="split-auth-terms-text">
                  I agree to the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a>
                </label>
              </div>
              {signupErrors.terms && (
                <span className="split-auth-error-text" style={{ marginBottom: 6 }}>
                  {signupErrors.terms}
                </span>
              )}

              {/* Sign Up Button */}
              <button
                type="submit"
                className="split-auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>

              {/* OR Divider */}
              <div className="split-auth-divider">
                <span className="split-auth-divider__line" />
                <span className="split-auth-divider__text">OR</span>
                <span className="split-auth-divider__line" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                className="split-auth-google-btn"
                onClick={handleGoogleAuth}
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
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

              {/* Switch to Login */}
              <div className="split-auth-switch-prompt">
                Already have an account?{' '}
                <button
                  type="button"
                  className="split-auth-switch-btn"
                  onClick={() => switchMode('login')}
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
