import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import {
  BarChart3, FolderOpen, IndianRupee, Sprout,
  ArrowRight, Landmark, TrendingUp, Bot, Plus
} from 'lucide-react';
import './Dashboard.css';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const projectCost = useFinanceStore((s) => s.projectCost);
  const recalculateAll = useFinanceStore((s) => s.recalculateAll);
  const loadDemoData = useBusinessStore((s) => s.loadDemoData);

  useEffect(() => {
    if (user && !projectCost) {
      recalculateAll(user.capital);
      loadDemoData(user.businessInterest, user.location.village);
    }
  }, [user, projectCost, recalculateAll, loadDemoData]);

  const firstName = user?.name?.split(' ')[0] || 'User';

  const stats = [
    { value: '3', label: 'Analyses Completed', icon: <BarChart3 size={22} />, color: 'green' },
    { value: '5', label: 'Saved Reports', icon: <FolderOpen size={22} />, color: 'blue' },
    { value: '12', label: 'Schemes Matched', icon: <IndianRupee size={22} />, color: 'orange' },
    { value: 'Future', sublabel: 'Looks Bright', icon: <Sprout size={22} />, color: 'green' },
  ];

  const popularActions = [
    {
      title: 'Start Business Analysis',
      description: 'Get detailed feasibility',
      icon: <BarChart3 size={24} />,
      path: '/business-feasibility',
      color: 'green',
    },
    {
      title: 'Explore Government Schemes',
      description: 'Find eligible businesses',
      icon: <Landmark size={24} />,
      path: '/scheme-advisor',
      color: 'blue',
    },
    {
      title: 'Check Market Insights',
      description: 'Know your local market',
      icon: <TrendingUp size={24} />,
      path: '/business-feasibility/market',
      color: 'orange',
    },
    {
      title: 'Ask AI Advisor',
      description: 'Get expert guidance',
      icon: <Bot size={24} />,
      path: '/ai-mitra',
      color: 'purple',
    },
  ];

  return (
    <div className="dhome page-enter">
      {/* Welcome Header */}
      <div className="dhome__header">
        <div>
          <h1 className="dhome__greeting">Namaste, {firstName}! 👋</h1>
          <p className="dhome__subtitle">Let's turn your ideas into a successful business.</p>
        </div>
        <Link to="/business-feasibility" className="btn btn--green btn--lg dhome__new-btn">
          <Plus size={18} />
          New Analysis
        </Link>
      </div>

      {/* Hero Banner Row */}
      <div className="dhome__banner-row">
        <div className="dhome__banner-main">
          <img
            src="/dashboard-banner.png"
            alt="Gaon Ki Soch, Vikas Ki Ore"
            className="dhome__banner-img"
          />
        </div>
        <div className="dhome__banner-side">
          <img
            src="/dashboard-quote.png"
            alt="Small Steps Today. A Prosperous Tomorrow."
            className="dhome__quote-img"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dhome__stats">
        {stats.map((stat, i) => (
          <div key={i} className={`dhome__stat-card dhome__stat-card--${stat.color}`}>
            <div className={`dhome__stat-icon dhome__stat-icon--${stat.color}`}>
              {stat.icon}
            </div>
            <div className="dhome__stat-value">{stat.value}</div>
            <div className="dhome__stat-label">
              {stat.sublabel ? stat.sublabel : stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Popular Actions */}
      <div className="dhome__actions-section">
        <h2 className="dhome__section-title">Popular Actions</h2>
        <div className="dhome__actions-grid">
          {popularActions.map((action, i) => (
            <Link key={i} to={action.path} className={`dhome__action-card dhome__action-card--${action.color}`}>
              <div className={`dhome__action-icon dhome__action-icon--${action.color}`}>
                {action.icon}
              </div>
              <div className="dhome__action-content">
                <h3 className="dhome__action-title">{action.title}</h3>
                <p className="dhome__action-desc">{action.description}</p>
              </div>
              <ArrowRight size={16} className="dhome__action-arrow" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
