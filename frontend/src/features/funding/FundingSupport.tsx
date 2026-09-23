import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { DEMO_FUNDING_SOURCES, DEMO_DOCUMENTS } from '../../data/demoBusinessData';
import { formatINR } from '../../utils/financial';
import {
  Banknote,
  Building2,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FundingSupport() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { projectCost } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'institutions' | 'checklist' | 'guidance'>('checklist');
  const [documents, setDocuments] = useState(DEMO_DOCUMENTS);
  const [fundingCategory, setFundingCategory] = useState<'all' | 'government' | 'financial-institution' | 'channelizing-agency'>('all');

  const readyCount = useMemo(() => documents.filter((d) => d.isReady).length, [documents]);
  const readinessPercent = Math.round((readyCount / documents.length) * 100);

  const toggleDoc = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isReady: !d.isReady } : d))
    );
  };

  const filteredSources = useMemo(() => {
    if (fundingCategory === 'all') return DEMO_FUNDING_SOURCES;
    return DEMO_FUNDING_SOURCES.filter((s) => s.type === fundingCategory);
  }, [fundingCategory]);

  return (
    <div className="page-enter">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(242, 140, 40, 0.12)',
              color: 'var(--color-saffron)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Banknote size={24} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 1.2,
              }}
            >
              {t('funding.fundingSupport', 'Funding Support & Application Center')}
            </h1>
            <p className="text-sm text-muted">
              Connect with funding channels, complete documentation, and follow verified application steps.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/financial-calculator" className="btn btn--outline btn--sm">
            Recalculate Loan
          </Link>
          <Link to="/scheme-advisor" className="btn btn--primary btn--sm">
            Browse All Schemes
          </Link>
        </div>
      </div>

      {/* Funding Summary Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface), var(--color-cream))',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'center',
          }}
        >
          <div>
            <span className="text-xs text-muted">Target Project Cost</span>
            <div
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontFamily: 'var(--font-data)',
                color: 'var(--color-primary)',
              }}
            >
              {formatINR(projectCost?.totalProjectCost || 1000000)}
            </div>
            <span className="text-xs text-muted">For {user?.businessInterest || 'dairy'} enterprise</span>
          </div>

          <div>
            <span className="text-xs text-muted">Your Margin Money (10%)</span>
            <div
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontFamily: 'var(--font-data)',
                color: 'var(--color-saffron)',
              }}
            >
              {formatINR(projectCost?.marginCapital || 100000)}
            </div>
            <span className="text-xs text-muted">Self-financed equity</span>
          </div>

          <div>
            <span className="text-xs text-muted">Required Loan / Grant (90%)</span>
            <div
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontFamily: 'var(--font-data)',
                color: 'var(--color-green)',
              }}
            >
              {formatINR(projectCost?.loanAmount || 900000)}
            </div>
            <span className="text-xs text-muted">Eligible for Scheme Subsidies</span>
          </div>

          <div>
            <span className="text-xs text-muted">Document Readiness</span>
            <div
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontFamily: 'var(--font-data)',
                color: readinessPercent >= 75 ? 'var(--color-green)' : 'var(--color-saffron)',
              }}
            >
              {readyCount} / {documents.length} ({readinessPercent}%)
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--color-border)',
                borderRadius: 'var(--radius-full)',
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${readinessPercent}%`,
                  background: readinessPercent >= 75 ? 'var(--color-green)' : 'var(--color-saffron)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width var(--transition-base)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'checklist' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckSquare size={16} />
          Document Checklist ({readyCount}/{documents.length})
        </button>

        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'institutions' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('institutions')}
        >
          <Building2 size={16} />
          Funding Institutions & Agencies
        </button>

        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'guidance' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('guidance')}
        >
          <Sparkles size={16} />
          Application Roadmap & Guidance
        </button>
      </div>

      {/* TAB 1: Document Checklist */}
      {activeTab === 'checklist' && (
        <div>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                Loan & Subsidy Application Checklist
              </h3>
              <p className="text-xs text-muted">
                Tick the documents you have ready. These are required by banks and government agencies.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => setDocuments((prev) => prev.map((d) => ({ ...d, isReady: true })))}
              >
                Mark All Ready
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDocuments((prev) => prev.map((d) => ({ ...d, isReady: false })))}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)',
                  cursor: 'pointer',
                  border: doc.isReady
                    ? '1.5px solid var(--color-green)'
                    : '1px solid var(--color-border)',
                  background: doc.isReady ? 'rgba(22, 131, 74, 0.03)' : 'var(--color-surface)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ marginTop: 2, color: doc.isReady ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                  {doc.isReady ? <CheckSquare size={22} /> : <Square size={22} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                    <h4
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: doc.isReady ? 'var(--color-green)' : 'var(--color-text)',
                        textDecoration: doc.isReady ? 'none' : 'none',
                      }}
                    >
                      {doc.label}
                    </h4>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-bg)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted" style={{ lineHeight: 1.4 }}>
                    {doc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {readinessPercent < 100 ? (
            <div
              className="card"
              style={{
                background: 'rgba(242, 140, 40, 0.08)',
                border: '1px solid var(--color-saffron)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <AlertCircle size={24} color="var(--color-saffron)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                  {documents.length - readyCount} documents still needed
                </strong>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  You can generate the Detailed Business Proposal directly in the{' '}
                  <Link to="/business-plan" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                    Business Plan Generator
                  </Link>{' '}
                  to fulfill the bank project report requirement.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{
                background: 'rgba(22, 131, 74, 0.08)',
                border: '1px solid var(--color-green)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <ShieldCheck size={24} color="var(--color-green)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-green)' }}>
                  Documentation Complete!
                </strong>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Your dossier is ready for submission to the branch manager or channelizing agency.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Funding Institutions */}
      {activeTab === 'institutions' && (
        <div>
          {/* Sub-filter */}
          <div className="flex gap-2" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Channels' },
              { id: 'government', label: 'Government Bodies' },
              { id: 'financial-institution', label: 'Banks & Financial Institutions' },
              { id: 'channelizing-agency', label: 'Channelizing Agencies (KVIC / DIC)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn btn--sm ${fundingCategory === cat.id ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setFundingCategory(cat.id as any)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-3" style={{ gap: 'var(--space-6)' }}>
            {filteredSources.map((src) => (
              <div
                key={src.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 'var(--space-3)' }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(11, 37, 69, 0.08)',
                        color: 'var(--color-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      {src.type.replace('-', ' ')}
                    </span>
                    <Building2 size={18} color="var(--color-primary)" />
                  </div>

                  <h3
                    style={{
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    {src.name}
                  </h3>

                  <p className="text-xs text-muted" style={{ lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                    {src.purpose}
                  </p>

                  <div
                    style={{
                      background: 'var(--color-bg)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    <span className="text-xs text-muted block" style={{ marginBottom: 2 }}>
                      Potential Assistance
                    </span>
                    <strong className="text-sm font-data" style={{ color: 'var(--color-green)' }}>
                      {src.potentialSupport}
                    </strong>
                  </div>

                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <span className="text-xs font-semibold text-muted block" style={{ marginBottom: 4 }}>
                      Key Requirements
                    </span>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {src.eligibility.map((e, idx) => (
                        <li key={idx} className="text-xs text-muted" style={{ marginBottom: 2 }}>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-3)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  <Link
                    to="/ai-mitra"
                    className="btn btn--outline btn--sm w-full"
                    style={{ justifyContent: 'center' }}
                  >
                    Ask Mitra How to Apply
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Step-by-Step Guidance */}
      {activeTab === 'guidance' && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-6)' }}>
            Step-by-Step Loan & Grant Application Roadmap
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {[
              {
                step: 1,
                title: 'Finalize Feasibility & Business Plan',
                desc: 'Generate your 3-year financial projections and Detailed Project Report (DPR) through VyavsayMitra.',
                status: 'Completed / In Progress',
                time: 'Day 1-2',
              },
              {
                step: 2,
                title: 'Compile Document Dossier',
                desc: 'Gather KYC documents, passbook records, caste/category certificate (if subsidy eligible), and quotation proofs.',
                status: 'In Progress (Checklist)',
                time: 'Day 3-5',
              },
              {
                step: 3,
                title: 'Apply through JanSamarth / Udyam Portal',
                desc: 'Submit online application linking your chosen scheme (MUDRA or PMEGP) to your designated bank branch.',
                status: 'Next Step',
                time: 'Day 6-7',
              },
              {
                step: 4,
                title: 'Branch Verification & Field Inspection',
                desc: 'The Bank Field Officer conducts site inspection of your proposed location and assesses margin money.',
                status: 'Upcoming',
                time: 'Day 8-15',
              },
              {
                step: 5,
                title: 'Sanction Letter & Disbursement',
                desc: 'Sanction letter issued with interest rate subsidy endorsement. Funds disbursed in tranches.',
                status: 'Goal',
                time: 'Day 16-30',
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: s.step === 1 ? 'var(--color-green)' : s.step === 2 ? 'var(--color-saffron)' : 'var(--color-bg)',
                    border: '2px solid var(--color-border)',
                    color: s.step <= 2 ? 'white' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--font-weight-bold)',
                    flexShrink: 0,
                  }}
                >
                  {s.step}
                </div>

                <div style={{ flex: 1, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)' }}>
                      {s.title}
                    </h4>
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Clock size={12} />
                      {s.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.5, marginBottom: 'var(--space-2)' }}>
                    {s.desc}
                  </p>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: s.step === 1 ? 'rgba(22, 131, 74, 0.1)' : 'var(--color-bg)',
                      color: s.step === 1 ? 'var(--color-green)' : 'var(--color-text-muted)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Status: {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 'var(--space-6)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-4)',
            }}
          >
            <Link to="/business-plan" className="btn btn--primary">
              Generate Detailed Business Plan (DPR)
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
