import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import { formatINR } from '../../utils/financial';
import { MapPin, Store, Wallet, TrendingUp, Users, Calculator, Landmark, CreditCard, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import './Dashboard.css';

export default function DashboardHome() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const projectCost = useFinanceStore((s) => s.projectCost);
  const selectedScheme = useFinanceStore((s) => s.selectedScheme);
  const emiResult = useFinanceStore((s) => s.emiResult);
  const recalculateAll = useFinanceStore((s) => s.recalculateAll);
  const loadDemoData = useBusinessStore((s) => s.loadDemoData);
  const competitors = useBusinessStore((s) => s.competitors);

  useEffect(() => {
    if (user && !projectCost) {
      recalculateAll(user.capital);
      loadDemoData(user.businessInterest, user.location.village);
    }
  }, [user, projectCost, recalculateAll, loadDemoData]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greeting');
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const progressItems = [
    { label: t('dashboard.profileComplete'), done: true },
    { label: t('dashboard.locationComplete'), done: true },
    { label: t('dashboard.businessComplete'), done: true },
    { label: t('dashboard.financialComplete'), done: !!projectCost },
    { label: t('dashboard.marketProgress'), progress: 60 },
    { label: t('dashboard.planProgress'), progress: 30 },
  ];

  const metrics = [
    { label: t('dashboard.marketOpportunity'), value: 'High Demand', icon: <TrendingUp size={20} />, color: 'green', path: '/business-feasibility/market' },
    { label: t('dashboard.competition'), value: `${competitors.length} nearby`, icon: <Users size={20} />, color: 'saffron', path: '/business-feasibility/competitors' },
    { label: t('dashboard.projectCost'), value: projectCost ? formatINR(projectCost.totalProjectCost) : '—', icon: <Calculator size={20} />, color: 'primary', path: '/financial-calculator/margin' },
    { label: t('dashboard.loanAmount'), value: projectCost ? formatINR(projectCost.loanAmount) : '—', icon: <Wallet size={20} />, color: 'primary', path: '/financial-calculator/loan' },
    { label: t('dashboard.scheme'), value: selectedScheme?.scheme.name || '—', icon: <Landmark size={20} />, color: 'green', path: '/scheme-advisor' },
    { label: t('dashboard.estimatedEMI'), value: emiResult ? formatINR(emiResult.monthlyEMI) : '—', icon: <CreditCard size={20} />, color: 'saffron', path: '/financial-calculator/emi' },
  ];

  return (
    <div className="dashboard-home page-enter">
      {/* Header */}
      <div className="dashboard-home__header">
        <div>
          <h1 className="dashboard-home__greeting">{greeting}, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
          <p className="dashboard-home__subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/business-plan" className="btn btn--green btn--lg">
          {t('plan.generate')} <ArrowRight size={16} />
        </Link>
      </div>

      {/* Profile Summary */}
      <div className="dashboard-home__profile card card--flat">
        <div className="dashboard-home__profile-item">
          <MapPin size={16} className="dashboard-home__profile-icon" />
          <span className="dashboard-home__profile-label">{t('dashboard.location')}</span>
          <span className="dashboard-home__profile-value">{user?.location?.village}, {user?.location?.district}</span>
        </div>
        <div className="dashboard-home__profile-item">
          <Store size={16} className="dashboard-home__profile-icon" />
          <span className="dashboard-home__profile-label">{t('dashboard.business')}</span>
          <span className="dashboard-home__profile-value">{t(`business.${user?.businessInterest || 'dairy'}`)}</span>
        </div>
        <div className="dashboard-home__profile-item">
          <Wallet size={16} className="dashboard-home__profile-icon" />
          <span className="dashboard-home__profile-label">{t('dashboard.capital')}</span>
          <span className="dashboard-home__profile-value">{formatINR(user?.capital || 0)}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="dashboard-home__metrics">
        {metrics.map((m, i) => (
          <Link key={i} to={m.path} className={`metric-card metric-card--${m.color}`}>
            <div className={`metric-card__icon-wrap metric-card__icon-wrap--${m.color}`}>{m.icon}</div>
            <div className="metric-card__label">{m.label}</div>
            <div className="metric-card__value">{m.value}</div>
          </Link>
        ))}
      </div>

      {/* Continue Analysis */}
      <div className="dashboard-home__progress card">
        <h3 className="dashboard-home__progress-title">{t('dashboard.continueAnalysis')}</h3>
        <div className="dashboard-home__progress-list">
          {progressItems.map((item, i) => (
            <div key={i} className="dashboard-home__progress-item">
              {item.done ? (
                <CheckCircle size={18} className="dashboard-home__check" />
              ) : (
                <Clock size={18} className="dashboard-home__pending" />
              )}
              <span className="dashboard-home__progress-label">{item.label}</span>
              {item.progress !== undefined && (
                <div className="dashboard-home__mini-progress">
                  <div className="progress-bar" style={{ width: 80 }}>
                    <div className="progress-bar__fill" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted">{item.progress}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <Link to="/business-feasibility" className="btn btn--outline-green btn--sm" style={{ marginTop: 'var(--space-4)' }}>
          {t('common.startAnalysis')}
        </Link>
      </div>

      {/* Demo Disclaimer */}
      <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-6)' }}>
        {t('common.demoDisclaimer')}
      </p>
    </div>
  );
}
