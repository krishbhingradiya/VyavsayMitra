import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { Receipt } from 'lucide-react';
import { formatINR } from '../../utils/financial';

export default function ProductPricing() {
  const { t } = useTranslation();
  const pricing = useBusinessStore((s) => s.pricing);
  if (!pricing.length) return (<div className="page-enter empty-state"><Receipt size={48} className="empty-state__icon" /><h3 className="empty-state__title">No pricing data yet.</h3><p className="empty-state__description">Complete business analysis to see pricing suggestions.</p></div>);

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}><Receipt size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.pricing')}</h1></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {pricing.map((p) => (
          <div key={p.product} className="card">
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)' }}>{p.product}</h3>
            <div className="grid grid-3" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="metric-card"><div className="metric-card__label">{t('business.referencePrice')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(p.referenceMin)} – {formatINR(p.referenceMax)}</div></div>
              <div className="metric-card"><div className="metric-card__label">Retail Price</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-green)' }}>{formatINR(p.suggestedRetail)}</div></div>
              <div className="metric-card"><div className="metric-card__label">Bulk Price</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(p.suggestedBulk)}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)' }}>
              <div><span className="text-muted">Competitor Reference: </span>{p.competitorReference}</div>
              <div><span className="text-muted">Customer Segments: </span>{p.customerSegments.join(', ')}</div>
              <div><span className="text-muted">Local Factors: </span>{p.localFactors.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-6)' }}>Prices shown are reference estimates. Verify current market prices before finalizing.</p>
    </div>
  );
}
