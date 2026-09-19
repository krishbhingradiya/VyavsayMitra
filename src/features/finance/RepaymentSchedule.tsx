import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/financial';
import { ClipboardList } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RepaymentSchedule() {
  const { t } = useTranslation();
  const { repaymentSchedule } = useFinanceStore();
  const [view, setView] = useState<'monthly' | 'quarterly'>('monthly');

  if (!repaymentSchedule) {
    return (<div className="page-enter empty-state"><ClipboardList size={48} className="empty-state__icon" /><h3 className="empty-state__title">No repayment schedule yet.</h3><p className="empty-state__description">Complete the Margin Calculator to generate a repayment schedule.</p></div>);
  }

  const entries = view === 'monthly'
    ? repaymentSchedule.entries
    : repaymentSchedule.entries.filter((_, i) => i % 3 === 0 || i < repaymentSchedule.moratoriumMonths);

  const chartData = repaymentSchedule.entries
    .filter((_, i) => i % 3 === 0)
    .map((e) => ({ month: e.period, balance: e.closingBalance }));

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <ClipboardList size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.repaymentSchedule')}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="metric-card"><div className="metric-card__label">Total Principal</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(repaymentSchedule.totalPrincipal)}</div></div>
        <div className="metric-card"><div className="metric-card__label">{t('finance.totalInterest')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(repaymentSchedule.totalInterest)}</div></div>
        <div className="metric-card"><div className="metric-card__label">{t('finance.totalRepayment')}</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-primary)' }}>{formatINR(repaymentSchedule.totalRepayment)}</div></div>
        <div className="metric-card"><div className="metric-card__label">Moratorium Interest</div><div className="metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatINR(repaymentSchedule.moratoriumInterest)}</div></div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Outstanding Loan vs Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
            <XAxis dataKey="month" label={{ value: 'Month', position: 'bottom' }} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: any) => formatINR(Number(v) || 0)} />
            <Line type="monotone" dataKey="balance" stroke="#0B2545" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* View Toggle */}
      <div className="flex gap-3" style={{ marginBottom: 'var(--space-4)' }}>
        <button className={`btn btn--sm ${view === 'monthly' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setView('monthly')}>{t('finance.monthlyView')}</button>
        <button className={`btn btn--sm ${view === 'quarterly' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setView('quarterly')}>{t('finance.quarterlyView')}</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr>
              <th>{t('finance.period')}</th><th>{t('finance.openingPrincipal')}</th><th>{t('finance.interest')}</th>
              <th>{t('finance.principalPaid')}</th><th>{t('finance.payment')}</th><th>{t('finance.closingBalance')}</th>
            </tr></thead>
            <tbody>
              {entries.slice(0, 60).map((e) => (
                <tr key={e.period}>
                  <td className="font-semibold">{e.month}</td>
                  <td>{formatINR(e.openingPrincipal)}</td>
                  <td>{formatINR(e.interest)}</td>
                  <td>{formatINR(e.principalPaid)}</td>
                  <td className="font-semibold">{formatINR(e.payment)}</td>
                  <td>{formatINR(e.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 60 && <p className="text-xs text-muted text-center" style={{ marginTop: 'var(--space-3)' }}>Showing first 60 entries. Full schedule available in report.</p>}
      </div>
    </div>
  );
}
