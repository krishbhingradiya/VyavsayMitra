import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useMediaQuery } from '../../hooks';
import {
  LayoutDashboard, User, BarChart3, Landmark, TrendingUp,
  Users, Bot, FileText, Settings, LogOut, ChevronDown,
  Menu, X, Bell
} from 'lucide-react';
import TopInfoBar from '../layout/TopInfoBar';
import BrandLogo from '../common/BrandLogo';
import './DashboardLayout.css';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
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
      {/* Top Info Bar */}
      <TopInfoBar />

      {/* Top Navbar */}
      <header className="dash-navbar">
        <div className="dash-navbar__left">
          {isMobile && (
            <button className="dash-navbar__menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
          <NavLink to="/dashboard" className="dash-navbar__logo-link">
            <BrandLogo size="sm" />
          </NavLink>
        </div>
        <div className="dash-navbar__right">
          <button className="dash-navbar__bell" aria-label="Notifications">
            <Bell size={20} />
            <span className="dash-navbar__bell-badge" />
          </button>
          <div className="dash-navbar__user" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="dash-navbar__avatar">
              <img
                src="/ramesh-avatar.png"
                alt={user?.name || 'User'}
                className="dash-navbar__avatar-img"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="dash-navbar__user-info">
              <span className="dash-navbar__user-name">{user?.name || 'Ramesh Patel'}</span>
              <span className="dash-navbar__user-role">Entrepreneur</span>
            </div>
            <ChevronDown size={16} className="dash-navbar__chevron" />
          </div>
          {/* User dropdown */}
          {userMenuOpen && (
            <div className="dash-navbar__dropdown">
              <NavLink to="/profile" className="dash-navbar__dropdown-item" onClick={() => setUserMenuOpen(false)}>
                <User size={16} /> Profile
              </NavLink>
              <NavLink to="/settings" className="dash-navbar__dropdown-item" onClick={() => setUserMenuOpen(false)}>
                <Settings size={16} /> Settings
              </NavLink>
              <button className="dash-navbar__dropdown-item dash-navbar__dropdown-item--logout" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar Overlay (mobile) */}
      {isMobile && sidebarOpen && (
        <div className="dash-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="dash-body">
        {/* Sidebar */}
        <aside className={`dash-sidebar ${sidebarOpen ? 'dash-sidebar--open' : 'dash-sidebar--closed'}`} role="navigation" aria-label="Dashboard navigation">
          <nav className="dash-sidebar__nav">
            {SIDEBAR_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="dash-sidebar__item-icon">{item.icon}</span>
                <span className="dash-sidebar__item-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="dash-sidebar__footer">
            <button className="dash-sidebar__item dash-sidebar__item--logout" onClick={handleLogout}>
              <span className="dash-sidebar__item-icon"><LogOut size={18} /></span>
              <span className="dash-sidebar__item-label">Logout</span>
            </button>
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
