import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SCHEME_CONFIGS } from '../../config/schemeConfig';
import { DEMO_SCHEMES } from '../../data/demoBusinessData';
import { formatINR } from '../../utils/financial';
import {
  Landmark,
  Search,
  CheckCircle2,
  FileText,
  Clock,
  Percent,
  Coins,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CombinedScheme {
  id: string;
  name: string;
  category: string;
  purpose: string;
  loanRange: string;
  interest: string;
  tenure: string;
  moratorium?: string;
  eligibility: string[];
  documents: string[];
  source: string;
  isAutoMatched?: boolean;
}

export default function SchemeAdvisor() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { projectCost, selectedScheme } = useFinanceStore();
  const activeSchemeConfig = selectedScheme?.scheme;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSchemeDetail, setSelectedSchemeDetail] = useState<CombinedScheme | null>(null);

  // Combine scheme configs with demo schemes
  const allSchemes: CombinedScheme[] = useMemo(() => {
    const configured: CombinedScheme[] = SCHEME_CONFIGS.map((cfg) => {
      const isMatched = activeSchemeConfig?.id === cfg.id;
      const langName =
        i18n.language === 'hi'
          ? cfg.nameHi
          : i18n.language === 'gu'
          ? cfg.nameGu
          : cfg.name;

      return {
        id: cfg.id,
        name: langName,
        category: cfg.id === 'micro-finance' ? 'micro' : 'term',
        purpose: cfg.purpose,
        loanRange: `Up to ${formatINR(cfg.maxFunding)} (90% of Cost)`,
        interest: `${cfg.interestRate}% p.a.`,
        tenure: `${cfg.tenureYears} Years`,
        moratorium: `${cfg.moratoriumMonths} Months`,
        eligibility: cfg.eligibility,
        documents: cfg.documents,
        source: 'VyavsayMitra Deterministic Rules (Illustrative Demo)',
        isAutoMatched: isMatched,
      };
    });

    const additional: CombinedScheme[] = DEMO_SCHEMES.map((s) => ({
      id: s.id,
      name: s.name,
      category:
        s.id === 'nabard-dairy'
          ? 'agriculture'
          : s.id === 'stand-up'
          ? 'special'
          : 'general',
      purpose: s.purpose,
      loanRange: s.loanRange,
      interest: s.interest,
      tenure: s.tenure,
      moratorium: '3-6 Months',
      eligibility: s.eligibility,
      documents: s.documents,
      source: s.source,
      isAutoMatched: false,
    }));

    return [...configured, ...additional];
  }, [i18n.language, activeSchemeConfig]);

  const filteredSchemes = useMemo(() => {
    return allSchemes.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [allSchemes, searchQuery, selectedCategory]);

  return (
    <div className="page-enter">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(22, 131, 74, 0.12)',
                color: 'var(--color-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark size={24} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  lineHeight: 1.2,
                }}
              >
                {t('schemes.schemeAdvisor', 'Scheme Advisor & Subsidies')}
              </h1>
              <p className="text-sm text-muted">
                Explore verified central, state, and institutional funding schemes matched to your profile.
              </p>
            </div>
          </div>
        </div>

        <Link to="/funding-support" className="btn btn--outline btn--sm">
          <FileText size={16} />
          <span>View Document Checklist</span>
        </Link>
      </div>

      {/* Auto-matched Scheme Highlight Banner */}
      {activeSchemeConfig && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-8)',
            background: 'linear-gradient(135deg, #0B2545, #133966)',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242, 140, 40, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            className="flex items-center justify-between"
            style={{ flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  background: 'var(--color-saffron)',
                  color: 'white',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-bold)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Auto-Matched For You
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
                Based on your project cost of {formatINR(projectCost?.totalProjectCost || 1000000)}
              </span>
            </div>

            <Link
              to="/financial-calculator/margin"
              className="text-xs"
              style={{ color: 'var(--color-saffron-light)', textDecoration: 'underline' }}
            >
              Change Project Cost
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-6)',
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--space-2)',
                  color: 'white',
                }}
              >
                {activeSchemeConfig.name}
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, lineHeight: 1.5 }}>
                {activeSchemeConfig.purpose}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-4)',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75 }}>Interest Rate</span>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {activeSchemeConfig.interestRate}% p.a.
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75 }}>Tenure</span>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {activeSchemeConfig.tenureYears} Years
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75 }}>Loan Share</span>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  90% ({formatINR(projectCost?.loanAmount || 900000)})
                </p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75 }}>Moratorium</span>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {activeSchemeConfig.moratoriumMonths} Months
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-4)',
          background: 'var(--color-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          {/* Search box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
              minWidth: 240,
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search scheme name, purpose, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Schemes' },
              { id: 'micro', label: 'Micro Enterprise' },
              { id: 'term', label: 'Term Loans' },
              { id: 'agriculture', label: 'Dairy & Agri' },
              { id: 'special', label: 'Special & Women' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn btn--sm ${
                  selectedCategory === cat.id ? 'btn--primary' : 'btn--ghost'
                }`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count & Note */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}
      >
        <span>
          Showing <strong>{filteredSchemes.length}</strong> available schemes for{' '}
          <strong>{user?.location.district || 'Anand'}, {user?.location.state || 'Gujarat'}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Info size={13} />
          Official guidelines apply. Verify with local branch.
        </span>
      </div>

      {/* Scheme Cards Grid */}
      <div className="grid grid-2" style={{ gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {filteredSchemes.map((scheme) => (
          <div
            key={scheme.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: scheme.isAutoMatched
                ? '2px solid var(--color-green)'
                : '1px solid var(--color-border)',
              transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
            }}
          >
            <div>
              {/* Header */}
              <div
                className="flex items-start justify-between"
                style={{ marginBottom: 'var(--space-3)' }}
              >
                <div>
                  {scheme.isAutoMatched && (
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'rgba(22, 131, 74, 0.12)',
                        color: 'var(--color-green)',
                        fontSize: '11px',
                        fontWeight: 'var(--font-weight-bold)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      ✓ Recommended for your capital
                    </span>
                  )}
                  <h3
                    style={{
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {scheme.name}
                  </h3>
                </div>

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Landmark size={20} />
                </div>
              </div>

              <p
                className="text-sm text-muted"
                style={{
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-4)',
                  minHeight: 42,
                }}
              >
                {scheme.purpose}
              </p>

              {/* Specs Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Coins size={12} />
                    <span>Funding</span>
                  </div>
                  <div className="font-semibold font-data text-sm">{scheme.loanRange}</div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Percent size={12} />
                    <span>Interest</span>
                  </div>
                  <div className="font-semibold font-data text-sm">{scheme.interest}</div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Clock size={12} />
                    <span>Tenure</span>
                  </div>
                  <div className="font-semibold font-data text-sm">{scheme.tenure}</div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <ShieldCheck size={12} />
                    <span>Moratorium</span>
                  </div>
                  <div className="font-semibold font-data text-sm">{scheme.moratorium || '3 Months'}</div>
                </div>
              </div>

              {/* Eligibility Preview */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Key Eligibility
                </span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {scheme.eligibility.slice(0, 2).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-xs text-muted"
                      style={{ marginBottom: 'var(--space-1)' }}
                    >
                      <CheckCircle2 size={13} color="var(--color-green)" style={{ flexShrink: 0 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-4)',
                marginTop: 'var(--space-2)',
              }}
            >
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setSelectedSchemeDetail(scheme)}
              >
                Full Details
                <ChevronRight size={14} />
              </button>

              <Link to="/funding-support" className="btn btn--primary btn--sm">
                Apply & Prepare Docs
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedSchemeDetail && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedSchemeDetail(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                {selectedSchemeDetail.name}
              </h2>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setSelectedSchemeDetail(null)}
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              {selectedSchemeDetail.purpose}
            </p>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Eligibility Criteria</h4>
              <ul style={{ paddingLeft: 'var(--space-5)' }}>
                {selectedSchemeDetail.eligibility.map((el, i) => (
                  <li key={i} className="text-sm" style={{ marginBottom: 'var(--space-1)' }}>
                    {el}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Required Documents</h4>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {selectedSchemeDetail.documents.map((doc, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    📄 {doc}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="card"
              style={{
                background: 'var(--color-cream)',
                border: '1px solid #e3d5b0',
                marginBottom: 'var(--space-6)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text)',
              }}
            >
              <strong>Data Source Note:</strong> {selectedSchemeDetail.source}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelectedSchemeDetail(null)}
              >
                Close
              </button>
              <Link to="/funding-support" className="btn btn--primary">
                Proceed with this Scheme
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
