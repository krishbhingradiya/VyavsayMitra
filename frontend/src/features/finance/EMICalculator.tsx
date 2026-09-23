import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR, formatPercent } from '../../utils/financial';
import { CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function EMICalculator() {
  const { t } = useTranslation();
  const { emiResult, selectedScheme } = useFinanceStore();

  if (!emiResult || !selectedScheme) {
    return (<div className="page-enter empty-state"><CreditCard size={48} className="empty-state__icon" /><h3 className="empty-state__title">EMI not calculated yet.</h3><p className="empty-state__description">Complete the Margin Calculator first to see your EMI.</p></div>);
  }

  const pieData = [
    { name: 'Principal', value: emiResult.principal },
    { name: 'Total Interest', value: emiResult.totalInterest },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <CreditCard size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.emiCalculator')}</h1>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* EMI Result */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-cream), var(--color-green-lighter))' }}>
          <h3 style={{ marginBottom: 'var(--space-6)' }}>{t('finance.monthlyEMI')}</h3>
          <p style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-extrabold)', fontFamily: 'var(--font-data)', color: 'var(--color-green)', lineHeight: 1, marginBottom: 'var(--space-6)' }}>
            {formatINR(emiResult.monthlyEMI)}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div><span className="text-xs text-muted">{t('finance.principal')}</span><p className="font-semibold font-data">{formatINR(emiResult.principal)}</p></div>
            <div><span className="text-xs text-muted">{t('finance.annualInterest')}</span><p className="font-semibold font-data">{formatPercent(emiResult.annualInterestRate)}</p></div>
            <div><span className="text-xs text-muted">{t('finance.tenure')}</span><p className="font-semibold font-data">{emiResult.tenureMonths} {t('finance.months')}</p></div>
            <div><span className="text-xs text-muted">{t('finance.totalInterest')}</span><p className="font-semibold font-data">{formatINR(emiResult.totalInterest)}</p></div>
          </div>
          <div style={{ borderTop: '1px border var(--color-border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
            <span className="text-xs text-muted">{t('finance.totalRepayment')}</span>
            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)', color: 'var(--color-primary)' }}>{formatINR(emiResult.totalRepayment)}</p>
          </div>
        </div>

        {/* Principal vs Interest Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Principal vs Interest</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                label={(entry: any) => `${entry.name}: ${formatINR(Number(entry.value))}`}>
                <Cell fill="#0B2545" /><Cell fill="#F28C28" />
              </Pie>
              <Tooltip formatter={(v: any) => formatINR(Number(v) || 0)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formula */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-3)' }}>EMI Formula</h3>
        <div style={{ fontFamily: 'var(--font-data)', background: 'var(--color-surface-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
          <p style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>{t('finance.emiFormula')}</p>
          <p>Where:</p>
          <p>P = {formatINR(emiResult.principal)} (Loan Amount / Principal)</p>
          <p>r = {(emiResult.annualInterestRate / 12 / 100).toFixed(6)} (Monthly Interest Rate = {formatPercent(emiResult.annualInterestRate)} ÷ 12)</p>
          <p>n = {emiResult.tenureMonths} (Number of Monthly Payments)</p>
        </div>
      </div>
    </div>
  );
}
