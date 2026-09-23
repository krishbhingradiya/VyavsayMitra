import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useMediaQuery } from '../../hooks';
import {
  LayoutDashboard, User, BarChart3, Landmark, TrendingUp,
  Users, Bot, FileText, Settings, LogOut, ChevronDown,
  Menu, X, Bell, Factory
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import './DashboardLayout.css';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'FoodTech Advisory', path: '/foodtech-advisory', icon: <Factory size={18} /> },
  { label: 'Business Analysis', path: '/business-feasibility', icon: <BarChart3 size={18} /> },
  { label: 'Schemes & Funding', path: '/scheme-advisor', icon: <Landmark size={18} /> },
  { label: 'Market Insights', path: '/business-feasibility/market', icon: <TrendingUp size={18} /> },
  { label: 'Competitors', path: '/business-feasibility/competitors', icon: <Users size={18} /> },
  { label: 'AI Advisory', path: '/ai-mitra', icon: <Bot size={18} /> },
  { label: 'Saved Reports', path: '/reports', icon: <FileText size={18} /> },
  { label: 'Profile', path: '/profile', icon: <User size={18} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={18} /> },
];

const MOBILE_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Analysis', path: '/business-feasibility', icon: <BarChart3 size={20} /> },
  { label: 'AI Mitra', path: '/ai-mitra', icon: <Bot size={20} /> },
  { label: 'Profile', path: '/profile', icon: <User size={20} /> },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dash-layout">
      {/* Unified Government Header */}
      <header className="dash-header">
        <div className="dash-header__left">
          {isMobile && (
            <button
              className="dash-header__menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <div className="dash-header__gov">
            <svg
              className="dash-header__flag"
              width="22"
              height="15"
              viewBox="0 0 24 16"
              aria-label="Flag of India"
            >
              <rect width="24" height="5.33" fill="#FF9933" />
              <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
              <rect y="10.67" width="24" height="5.33" fill="#138808" />
              <circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.6" fill="none" />
              <circle cx="12" cy="8" r="0.4" fill="#000080" />
            </svg>
            <span className="dash-header__gov-title">Towards a Prosperous Rural India</span>
          </div>
        </div>

        <div className="dash-header__right">
          <div className="dash-header__missions">
            <span>Digital India</span>
            <span className="dash-header__sep">|</span>
            <span>Startup India</span>
            <span className="dash-header__sep">|</span>
            <span>Viksit Bharat</span>
          </div>

          <div className="dash-header__actions">
            <button className="dash-header__bell" aria-label="Notifications">
              <Bell size={18} />
              <span className="dash-header__bell-badge">3</span>
            </button>

            <div className="dash-header__user-wrap">
              <div
                className="dash-header__user"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                role="button"
                tabIndex={0}
              >
                <img
                  src="/ramesh-avatar.png"
                  alt={user?.name || 'User'}
                  className="dash-header__avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo-icon.png';
                  }}
                />
                <div className="dash-header__user-text">
                  <span className="dash-header__user-name">{user?.name || 'Ramesh Patel'}</span>
                  <span className="dash-header__user-role">Entrepreneur</span>
                </div>
                <ChevronDown size={14} className="dash-header__chevron" />
              </div>

              {userMenuOpen && (
                <div className="dash-header__dropdown">
                  <NavLink
                    to="/profile"
                    className="dash-header__dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={15} /> Profile
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="dash-header__dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={15} /> Settings
                  </NavLink>
                  <button
                    className="dash-header__dropdown-item dash-header__dropdown-item--logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (mobile) */}
      {isMobile && sidebarOpen && (
        <div className="dash-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="dash-body">
        {/* Sidebar */}
        <aside
          className={`dash-sidebar ${sidebarOpen ? 'dash-sidebar--open' : 'dash-sidebar--closed'}`}
          role="navigation"
          aria-label="Dashboard navigation"
        >
          {/* Top Logo */}
          <div className="dash-sidebar__brand">
            <NavLink to="/dashboard" className="dash-sidebar__logo-link">
              <BrandLogo size="md" />
            </NavLink>
          </div>

          <nav className="dash-sidebar__nav">
            {SIDEBAR_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="dash-sidebar__item-icon">{item.icon}</span>
                <span className="dash-sidebar__item-label">{item.label}</span>
              </NavLink>
            ))}

            <button
              className="dash-sidebar__item dash-sidebar__item--logout"
              onClick={handleLogout}
            >
              <span className="dash-sidebar__item-icon">
                <LogOut size={18} />
              </span>
              <span className="dash-sidebar__item-label">Logout</span>
            </button>
          </nav>

          {/* Rural Branding Widget at Sidebar Bottom */}
          <div className="dash-sidebar__rural-widget">
            <div className="dash-sidebar__rural-slogan">
              <span>Gaon Ki Soch,</span>
              <span className="dash-sidebar__rural-slogan-bold">Vikas Ki Ore</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 20 20"
                fill="none"
                className="dash-sidebar__rural-leaf"
              >
                <path d="M4 16C3.5 10 7.5 4 15 3C15 10.5 9 14.5 4 16Z" fill="#16834A" />
                <path d="M10 11C11.5 8 14 6.5 18 6C18 9.5 16 12 12.5 12.5" fill="#2E7D32" />
              </svg>
            </div>
            <div className="dash-sidebar__rural-banner">
              <img
                src="/dashboard-banner.png"
                alt="Rural Entrepreneur"
                className="dash-sidebar__rural-img"
              />
            </div>
            <p className="dash-sidebar__rural-caption">
              Empowering Rural Entrepreneurs for a Stronger India.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dash-main">
          <div className="dash-content page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="dash-mobile-nav" role="navigation" aria-label="Mobile navigation">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `dash-mobile-nav__item ${isActive ? 'dash-mobile-nav__item--active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
