import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { Lightbulb } from 'lucide-react';

export default function OpportunityAnalysis() {
  const { t } = useTranslation();
  const opportunities = useBusinessStore((s) => s.opportunities);
  if (!opportunities.length) return (<div className="page-enter empty-state"><Lightbulb size={48} className="empty-state__icon" /><h3 className="empty-state__title">No opportunities identified yet.</h3><p className="empty-state__description">Complete business analysis to identify opportunities.</p></div>);

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}><Lightbulb size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.opportunities')}</h1></div>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>Potential opportunities identified based on your location and business category.</p>

      <div className="grid grid-2">
        {opportunities.map((opp) => (
          <div key={opp.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)' }}>{opp.title}</h3>
              <span className={`badge badge--${opp.risk === 'low' ? 'green' : opp.risk === 'medium' ? 'saffron' : 'error'}`}>
                {t(`common.${opp.risk}`)} Risk
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div><span className="text-xs text-muted">Reason</span><p className="text-sm">{opp.reason}</p></div>
              <div><span className="text-xs text-muted">Potential Customer</span><p className="text-sm">{opp.potentialCustomer}</p></div>
              <div><span className="text-xs text-muted">Estimated Investment</span><p className="text-sm font-semibold">{opp.estimatedInvestment}</p></div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-green-lighter)', borderRadius: 'var(--radius-md)' }}>
                <span className="text-xs" style={{ color: 'var(--color-green)' }}>💡 Suggested Action</span>
                <p className="text-sm">{opp.suggestedAction}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-6)' }}>{t('business.demoData')}</p>
    </div>
  );
}
