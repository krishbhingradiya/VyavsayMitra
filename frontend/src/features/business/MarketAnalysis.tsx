import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#16834A', '#0B2545', '#F28C28', '#2E90FA', '#667085'];

export default function MarketAnalysis() {
  const { t } = useTranslation();
  const marketAnalysis = useBusinessStore((s) => s.marketAnalysis);

  if (!marketAnalysis) {
    return (
      <div className="page-enter empty-state">
        <TrendingUp size={48} className="empty-state__icon" />
        <h3 className="empty-state__title">No market analysis yet.</h3>
        <p className="empty-state__description">Complete location analysis first to generate market insights.</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <TrendingUp size={24} />
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.marketAnalysis')}</h1>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card">
          <div className="metric-card__label">{t('business.estimatedConsumers')}</div>
          <div className="metric-card__value">{marketAnalysis.estimatedConsumerBase.toLocaleString('en-IN')}</div>
          <div className="metric-card__sub">Within {marketAnalysis.localMarketReach} KM radius</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Distribution Channels</div>
          <div className="metric-card__value">{marketAnalysis.distributionChannels.length}</div>
          <div className="metric-card__sub">{marketAnalysis.distributionChannels.join(', ')}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">{t('business.nearbyVillages')}</div>
          <div className="metric-card__value">{marketAnalysis.nearbyVillages.length}</div>
          <div className="metric-card__sub">In coverage area</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Customer Segments */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('business.customerSegments')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={marketAnalysis.potentialCustomerSegments} dataKey="percentage" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => `${entry.name} ${entry.percentage}%`}>
                {marketAnalysis.potentialCustomerSegments.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Demand Indicators */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('business.demandIndicators')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marketAnalysis.demandIndicators}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#16834A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-muted text-center">{t('business.demoData')}</p>
    </div>
  );
}
