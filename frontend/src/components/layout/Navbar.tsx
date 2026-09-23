import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronDown, Check, Globe, User } from 'lucide-react';
import { useScrollPosition } from '../../hooks';
import { useAuthStore } from '../../store/useAuthStore';
import { LANGUAGES } from '../../config/constants';
import BrandLogo from '../common/BrandLogo';
import './Navbar.css';

export default function Navbar() {
  const { i18n } = useTranslation();
  const { isScrolled } = useScrollPosition();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('vyavsaymitra-lang', langCode);
    setLangDropdownOpen(false);
    setMobileOpen(false);
  };

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <header
      className={`navbar ${
        isScrolled
          ? 'navbar--scrolled'
          : (isHomePage ? 'navbar--home navbar--transparent' : '')
      }`}
      role="banner"
    >
      <div className="navbar__inner container">
        {/* LEFT: Brand Logo matching Reference */}
        <BrandLogo asLink to="/" size="md" />

        {/* CENTER: Intentionally empty to keep pre-login navigation clean */}
        <div className="navbar__spacer" />

        {/* RIGHT: Language Dropdown & Unified Login/Sign Up Button */}
        <div className="navbar__right">
          {/* Language Dropdown with Globe */}
          <div className="navbar__lang-dropdown-wrapper" ref={langDropdownRef}>
            <button
              type="button"
              className={`navbar__lang-trigger ${
                langDropdownOpen ? 'navbar__lang-trigger--active' : ''
              }`}
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={langDropdownOpen}
              aria-label={`Select Language, currently ${currentLang.label}`}
            >
              <Globe size={15} className="navbar__lang-globe" />
              <span className="navbar__lang-current-label">
                {currentLang.label}
              </span>
              <ChevronDown
                size={13}
                className={`navbar__lang-chevron ${
                  langDropdownOpen ? 'navbar__lang-chevron--open' : ''
                }`}
              />
            </button>

            {langDropdownOpen && (
              <ul
                className="navbar__lang-menu"
                role="listbox"
                aria-label="Languages"
              >
                {LANGUAGES.map((lang) => {
                  const isSelected = i18n.language === lang.code;
                  return (
                    <li
                      key={lang.code}
                      role="option"
                      aria-selected={isSelected}
                      className={`navbar__lang-item ${
                        isSelected ? 'navbar__lang-item--selected' : ''
                      }`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span className="navbar__lang-item-text">
                        {lang.label}
                      </span>
                      {isSelected && (
                        <Check size={14} className="navbar__lang-check" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Unified Login / Sign Up Pill Button matching Image 2 */}
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn navbar__user-pill-btn">
              <User size={16} />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className="btn navbar__user-pill-btn">
              <User size={16} />
              <span>Login / Sign Up</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="navbar__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="navbar__mobile-drawer" role="dialog" aria-modal="true">
          <div className="navbar__mobile-inner container">
            <div className="navbar__mobile-section">
              <label className="navbar__mobile-label">Language / भाषा / ભાષા</label>
              <div className="navbar__mobile-lang-grid">
                {LANGUAGES.map((lang) => {
                  const isSelected = i18n.language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className={`navbar__mobile-lang-btn ${
                        isSelected ? 'navbar__mobile-lang-btn--active' : ''
                      }`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span>{lang.label}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="navbar__mobile-auth">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn navbar__user-pill-btn w-full"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <User size={16} />
                  <span>Go to Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="btn navbar__user-pill-btn w-full"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <User size={16} />
                  <span>Login / Sign Up</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
