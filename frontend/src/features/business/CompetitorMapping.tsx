import { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/useBusinessStore';
import { intelligenceApi } from '../../api/apiClient';
import { Users, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  businessId?: string;
}

interface Competitor {
  id: string;
  name: string;
  category: string;
  location: string;
  district: string;
  state: string;
  geographicScope: 'LOCAL_DISTRICT' | 'REGIONAL_MARKET_HUB';
  distanceBenchmark: string;
  verifiedProducts: string[];
  publicPriceDisclosure: string;
  pricingStatus: string;
  tradeChannel: string;
  scaleCategory: string;
  verificationSource: string;
  retrievalDate: string;
  availableEvidence: string;
  dataStatus: string;
}

interface CompetitorResponse {
  status: string;
  message?: string;
  queryLocation?: string;
  competitorsCount: number;
  competitors: Competitor[];
  landscapeAnalysis?: {
    summary: string;
    observedEntitiesCount: number;
    localDistrictEntities: number;
    regionalHubEntities: number;
    primaryTradeChannels: string[];
    pricingAvailabilityNote: string;
  };
  fieldSurveyGuidance?: string[];
  provenance?: {
    sourceType: string;
    registryName: string;
    retrievedAt: string;
  };
}

export default function CompetitorMapping({ businessId }: Props) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const targetId = businessId || activeBusiness?.id;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompetitorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitors = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await intelligenceApi.getCompetitors(targetId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Unable to load verified competitor records.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to competitor intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, [targetId]);

  if (!targetId) {
    return (
      <div className="page-enter empty-state">
        <Users size={48} className="empty-state__icon" />
        <h3 className="empty-state__title">No Active Business Selected</h3>
        <p className="empty-state__description">Select a business from your dashboard to view verified competitor intelligence.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card text-center p-6" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} className="animate-spin text-green" />
        <span style={{ marginLeft: '0.75rem', fontWeight: 500 }}>Scanning verified APMC and enterprise directories...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-6 text-center">
        <AlertCircle size={32} className="text-amber-500" style={{ margin: '0 auto 8px auto' }} />
        <p style={{ margin: 0, color: '#dc2626' }}>{error}</p>
        <button className="btn btn--outline btn--sm" style={{ marginTop: '1rem' }} onClick={fetchCompetitors}>
          Retry Discovery
        </button>
      </div>
    );
  }

  const competitors = data?.competitors || [];
  const landscape = data?.landscapeAnalysis;
  const isInsufficient = data?.status === 'INSUFFICIENT_VERIFIED_DATA' || competitors.length === 0;

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.25rem' }}>
        <div className="flex items-center gap-2">
          <Users size={22} className="text-green" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Verified Competitor & Market Participant Discovery
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge--green">
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
            Zero Invented Records
          </span>
          <button
            className="btn btn--outline btn--sm"
            onClick={fetchCompetitors}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Scope banner */}
      <div className="text-xs text-muted" style={{ padding: '0.65rem 0.9rem', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
        📍 <strong>Geographic Search Scope:</strong> {data?.queryLocation || activeBusiness?.location?.district || 'Anand, Gujarat'} • Sourced from official APMC trader registers and registered enterprise directories.
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card p-3">
          <span className="text-xs text-muted block">Verified Entities Identified</span>
          <strong style={{ fontSize: '1.4rem' }}>{competitors.length}</strong>
          <span className="text-xs text-muted block">Registered operating units</span>
        </div>
        <div className="card p-3">
          <span className="text-xs text-muted block">Local District Proximity</span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--color-green)' }}>
            {landscape?.localDistrictEntities || 0}
          </strong>
          <span className="text-xs text-muted block">Within ~5-20 km local radius</span>
        </div>
        <div className="card p-3">
          <span className="text-xs text-muted block">Regional APMC Market Hubs</span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>
            {landscape?.regionalHubEntities || 0}
          </strong>
          <span className="text-xs text-muted block">Primary auction centers</span>
        </div>
      </div>

      {isInsufficient ? (
        <div className="card p-6" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
          <div className="flex items-center gap-2 mb-2 text-amber-700">
            <AlertCircle size={20} />
            <h4 style={{ fontWeight: 700, margin: 0 }}>Insufficient Verified Directory Records</h4>
          </div>
          <p className="text-sm text-slate-700" style={{ marginBottom: '1rem' }}>
            {data?.message || 'No registered agro-industrial enterprise or APMC commission trader records are currently indexed for this specific micro-cluster.'}
          </p>
          <div className="text-xs text-slate-600">
            <strong>Recommended Ground Field Survey Actions:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
              {(data?.fieldSurveyGuidance || [
                'Conduct a 5-km village reconnaissance to observe operating chakki mills or grain aggregators.',
                'Consult the local APMC Market Committee secretary for registered commission agent directories.',
                'Inquire with District Industries Centre (DIC) for newly registered Udyam food processing micro-units.'
              ]).map((g, idx) => (
                <li key={idx}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <>
          {/* Competitor Table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Observed Market Competitors & Operating Entities
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Enterprise / Entity Name</th>
                    <th>Category</th>
                    <th>Proximity Benchmark</th>
                    <th>Observed Products</th>
                    <th>Public Pricing</th>
                    <th>Verification Source</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong className="block">{c.name}</strong>
                        <span className="text-xs text-muted">{c.location}</span>
                      </td>
                      <td>
                        <span className="badge badge--green">{c.category}</span>
                        <div className="text-xs text-muted mt-1">{c.tradeChannel}</div>
                      </td>
                      <td>
                        <span className="badge badge--blue">{c.distanceBenchmark}</span>
                      </td>
                      <td>
                        <div className="text-xs">{c.verifiedProducts.join(', ')}</div>
                      </td>
                      <td>
                        <span className={`text-xs ${c.pricingStatus === 'APMC_SPOT_AUCTION_RATES' ? 'text-green font-semibold' : 'text-muted'}`}>
                          {c.publicPriceDisclosure}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 block">{c.verificationSource}</span>
                        <span className="badge badge--neutral text-xs" style={{ marginTop: '0.2rem' }}>
                          ✓ {c.dataStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Landscape Summary & Observable Evidence Notice */}
          <div className="card p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              🔍 Observable Evidence & Honest Differentiation
            </h4>
            <p className="text-xs text-slate-700" style={{ lineHeight: '1.6', marginBottom: '0.75rem' }}>
              {landscape?.summary}
            </p>
            <div className="text-xs text-muted" style={{ padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              ⚖️ <strong>Compliance Notice:</strong> {landscape?.pricingAvailabilityNote}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
