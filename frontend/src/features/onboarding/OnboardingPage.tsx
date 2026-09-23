import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import { useUIStore } from '../../store/useUIStore';
import { BUSINESS_CATEGORIES, EXPERIENCE_LEVELS, INDIAN_STATES } from '../../types/user';
import { LANGUAGES } from '../../config/constants';
import { ArrowLeft, ArrowRight, CheckCircle, MapPin, Briefcase, DollarSign, Award, Globe } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import './Onboarding.css';

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const recalculateAll = useFinanceStore((s) => s.recalculateAll);
  const loadDemoData = useBusinessStore((s) => s.loadDemoData);
  const addToast = useUIStore((s) => s.addToast);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    state: 'Gujarat', district: 'Anand', block: 'Anand', village: 'Changa',
    businessInterest: 'dairy' as string,
    capital: 100000,
    experience: 'beginner' as string,
    language: 'en' as string,
  });
  const [completed, setCompleted] = useState(false);

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleFinish();
  };

  const handleFinish = () => {
    updateUser({
      name: form.name || 'Ramesh Patel',
      phone: form.phone || '+91 98765 43210',
      email: form.email || 'ramesh@example.com',
      location: { state: form.state, district: form.district, block: form.block, village: form.village, coordinates: { lat: 22.5977, lng: 72.8126 } },
      businessInterest: form.businessInterest as any,
      capital: form.capital,
      experience: form.experience as any,
      preferredLanguage: form.language as any,
    });
    completeOnboarding();
    recalculateAll(form.capital);
    loadDemoData(form.businessInterest, form.village);
    i18n.changeLanguage(form.language);
    localStorage.setItem('vyavsaymitra-lang', form.language);
    addToast({ type: 'success', message: t('onboarding.complete') });
    setCompleted(true);
  };

  if (completed) {
    return (
      <div className="onboarding-complete">
        <div className="onboarding-complete__card">
          <CheckCircle size={64} className="onboarding-complete__icon" />
          <h2>{t('onboarding.complete')}</h2>
          <p>{t('onboarding.completeDesc')}</p>
          <button className="btn btn--green btn--xl" onClick={() => navigate('/dashboard')}>
            {t('onboarding.goToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  const stepIcons = [
    null,
    <MapPin key="step-1" size={20} />,
    <MapPin key="step-2" size={20} />,
    <Briefcase key="step-3" size={20} />,
    <DollarSign key="step-4" size={20} />,
    <Award key="step-5" size={20} />,
    <Globe key="step-6" size={20} />,
  ];
  const stepTitles = ['', 'onboarding.step1Title', 'onboarding.step2Title', 'onboarding.step3Title', 'onboarding.step4Title', 'onboarding.step5Title', 'onboarding.step6Title'];

  return (
    <div className="onboarding">
      <div className="onboarding__sidebar">
        <div className="onboarding__brand">
          <BrandLogo asLink to="/" size="md" theme="dark" showTagline={false} />
        </div>
        <h2 className="onboarding__sidebar-title">{t('onboarding.title')}</h2>
        <div className="onboarding__steps-list">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`onboarding__step-indicator ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="onboarding__step-dot">{step > i + 1 ? '✓' : i + 1}</div>
              <span>{t(stepTitles[i + 1])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="onboarding__main">
        <div className="onboarding__progress">
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="onboarding__progress-text">Step {step} / {totalSteps}</span>
        </div>

        <div className="onboarding__content">
          <div className="onboarding__step-header">
            {stepIcons[step]}
            <h2>{t(stepTitles[step])}</h2>
          </div>

          {step === 1 && (
            <div className="onboarding__fields">
              <div className="form-group">
                <label className="form-label">{t('auth.name')}</label>
                <input className="form-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Ramesh Patel" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.phone')}</label>
                <input className="form-input" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.email')}</label>
                <input className="form-input" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="ramesh@example.com" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding__fields">
              <div className="form-group">
                <label className="form-label">{t('auth.state')}</label>
                <select className="form-select" value={form.state} onChange={(e) => handleChange('state', e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.district')}</label>
                <input className="form-input" value={form.district} onChange={(e) => handleChange('district', e.target.value)} placeholder="e.g. Anand" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('onboarding.block')}</label>
                <input className="form-input" value={form.block} onChange={(e) => handleChange('block', e.target.value)} placeholder="e.g. Anand" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('onboarding.village')}</label>
                <input className="form-input" value={form.village} onChange={(e) => handleChange('village', e.target.value)} placeholder="e.g. Changa" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding__grid-select">
              {BUSINESS_CATEGORIES.map((cat) => (
                <button key={cat.value}
                  className={`onboarding__option-card ${form.businessInterest === cat.value ? 'onboarding__option-card--selected' : ''}`}
                  onClick={() => handleChange('businessInterest', cat.value)}>
                  <span className="onboarding__option-emoji">{cat.icon}</span>
                  <span className="onboarding__option-label">{t(cat.labelKey)}</span>
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="onboarding__fields">
              <p className="onboarding__field-label">{t('onboarding.capitalLabel')}</p>
              <p className="form-hint" style={{ marginBottom: 'var(--space-4)' }}>{t('onboarding.capitalHint')}</p>
              <div className="onboarding__capital-input">
                <span className="onboarding__capital-symbol">₹</span>
                <input type="number" className="form-input onboarding__capital-field"
                  value={form.capital} onChange={(e) => handleChange('capital', parseInt(e.target.value) || 0)} />
              </div>
              <div className="onboarding__capital-presets">
                {[50000, 100000, 200000, 500000].map((amt) => (
                  <button key={amt} className={`btn btn--sm ${form.capital === amt ? 'btn--green' : 'btn--outline-green'}`}
                    onClick={() => handleChange('capital', amt)}>
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="onboarding__fields">
              <p className="onboarding__field-label">{t('onboarding.experienceLabel')}</p>
              <div className="onboarding__experience-options">
                {EXPERIENCE_LEVELS.map((exp) => (
                  <button key={exp.value}
                    className={`onboarding__exp-card ${form.experience === exp.value ? 'onboarding__exp-card--selected' : ''}`}
                    onClick={() => handleChange('experience', exp.value)}>
                    <span>{t(exp.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="onboarding__fields">
              <p className="onboarding__field-label">{t('onboarding.languageLabel')}</p>
              <div className="onboarding__experience-options">
                {LANGUAGES.map((lang) => (
                  <button key={lang.code}
                    className={`onboarding__exp-card ${form.language === lang.code ? 'onboarding__exp-card--selected' : ''}`}
                    onClick={() => handleChange('language', lang.code)}>
                    <span>{lang.label} ({lang.nativeLabel})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="onboarding__actions">
          {step > 1 && (
            <button className="btn btn--ghost btn--lg" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> {t('onboarding.back')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < totalSteps && (
            <button className="btn btn--ghost btn--lg" onClick={() => setStep(step + 1)}>
              {t('onboarding.skip')}
            </button>
          )}
          <button className="btn btn--green btn--lg" onClick={handleNext}>
            {step === totalSteps ? t('onboarding.finish') : t('onboarding.next')} {step < totalSteps && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
