import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useMediaQuery } from '../../hooks';
import { useBusinessStore } from '../../store/useBusinessStore';
import {
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Bell,
  Factory,
  Sprout,
  Plus,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { notificationsApi } from '../../api/apiClient';
import './DashboardLayout.css';

const MOBILE_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'New Business', path: '/businesses/new', icon: <Plus size={20} /> },
  { label: 'Profile', path: '/profile', icon: <User size={20} /> },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const rawBusinesses = useBusinessStore((s) => s.businesses);
  const businesses = useMemo(() => {
    const seen = new Set<string>();
    return (rawBusinesses || []).filter((b) => {
      if (!b?.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [rawBusinesses]);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const selectBusiness = useBusinessStore((s) => s.selectBusiness);
  const chatAi = useBusinessStore((s) => s.chatAi);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiMitraOpen, setAiMitraOpen] = useState(false);

  // AI Mitra Chat State
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Namaste! I am Mitra AI, your rural business advisory copilot. How can I help your enterprise today?',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch all user businesses on layout mount
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (aiMitraOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiMitraOpen]);

  // Real notifications loaded from database
  const [realNotifications, setRealNotifications] = useState<Array<{
    id: string;
    user_id: string;
    business_id?: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>>([]);

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      if (res.data) {
        setRealNotifications(res.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadNotifications();
  }, [activeBusiness?.id, businesses.length]);

  const handleMarkAsRead = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await notificationsApi.markRead(notifId);
      setRealNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (_) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setRealNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await notificationsApi.markRead(notif.id);
        setRealNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (_) {}
    }
    setNotificationsOpen(false);
    if (notif.business_id) {
      selectBusiness(notif.business_id);
      navigate(`/businesses/${notif.business_id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const unreadCount = useMemo(() => {
    return realNotifications.filter((n) => !n.is_read).length;
  }, [realNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAiSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = aiInput.trim();
    if (!query || aiLoading) return;

    setAiMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setAiInput('');
    setAiLoading(true);

    try {
      let reply = '';
      if (activeBusiness?.id) {
        reply = await chatAi(activeBusiness.id, query);
      } else {
        reply = 'Please select an active business enterprise first to receive tailored financial analysis, market rates, and subsidy guidance.';
      }
      setAiMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to reach advisory engine right now. Please try again or select an active business enterprise.',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setAiInput(promptText);
  };

  return (
    <div className="dash-layout">
      {/* ─── Unified Government Top Header ───────────────────── */}
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
            {/* Notification Bell Dropdown */}
            <div className="dash-header__notif-wrap">
              <button
                className="dash-header__bell"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserMenuOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="dash-header__bell-badge">{unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="dash-header__backdrop"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="dash-header__notif-dropdown">
                    <div className="dash-header__notif-header">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-green" />
                        <span className="dash-header__notif-title">Notifications & Alerts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <>
                            <span className="dash-header__notif-count">
                              {unreadCount} New
                            </span>
                            <button
                              className="dash-header__notif-mark-all"
                              onClick={handleMarkAllAsRead}
                            >
                              Mark all read
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="dash-header__notif-list">
                      {realNotifications.length === 0 ? (
                        <div className="dash-header__notif-empty">
                          <Bell size={24} className="dash-header__notif-empty-icon" />
                          <p className="dash-header__notif-empty-text">You're all caught up.</p>
                          <span className="dash-header__notif-empty-sub">
                            Feasibility updates and scheme matches will appear here.
                          </span>
                        </div>
                      ) : (
                        realNotifications.map((notif) => {
                          const isSuccess =
                            notif.type === 'ANALYSIS_COMPLETE' || notif.type === 'DPR_READY';
                          const isWarning = notif.type === 'INPUTS_REQUIRED';
                          const formattedTime = notif.created_at
                            ? new Date(notif.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recent';

                          return (
                            <div
                              key={notif.id}
                              className={`dash-header__notif-item ${
                                !notif.is_read ? 'dash-header__notif-item--unread' : ''
                              } ${
                                isSuccess
                                  ? 'dash-header__notif-item--success'
                                  : isWarning
                                  ? 'dash-header__notif-item--warning'
                                  : 'dash-header__notif-item--info'
                              }`}
                              onClick={() => handleNotificationClick(notif)}
                            >
                              <div className="dash-header__notif-item-icon">
                                {isSuccess && <CheckCircle2 size={16} />}
                                {isWarning && <AlertCircle size={16} />}
                                {!isSuccess && !isWarning && <Info size={16} />}
                              </div>
                              <div className="dash-header__notif-item-content">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="dash-header__notif-item-title">{notif.title}</span>
                                  {!notif.is_read && (
                                    <button
                                      className="dash-header__notif-mark-btn"
                                      onClick={(e) => handleMarkAsRead(e, notif.id)}
                                      title="Mark as read"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                </div>
                                <p className="dash-header__notif-item-msg">{notif.message}</p>
                                <span className="dash-header__notif-item-time">{formattedTime}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="dash-header__user-wrap">
              <div
                className="dash-header__user"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
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
                <>
                  <div
                    className="dash-header__backdrop"
                    onClick={() => setUserMenuOpen(false)}
                  />
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
                    <NavLink
                      to="/admin"
                      className="dash-header__dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <ShieldCheck size={15} /> Pilot Admin
                    </NavLink>
                    <NavLink
                      to="/field-operations"
                      className="dash-header__dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Sprout size={15} /> Field Operations
                    </NavLink>
                    <button
                      className="dash-header__dropdown-item dash-header__dropdown-item--logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </>
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
        {/* ─── SIDEBAR REDESIGN ──────────────────────────────── */}
        <aside
          className={`dash-sidebar ${sidebarOpen ? 'dash-sidebar--open' : 'dash-sidebar--closed'}`}
          role="navigation"
          aria-label="Dashboard navigation"
        >
          {/* Top Logo */}
          <div className="dash-sidebar__brand">
            <NavLink to="/dashboard" className="dash-sidebar__logo-link" aria-label="Dashboard Home">
              <BrandLogo size="sidebar" />
            </NavLink>
          </div>

          <nav className="dash-sidebar__nav">
            {/* 1. Dashboard */}
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
              }
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span className="dash-sidebar__item-icon">
                <LayoutDashboard size={18} />
              </span>
              <span className="dash-sidebar__item-label">Dashboard</span>
            </NavLink>

            {/* 2. + Start New Business (ONLY ONE PLUS ICON!) */}
            <NavLink
              to="/businesses/new"
              className={({ isActive }) =>
                `dash-sidebar__item dash-sidebar__item--cta ${
                  isActive ? 'dash-sidebar__item--active' : ''
                }`
              }
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span className="dash-sidebar__item-icon">
                <Plus size={18} />
              </span>
              <span className="dash-sidebar__item-label">Start New Business</span>
            </NavLink>

            {/* 3. MY BUSINESSES Section (Dynamic Multi-Business List) */}
            <div className="dash-sidebar__section">
              <div className="dash-sidebar__section-header">
                <span className="dash-sidebar__section-title">MY BUSINESSES</span>
                <span className="dash-sidebar__section-count">{businesses.length}</span>
              </div>

              <div className="dash-sidebar__biz-list">
                {businesses.length === 0 ? (
                  <div className="dash-sidebar__biz-empty">
                    <p>No businesses yet.</p>
                  </div>
                ) : (
                  businesses.map((biz) => {
                    const isAgri = biz.domain === 'agriculture';
                    const isCurrent = location.pathname === `/businesses/${biz.id}`;

                    return (
                      <NavLink
                        key={biz.id}
                        to={`/businesses/${biz.id}`}
                        onClick={() => {
                          selectBusiness(biz.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`dash-sidebar__biz-card ${
                          isCurrent ? 'dash-sidebar__biz-card--active' : ''
                        }`}
                        title={biz.name}
                      >
                        <span
                          className={`dash-sidebar__biz-icon ${
                            isAgri
                              ? 'dash-sidebar__biz-icon--agri'
                              : 'dash-sidebar__biz-icon--food'
                          }`}
                        >
                          {isAgri ? <Sprout size={16} /> : <Factory size={16} />}
                        </span>
                        <div className="dash-sidebar__biz-info">
                          <span className="dash-sidebar__biz-name">{biz.name}</span>
                          <span className="dash-sidebar__biz-domain">
                            {isAgri ? 'Agriculture' : 'FoodTech'}
                          </span>
                        </div>
                      </NavLink>
                    );
                  })
                )}
              </div>
            </div>

            {/* Account Management Navigation */}
            <div className="dash-sidebar__section" style={{ marginTop: 'auto' }}>
              <div className="dash-sidebar__section-header">
                <span className="dash-sidebar__section-title">ACCOUNT</span>
              </div>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="dash-sidebar__item-icon">
                  <User size={18} />
                </span>
                <span className="dash-sidebar__item-label">Profile</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="dash-sidebar__item-icon">
                  <Settings size={18} />
                </span>
                <span className="dash-sidebar__item-label">Settings</span>
              </NavLink>

              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="dash-sidebar__item-icon">
                  <ShieldCheck size={18} />
                </span>
                <span className="dash-sidebar__item-label">Pilot Admin</span>
              </NavLink>

              <NavLink
                to="/field-operations"
                className={({ isActive }) =>
                  `dash-sidebar__item ${isActive ? 'dash-sidebar__item--active' : ''}`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
                id="sidebar-field-operations"
              >
                <span className="dash-sidebar__item-icon">
                  <Sprout size={18} />
                </span>
                <span className="dash-sidebar__item-label">Field Operations</span>
              </NavLink>

              <button
                className="dash-sidebar__item dash-sidebar__item--logout"
                onClick={handleLogout}
              >
                <span className="dash-sidebar__item-icon">
                  <LogOut size={18} />
                </span>
                <span className="dash-sidebar__item-label">Logout</span>
              </button>
            </div>
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

        {/* ─── Main Content ─────────────────────────────────── */}
        <main className="dash-main">
          <div className="dash-content page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ─── FLOATING AI MITRA ENTRY POINT (Right-Side) ──────── */}
      <div className="dash-ai-mitra-container">
        {/* Floating Entry Button */}
        <button
          className={`dash-ai-mitra-btn ${aiMitraOpen ? 'dash-ai-mitra-btn--active' : ''}`}
          onClick={() => setAiMitraOpen(!aiMitraOpen)}
          aria-label="Open AI Mitra Assistant"
        >
          <span className="dash-ai-mitra-btn-icon">✨</span>
          <span className="dash-ai-mitra-btn-label">AI Mitra</span>
          <span className="dash-ai-mitra-btn-badge" />
        </button>

        {/* Floating AI Mitra Advisory Drawer / Popup */}
        {aiMitraOpen && (
          <div className="dash-ai-mitra-drawer" role="dialog" aria-label="AI Mitra Assistant Panel">
            {/* Header */}
            <div className="dash-ai-mitra-header">
              <div className="flex items-center gap-2.5">
                <div className="dash-ai-mitra-avatar-brand">✨</div>
                <div>
                  <h3 className="dash-ai-mitra-title">AI Mitra</h3>
                  <span className="dash-ai-mitra-subtitle">
                    {activeBusiness
                      ? `${activeBusiness.name} · ${activeBusiness.domain === 'agriculture' ? '🌾 Agriculture' : '🏭 FoodTech'}`
                      : 'Your Business Assistant'}
                  </span>
                </div>
              </div>
              <button
                className="dash-ai-mitra-close"
                onClick={() => setAiMitraOpen(false)}
                aria-label="Close AI Mitra"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="dash-ai-mitra-prompts">
              <button
                type="button"
                className="dash-ai-mitra-prompt-chip"
                onClick={() => handleQuickPrompt('What should I do next?')}
              >
                What should I do next?
              </button>
              <button
                type="button"
                className="dash-ai-mitra-prompt-chip"
                onClick={() => handleQuickPrompt('Explain my business analysis')}
              >
                Explain my analysis
              </button>
              <button
                type="button"
                className="dash-ai-mitra-prompt-chip"
                onClick={() => handleQuickPrompt('How much funding may I need?')}
              >
                How much funding may I need?
              </button>
              <button
                type="button"
                className="dash-ai-mitra-prompt-chip"
                onClick={() => handleQuickPrompt('Which schemes should I check?')}
              >
                Which schemes should I check?
              </button>
              <button
                type="button"
                className="dash-ai-mitra-prompt-chip"
                onClick={() => handleQuickPrompt('What are my major business risks?')}
              >
                What are my major risks?
              </button>
            </div>

            {/* Message Stream */}
            <div className="dash-ai-mitra-messages">
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`dash-ai-mitra-msg dash-ai-mitra-msg--${msg.sender}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="dash-ai-mitra-msg-avatar">🤖</div>
                  )}
                  <div className="dash-ai-mitra-msg-bubble">{msg.text}</div>
                </div>
              ))}
              {aiLoading && (
                <div className="dash-ai-mitra-msg dash-ai-mitra-msg--ai">
                  <div className="dash-ai-mitra-msg-avatar">🤖</div>
                  <div className="dash-ai-mitra-msg-bubble dash-ai-mitra-msg-loading">
                    <Sparkles size={14} className="animate-spin" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form className="dash-ai-mitra-form" onSubmit={handleAiSend}>
              <input
                type="text"
                className="dash-ai-mitra-input"
                placeholder={
                  activeBusiness
                    ? `Ask AI Mitra about ${activeBusiness.name}...`
                    : 'Ask AI Mitra...'
                }
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
              />
              <button
                type="submit"
                className="dash-ai-mitra-send"
                disabled={!aiInput.trim() || aiLoading}
                aria-label="Send query"
              >
                <span>Send</span>
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="dash-mobile-nav" role="navigation" aria-label="Mobile navigation">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `dash-mobile-nav__item ${isActive ? 'dash-mobile-nav__item--active' : ''}`
              }
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
