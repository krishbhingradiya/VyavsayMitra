import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useMediaQuery } from '../../hooks';
import {
  LayoutDashboard, User, MapPin, BarChart3, Users, Lightbulb, Shield, AlertTriangle,
  DollarSign, Calculator, Landmark, Calendar, CreditCard, Wallet, FileText, Bot,
  Settings, LogOut, ChevronDown, ChevronRight, Menu, X, TrendingUp, Receipt,
  Building2, FolderOpen, Target, PieChart, Banknote, ClipboardList
} from 'lucide-react';
import './DashboardLayout.css';

interface SidebarItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  children?: { labelKey: string; path: string; icon: React.ReactNode }[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { labelKey: 'nav.profile', path: '/profile', icon: <User size={18} /> },
  {
    labelKey: 'business.feasibility', path: '/business-feasibility', icon: <BarChart3 size={18} />,
    children: [
      { labelKey: 'business.locationAnalysis', path: '/business-feasibility/location', icon: <MapPin size={16} /> },
      { labelKey: 'business.marketAnalysis', path: '/business-feasibility/market', icon: <TrendingUp size={16} /> },
      { labelKey: 'business.competitors', path: '/business-feasibility/competitors', icon: <Users size={16} /> },
      { labelKey: 'business.opportunities', path: '/business-feasibility/opportunities', icon: <Lightbulb size={16} /> },
      { labelKey: 'business.swot', path: '/business-feasibility/swot', icon: <Shield size={16} /> },
      { labelKey: 'business.risks', path: '/business-feasibility/risks', icon: <AlertTriangle size={16} /> },
      { labelKey: 'business.pricing', path: '/business-feasibility/pricing', icon: <Receipt size={16} /> },
    ],
  },
  {
    labelKey: 'finance.calculator', path: '/financial-calculator', icon: <Calculator size={18} />,
    children: [
      { labelKey: 'finance.marginCalculator', path: '/financial-calculator/margin', icon: <DollarSign size={16} /> },
      { labelKey: 'finance.emiCalculator', path: '/financial-calculator/emi', icon: <CreditCard size={16} /> },
      { labelKey: 'finance.moratorium', path: '/financial-calculator/moratorium', icon: <Calendar size={16} /> },
      { labelKey: 'finance.repaymentSchedule', path: '/financial-calculator/repayment', icon: <ClipboardList size={16} /> },
      { labelKey: 'finance.operationalCosts', path: '/financial-calculator/operational-costs', icon: <Wallet size={16} /> },
      { labelKey: 'finance.workingCapital', path: '/financial-calculator/working-capital', icon: <Banknote size={16} /> },
    ],
  },
  { labelKey: 'scheme.advisor', path: '/scheme-advisor', icon: <Landmark size={18} /> },
  { labelKey: 'funding.title', path: '/funding-support', icon: <Building2 size={18} /> },
  { labelKey: 'plan.title', path: '/business-plan', icon: <FolderOpen size={18} /> },
  { labelKey: 'ai.title', path: '/ai-mitra', icon: <Bot size={18} /> },
  { labelKey: 'reports.title', path: '/reports', icon: <FileText size={18} /> },
  { labelKey: 'settings.title', path: '/settings', icon: <Settings size={18} /> },
];

const MOBILE_NAV = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { labelKey: 'business.feasibility', path: '/business-feasibility', icon: <BarChart3 size={20} /> },
  { labelKey: 'finance.calculator', path: '/financial-calculator', icon: <Calculator size={20} /> },
  { labelKey: 'ai.title', path: '/ai-mitra', icon: <Bot size={20} /> },
  { labelKey: 'nav.profile', path: '/profile', icon: <User size={20} /> },
];

export default function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (path: string) => {
    setExpandedSections((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Header */}
      {isMobile && (
        <header className="dashboard-mobile-header">
          <button className="btn btn--icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="dashboard-mobile-header__brand">VYAVSAYMITRA</span>
          <Target size={20} className="dashboard-mobile-header__icon" />
        </header>
      )}

      {/* Sidebar Overlay (mobile) */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`} role="navigation" aria-label="Dashboard navigation">
        {/* Sidebar Header */}
        {!isMobile && (
          <div className="sidebar__header">
            <NavLink to="/dashboard" className="sidebar__logo">
              <div className="sidebar__logo-icon">V</div>
              <div>
                <span className="sidebar__brand">VYAVSAYMITRA</span>
                <span className="sidebar__sub">{t('app.brandLine')}</span>
              </div>
            </NavLink>
          </div>
        )}

        {/* User Card */}
        <div className="sidebar__user">
          <div className="sidebar__avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.name || 'User'}</span>
            <span className="sidebar__user-location">📍 {user?.location?.village || 'Location'}</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="sidebar__nav">
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.path} className="sidebar__group">
              {item.children ? (
                <>
                  <button
                    className="sidebar__item sidebar__item--parent"
                    onClick={() => toggleSection(item.path)}
                    aria-expanded={expandedSections.includes(item.path)}
                  >
                    <span className="sidebar__item-icon">{item.icon}</span>
                    <span className="sidebar__item-label">{t(item.labelKey)}</span>
                    {expandedSections.includes(item.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {expandedSections.includes(item.path) && (
                    <div className="sidebar__children">
                      <NavLink
                        to={item.path}
                        end
                        className={({ isActive }) => `sidebar__child ${isActive ? 'sidebar__child--active' : ''}`}
                        onClick={() => isMobile && setSidebarOpen(false)}
                      >
                        <PieChart size={14} />
                        <span>Overview</span>
                      </NavLink>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) => `sidebar__child ${isActive ? 'sidebar__child--active' : ''}`}
                          onClick={() => isMobile && setSidebarOpen(false)}
                        >
                          {child.icon}
                          <span>{t(child.labelKey)}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <span className="sidebar__item-icon">{item.icon}</span>
                  <span className="sidebar__item-label">{t(item.labelKey)}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="sidebar__footer">
          <button className="sidebar__item sidebar__item--logout" onClick={handleLogout}>
            <span className="sidebar__item-icon"><LogOut size={18} /></span>
            <span className="sidebar__item-label">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? 'mobile-bottom-nav__item--active' : ''}`}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
