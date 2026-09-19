import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { INDIAN_STATES, BUSINESS_CATEGORIES, EXPERIENCE_LEVELS, type BusinessCategory, type ExperienceLevel } from '../../types/user';
import { LANGUAGES } from '../../config/constants';
import { User, Save } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUIStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    state: user?.location?.state || '', district: user?.location?.district || '',
    block: user?.location?.block || '', village: user?.location?.village || '',
    businessInterest: user?.businessInterest || 'dairy',
    capital: user?.capital || 100000,
    experience: user?.experience || 'beginner',
    preferredLanguage: user?.preferredLanguage || 'en',
  });

  const handleSave = () => {
    updateUser({
      name: form.name, phone: form.phone, email: form.email,
      location: { state: form.state, district: form.district, block: form.block, village: form.village },
      businessInterest: form.businessInterest as any,
      capital: form.capital, experience: form.experience as any,
      preferredLanguage: form.preferredLanguage as any,
    });
    setEditing(false);
    addToast({ type: 'success', message: 'Profile updated successfully!' });
  };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <User size={24} className="text-muted" />
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('nav.profile')}</h1>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <h3>{editing ? 'Edit Profile' : 'Profile Information'}</h3>
          {!editing ? (
            <button className="btn btn--outline btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
          ) : (
            <button className="btn btn--green btn--sm" onClick={handleSave}><Save size={14} /> {t('common.save')}</button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="form-group"><label className="form-label">{t('auth.name')}</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} disabled={!editing} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label">{t('auth.phone')}</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} disabled={!editing} /></div>
            <div className="form-group"><label className="form-label">{t('auth.email')}</label>
              <input className="form-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} disabled={!editing} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label">{t('auth.state')}</label>
              <select className="form-select" value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} disabled={!editing}>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">{t('auth.district')}</label>
              <input className="form-input" value={form.district} onChange={(e) => setForm({...form, district: e.target.value})} disabled={!editing} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label">{t('onboarding.block')}</label>
              <input className="form-input" value={form.block} onChange={(e) => setForm({...form, block: e.target.value})} disabled={!editing} /></div>
            <div className="form-group"><label className="form-label">{t('onboarding.village')}</label>
              <input className="form-input" value={form.village} onChange={(e) => setForm({...form, village: e.target.value})} disabled={!editing} /></div>
          </div>
          <div className="form-group"><label className="form-label">Business Interest</label>
            <select className="form-select" value={form.businessInterest} onChange={(e) => setForm({...form, businessInterest: e.target.value as BusinessCategory})} disabled={!editing}>
              {BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {t(c.labelKey)}</option>)}</select></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label">Capital (₹)</label>
              <input className="form-input" type="number" value={form.capital} onChange={(e) => setForm({...form, capital: parseInt(e.target.value)||0})} disabled={!editing} /></div>
            <div className="form-group"><label className="form-label">Experience</label>
              <select className="form-select" value={form.experience} onChange={(e) => setForm({...form, experience: e.target.value as ExperienceLevel})} disabled={!editing}>
                {EXPERIENCE_LEVELS.map((e) => <option key={e.value} value={e.value}>{t(e.labelKey)}</option>)}</select></div>
          </div>
          <div className="form-group"><label className="form-label">{t('auth.preferredLanguage')}</label>
            <select className="form-select" value={form.preferredLanguage} onChange={(e) => setForm({...form, preferredLanguage: e.target.value as 'en' | 'hi' | 'gu'})} disabled={!editing}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label} ({l.nativeLabel})</option>)}</select></div>
        </div>
      </div>
    </div>
  );
}
