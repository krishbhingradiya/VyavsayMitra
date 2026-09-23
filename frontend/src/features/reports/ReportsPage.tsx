import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/financial';
import {
  FileText,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReportCardItem {
  id: string;
  title: string;
  category: string;
  description: string;
  updatedAt: string;
  pages: number;
  status: 'ready' | 'draft';
  route: string;
}

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const { projectCost, selectedScheme } = useFinanceStore();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reports: ReportCardItem[] = [
    {
      id: 'dpr',
      title: 'Detailed Project Report (DPR) for Bank Appraisal',
      category: 'Banking & Credit',
      description:
        'Standard bank-ready 3-year financial appraisal, means of finance, promoter contribution, and debt service coverage ratio.',
      updatedAt: 'Today, Just now',
      pages: 4,
      status: 'ready',
      route: '/business-plan',
    },
    {
      id: 'feasibility',
      title: 'Hyper-Local Business Feasibility & Market Study',
      category: 'Market Research',
      description:
        'Catchment demographic breakdown, consumer segments, competitor location mapping, and local demand indicators within 10 KM.',
      updatedAt: 'Today, 10 minutes ago',
      pages: 3,
      status: 'ready',
      route: '/business-feasibility',
    },
    {
      id: 'financial',
      title: 'Complete Financial Calculator & Amortization Dossier',
      category: 'Financial Analysis',
      description:
        'Margin money requirement, term loan computation, EMI repayment schedule, moratorium grace details, and operating cost breakup.',
      updatedAt: 'Today, 15 minutes ago',
      pages: 3,
      status: 'ready',
      route: '/financial-calculator',
    },
    {
      id: 'scheme',
      title: 'Government Scheme Eligibility & Subsidy Summary',
      category: 'Government Subsidies',
      description:
        'Evaluation of PMEGP, MUDRA, and state credit schemes with required document checklist for branch submission.',
      updatedAt: 'Today, 20 minutes ago',
      pages: 2,
      status: 'ready',
      route: '/scheme-advisor',
    },
  ];

  const handleDownload = (r: ReportCardItem) => {
    setDownloadingId(r.id);
    setTimeout(() => {
      setDownloadingId(null);
      window.print();
    }, 500);
  };

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
              background: 'rgba(11, 37, 69, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 1.2,
              }}
            >
              Business Reports & Appraisal Dossiers
            </h1>
            <p className="text-sm text-muted">
              Download, print, or share compiled feasibility and financial reports generated from your analysis.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/business-plan" className="btn btn--primary btn--sm">
            <Printer size={16} />
            Print Master DPR Dossier
          </Link>
        </div>
      </div>

      {/* Profile Context Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface), var(--color-bg))',
          marginBottom: 'var(--space-8)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <span className="text-xs text-muted block">Enterprise Target</span>
            <strong className="text-sm" style={{ textTransform: 'capitalize' }}>
              {user?.businessInterest || 'Dairy'} Unit
            </strong>
          </div>
          <div>
            <span className="text-xs text-muted block">Catchment Area</span>
            <strong className="text-sm">
              {user?.location.village || 'Changa'}, {user?.location.district || 'Anand'}
            </strong>
          </div>
          <div>
            <span className="text-xs text-muted block">Total Project Outlay</span>
            <strong className="text-sm font-data" style={{ color: 'var(--color-primary)' }}>
              {formatINR(projectCost?.totalProjectCost || 1000000)}
            </strong>
          </div>
          <div>
            <span className="text-xs text-muted block">Matched Credit Scheme</span>
            <strong className="text-sm" style={{ color: 'var(--color-green)' }}>
              {selectedScheme?.scheme?.name || 'Term Loan Scheme'}
            </strong>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-2" style={{ gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {reports.map((report) => (
          <div
            key={report.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--color-border)',
              transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
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
                    background: 'rgba(22, 131, 74, 0.12)',
                    color: 'var(--color-green)',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  {report.category}
                </span>

                <div className="flex items-center gap-1 text-xs text-muted">
                  <CheckCircle2 size={13} color="var(--color-green)" />
                  <span>Ready for Export</span>
                </div>
              </div>

              <h3
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-text)',
                }}
              >
                {report.title}
              </h3>

              <p className="text-sm text-muted" style={{ lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                {report.description}
              </p>

              <div
                className="flex items-center gap-4 text-xs text-muted"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {report.updatedAt}
                </span>
                <span>•</span>
                <span>{report.pages} Pages Comprehensive</span>
              </div>
            </div>

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
              <Link to={report.route} className="btn btn--ghost btn--sm">
                <Eye size={14} />
                View & Edit Module
              </Link>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => handleDownload(report)}
                disabled={downloadingId === report.id}
              >
                <Download size={14} />
                {downloadingId === report.id ? 'Generating...' : 'Print / Download'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bank & Branch Submission Instructions */}
      <div
        className="card"
        style={{
          background: 'var(--color-cream)',
          border: '1px solid #e3d5b0',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0,
            }}
          >
            <Building size={20} />
          </div>

          <div>
            <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', marginBottom: 4 }}>
              How to Use These Reports for Credit Sanction
            </h4>
            <p className="text-sm text-muted" style={{ lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              Take printouts of the <strong>Detailed Project Report (DPR)</strong> along with your signed Document Checklist to your nearest Lead District Bank branch or District Industries Centre (DIC). These formats comply with standard RBI MSME lending appraisal guidelines.
            </p>
            <div className="flex gap-4">
              <Link to="/funding-support" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>
                Open Document Checklist →
              </Link>
              <Link to="/ai-mitra" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>
                Ask Mitra for Bank Interview Tips →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
