import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import { MapPin } from 'lucide-react';

export default function LocationAnalysis() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { analysisRadius, setAnalysisRadius, marketAnalysis, loadDemoData } = useBusinessStore();

  const handleAnalyze = () => {
    if (user) loadDemoData(user.businessInterest, user.location.village);
  };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <MapPin size={24} />
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.locationAnalysis')}</h1>
      </div>

      <div className="grid grid-2">
        {/* Location Selection */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Selected Location</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="flex justify-between"><span className="text-sm text-muted">{t('auth.state')}</span><span className="text-sm font-semibold">{user?.location.state}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted">{t('auth.district')}</span><span className="text-sm font-semibold">{user?.location.district}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted">{t('onboarding.block')}</span><span className="text-sm font-semibold">{user?.location.block}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted">{t('onboarding.village')}</span><span className="text-sm font-semibold">{user?.location.village}</span></div>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="form-label">Analysis Radius</label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {[5, 10].map((r) => (
                <button key={r} className={`btn btn--sm ${analysisRadius === r ? 'btn--green' : 'btn--outline-green'}`}
                  onClick={() => setAnalysisRadius(r)}>{r} {t('common.km')}</button>
              ))}
            </div>
          </div>
          <button className="btn btn--green btn--full" style={{ marginTop: 'var(--space-5)' }} onClick={handleAnalyze}>
            Analyze Location
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="card" style={{ minHeight: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-secondary)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-green-lighter), var(--color-cream))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <MapPin size={40} style={{ color: 'var(--color-green)', marginBottom: 'var(--space-3)' }} />
            <p className="font-semibold" style={{ marginBottom: 'var(--space-2)' }}>📍 {user?.location.village}, {user?.location.district}</p>
            <p className="text-sm text-muted">Radius: {analysisRadius} KM</p>
            {marketAnalysis && (
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <p className="text-xs text-muted">{marketAnalysis.nearbyVillages.length} nearby villages detected</p>
                <p className="text-xs text-muted">{t('business.demoData')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nearby Villages */}
      {marketAnalysis && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('business.nearbyVillages')}</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Village</th><th>Distance</th><th>Population</th></tr></thead>
              <tbody>
                {marketAnalysis.nearbyVillages.map((v) => (
                  <tr key={v.name}><td>{v.name}</td><td>{v.distance} KM</td><td>{v.population.toLocaleString('en-IN')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
