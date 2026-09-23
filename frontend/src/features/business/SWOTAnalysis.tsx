import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { Shield, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

export default function SWOTAnalysis() {
  const { t } = useTranslation();
  const swot = useBusinessStore((s) => s.swot);
  if (!swot) return (<div className="page-enter empty-state"><Shield size={48} className="empty-state__icon" /><h3 className="empty-state__title">No SWOT analysis yet.</h3><p className="empty-state__description">Complete business analysis to generate SWOT.</p></div>);

  const quadrants = [
    { title: t('business.strengths'), items: swot.strengths, icon: <TrendingUp size={22} />, color: '#16834A', bg: 'var(--color-green-lighter)' },
    { title: t('business.weaknesses'), items: swot.weaknesses, icon: <TrendingDown size={22} />, color: '#F28C28', bg: 'var(--color-warning-light)' },
    { title: t('business.opportunities'), items: swot.opportunities, icon: <Target size={22} />, color: '#0B2545', bg: 'rgba(11,37,69,0.06)' },
    { title: t('business.threatsList'), items: swot.threats, icon: <AlertTriangle size={22} />, color: '#F04438', bg: 'var(--color-error-light)' },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}><Shield size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.swot')}</h1></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {quadrants.map((q) => (
          <div key={q.title} className="card card--flat" style={{ borderTop: `4px solid ${q.color}` }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: q.color }}>{q.icon}</div>
              <h3 style={{ color: q.color }}>{q.title}</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {q.items.map((item, i) => (
                <li key={i} className="text-sm" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', gap: 'var(--space-2)' }}>
                  <span style={{ color: q.color }}>•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-6)' }}>{t('business.demoData')}</p>
    </div>
  );
}
