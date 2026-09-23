import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calculator, DollarSign, CreditCard, Calendar, ClipboardList, Wallet, Banknote, ArrowRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/financial';

const modules = [
  { icon: <DollarSign size={22} />, titleKey: 'finance.marginCalculator', path: '/financial-calculator/margin', color: 'green' },
  { icon: <CreditCard size={22} />, titleKey: 'finance.emiCalculator', path: '/financial-calculator/emi', color: 'primary' },
  { icon: <Calendar size={22} />, titleKey: 'finance.moratorium', path: '/financial-calculator/moratorium', color: 'saffron' },
  { icon: <ClipboardList size={22} />, titleKey: 'finance.repaymentSchedule', path: '/financial-calculator/repayment', color: 'green' },
  { icon: <Wallet size={22} />, titleKey: 'finance.operationalCosts', path: '/financial-calculator/operational-costs', color: 'primary' },
  { icon: <Banknote size={22} />, titleKey: 'finance.workingCapital', path: '/financial-calculator/working-capital', color: 'saffron' },
];

export default function FinancialCalculator() {
  const { t } = useTranslation();
  const { projectCost, selectedScheme, emiResult } = useFinanceStore();

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
        <Calculator size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.calculator')}</h1>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-8)' }}>Calculate project costs, loans, EMI, and plan your business finances.</p>

      {/* Summary Strip */}
      {projectCost && (
        <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="metric-card"><div className="metric-card__label">{t('finance.totalProjectCost')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-primary)' }}>{formatINR(projectCost.totalProjectCost)}</div></div>
          <div className="metric-card"><div className="metric-card__label">{t('finance.totalLoanAmount')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(projectCost.loanAmount)}</div></div>
          <div className="metric-card"><div className="metric-card__label">{t('scheme.applicableScheme')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-sm)' }}>{selectedScheme?.scheme.name || '—'}</div></div>
          <div className="metric-card"><div className="metric-card__label">{t('finance.monthlyEMI')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-green)' }}>{emiResult ? formatINR(emiResult.monthlyEMI) : '—'}</div></div>
        </div>
      )}

      <div className="grid grid-3" style={{ gap: 'var(--space-5)' }}>
        {modules.map((mod) => (
          <Link key={mod.path} to={mod.path} className="card" style={{ textDecoration: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: mod.color === 'green' ? 'var(--color-green-lighter)' : mod.color === 'saffron' ? 'var(--color-warning-light)' : 'rgba(11,37,69,0.06)',
              color: mod.color === 'green' ? 'var(--color-green)' : mod.color === 'saffron' ? 'var(--color-saffron)' : 'var(--color-primary)',
              marginBottom: 'var(--space-4)' }}>{mod.icon}</div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>{t(mod.titleKey)}</h3>
            <span className="feature-card__cta"><ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
