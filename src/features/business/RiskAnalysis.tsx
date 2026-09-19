import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { AlertTriangle } from 'lucide-react';

export default function RiskAnalysis() {
  const { t } = useTranslation();
  const risks = useBusinessStore((s) => s.risks);
  if (!risks.length) return (<div className="page-enter empty-state"><AlertTriangle size={48} className="empty-state__icon" /><h3 className="empty-state__title">No risk analysis yet.</h3><p className="empty-state__description">Complete business analysis to identify risks.</p></div>);

  const impactColors = { low: 'var(--color-risk-low)', medium: 'var(--color-risk-medium)', high: 'var(--color-risk-high)' };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}><AlertTriangle size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.risks')}</h1></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {risks.map((risk) => (
          <div key={risk.id} className="card card--flat" style={{ borderLeft: `4px solid ${impactColors[risk.impact]}` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)' }}>{risk.title}</h3>
              <span className={`badge badge--${risk.impact === 'low' ? 'green' : risk.impact === 'medium' ? 'saffron' : 'error'}`}>
                {t(`common.${risk.impact}`)} {t('business.impact')}
              </span>
            </div>
            <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
              <div><span className="text-xs text-muted">Why</span><p className="text-sm">{risk.reason}</p></div>
              <div><span className="text-xs text-muted">{t('business.impact')}</span><p className="text-sm font-semibold" style={{ color: impactColors[risk.impact] }}>{t(`common.${risk.impact}`)}</p></div>
              <div><span className="text-xs text-muted">{t('business.mitigation')}</span><p className="text-sm">{risk.mitigation}</p></div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-6)' }}>{t('business.demoData')}</p>
    </div>
  );
}
