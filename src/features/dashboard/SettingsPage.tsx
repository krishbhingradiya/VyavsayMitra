import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import { LANGUAGES } from '../../config/constants';
import { Settings, Globe, Bell, Shield, Palette, UserCog, Sun, Moon } from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const addToast = useUIStore((s) => s.addToast);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('vyavsaymitra-lang', lang);
    addToast({ type: 'success', message: 'Language updated!' });
  };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <Settings size={24} className="text-muted" />
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('settings.title')}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>
        {/* Language */}
        <div className="card card--flat">
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Globe size={20} className="text-muted" />
            <h3>{t('settings.language')}</h3>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {LANGUAGES.map((lang) => (
              <button key={lang.code}
                className={`btn ${i18n.language === lang.code ? 'btn--green' : 'btn--outline'} btn--sm`}
                onClick={() => changeLanguage(lang.code)}>
                {lang.label} ({lang.nativeLabel})
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="card card--flat">
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Palette size={20} className="text-muted" />
            <h3>{t('settings.theme')}</h3>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className={`btn ${theme === 'light' ? 'btn--green' : 'btn--outline'} btn--sm`} onClick={() => theme !== 'light' && toggleTheme()}>
              <Sun size={14} /> {t('settings.lightMode')}
            </button>
            <button className={`btn ${theme === 'dark' ? 'btn--green' : 'btn--outline'} btn--sm`} onClick={() => theme !== 'dark' && toggleTheme()}>
              <Moon size={14} /> {t('settings.darkMode')}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card card--flat">
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Bell size={20} className="text-muted" />
            <h3>{t('settings.notifications')}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label className="checkbox-wrapper"><input type="checkbox" defaultChecked /> {t('settings.emailNotifications')}</label>
            <label className="checkbox-wrapper"><input type="checkbox" defaultChecked /> {t('settings.smsNotifications')}</label>
          </div>
        </div>

        {/* Privacy */}
        <div className="card card--flat">
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Shield size={20} className="text-muted" />
            <h3>{t('settings.privacy')}</h3>
          </div>
          <p className="text-sm text-muted">Your data is stored locally in your browser for this prototype.</p>
        </div>

        {/* Account */}
        <div className="card card--flat">
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <UserCog size={20} className="text-muted" />
            <h3>{t('settings.account')}</h3>
          </div>
          <button className="btn btn--outline btn--sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
