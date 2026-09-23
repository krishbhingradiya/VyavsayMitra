import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusinessStore } from '../../store/useBusinessStore';
import { MapPin, TrendingUp, Users, Lightbulb, Shield, AlertTriangle, Receipt, ArrowRight, BarChart3, Factory, Sparkles } from 'lucide-react';

const modules = [
  { icon: <MapPin size={22} />, titleKey: 'business.locationAnalysis', path: '/business-feasibility/location', color: 'green' },
  { icon: <TrendingUp size={22} />, titleKey: 'business.marketAnalysis', path: '/business-feasibility/market', color: 'primary' },
  { icon: <Users size={22} />, titleKey: 'business.competitors', path: '/business-feasibility/competitors', color: 'saffron' },
  { icon: <Lightbulb size={22} />, titleKey: 'business.opportunities', path: '/business-feasibility/opportunities', color: 'green' },
  { icon: <Shield size={22} />, titleKey: 'business.swot', path: '/business-feasibility/swot', color: 'primary' },
  { icon: <AlertTriangle size={22} />, titleKey: 'business.risks', path: '/business-feasibility/risks', color: 'saffron' },
  { icon: <Receipt size={22} />, titleKey: 'business.pricing', path: '/business-feasibility/pricing', color: 'green' },
];

export default function BusinessFeasibility() {
  const { t } = useTranslation();
  const marketAnalysis = useBusinessStore((s) => s.marketAnalysis);

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
        <BarChart3 size={24} />
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('business.feasibility')}</h1>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-8)' }}>
        Analyze your business location, market, competitors, and opportunities.
      </p>

      {/* Featured FoodTech & Agro-Processing Advisory Banner */}
      <div className="card" style={{
        marginBottom: 'var(--space-6)',
        background: 'linear-gradient(135deg, rgba(19, 136, 8, 0.08) 0%, rgba(255, 153, 51, 0.08) 100%)',
        border: '1px solid var(--color-green-light)',
        padding: 'var(--space-6)',
      }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-green)',
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Factory size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                  FoodTech & Agro-Processing Advisory
                </h3>
                <span className="badge badge--green flex items-center gap-1">
                  <Sparkles size={11} /> Institutional Models
                </span>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: '4px', maxWidth: 640 }}>
                Bankable DPR feasibility for Mini Flour Mill, Modern Rice Mill, Dal Mill, Oil Expeller & Spice Processing with MoFPI / CFTRI benchmarks and PMFME / PMEGP credit-linked subsidies.
              </p>
            </div>
          </div>
          <Link to="/foodtech-advisory" className="btn btn--green">
            Launch Advisory Engine <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {!marketAnalysis && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-warning-light)', borderColor: 'var(--color-saffron)' }}>
          <p className="text-sm">💡 Start with Location Analysis to generate insights for all modules.</p>
        </div>
      )}

      <div className="grid grid-3" style={{ gap: 'var(--space-5)' }}>
        {modules.map((mod) => (
          <Link key={mod.path} to={mod.path} className="card" style={{ textDecoration: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: mod.color === 'green' ? 'var(--color-green-lighter)' : mod.color === 'saffron' ? 'var(--color-warning-light)' : 'rgba(11,37,69,0.06)',
              color: mod.color === 'green' ? 'var(--color-green)' : mod.color === 'saffron' ? 'var(--color-saffron)' : 'var(--color-primary)',
              marginBottom: 'var(--space-4)' }}>
              {mod.icon}
            </div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              {t(mod.titleKey)}
            </h3>
            <span className="feature-card__cta"><ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
