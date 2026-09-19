import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { Users, MapPin } from 'lucide-react';

export default function CompetitorMapping() {
  const { t } = useTranslation();
  const competitors = useBusinessStore((s) => s.competitors);
  const within5 = competitors.filter((c) => c.distance <= 5);
  const within10 = competitors.filter((c) => c.distance <= 10);

  if (!competitors.length) {
    return (<div className="page-enter empty-state"><Users size={48} className="empty-state__icon" /><h3 className="empty-state__title">No competitor data yet.</h3><p className="empty-state__description">Complete location analysis to map competitors.</p></div>);
  }

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <Users size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.competitors')}</h1>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card"><div className="metric-card__label">{t('business.competitorCount')}</div><div className="metric-card__value">{competitors.length}</div></div>
        <div className="metric-card"><div className="metric-card__label">{t('business.within5km')}</div><div className="metric-card__value">{within5.length}</div></div>
        <div className="metric-card"><div className="metric-card__label">{t('business.within10km')}</div><div className="metric-card__value">{within10.length}</div></div>
      </div>

      {/* Map placeholder */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, var(--color-green-lighter), var(--color-cream))', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <MapPin size={32} style={{ color: 'var(--color-green)' }} />
        <p className="font-semibold">📍 Your Business Location</p>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {competitors.map((c) => (
            <div key={c.id} style={{ background: 'var(--color-surface)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', boxShadow: 'var(--shadow-sm)' }}>
              🏪 {c.name} ({c.distance} KM)
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Table */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Competitor Details</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Category</th><th>Distance</th><th>Est. Revenue</th></tr></thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.id}><td className="font-semibold">{c.name}</td><td><span className="badge badge--green">{c.category}</span></td><td>{c.distance} KM</td><td>{c.estimatedRevenue}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 'var(--space-4)' }}>{t('business.demoData')}</p>
      </div>
    </div>
  );
}
