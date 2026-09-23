import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR, calculateOperatingCost } from '../../utils/financial';
import { Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#16834A', '#0B2545', '#F28C28', '#2E90FA', '#667085', '#F04438', '#12B76A', '#98A2B3'];

export default function OperationalCosts() {
  const { t } = useTranslation();
  const { operatingCosts, setOperatingCosts } = useFinanceStore();
  const totals = calculateOperatingCost(operatingCosts);

  const handleAmountChange = (id: string, amount: number) => {
    setOperatingCosts(operatingCosts.map((c) => c.id === id ? { ...c, amount } : c));
  };

  const pieData = operatingCosts.filter((c) => c.amount > 0).map((c) => ({ name: c.label, value: c.amount }));

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <Wallet size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.operationalCosts')}</h1>
      </div>

      <div className="grid grid-2">
        {/* Input */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Monthly Operating Expenses</h3>
          {operatingCosts.map((cost) => (
            <div key={cost.id} className="form-group">
              <label className="form-label">{cost.label}</label>
              <input type="number" className="form-input" value={cost.amount}
                onChange={(e) => handleAmountChange(cost.id, parseInt(e.target.value) || 0)} />
            </div>
          ))}
          <div style={{ borderTop: '2px solid var(--color-primary)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div className="flex justify-between"><span className="font-semibold">{t('finance.totalMonthlyOpCost')}</span>
              <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)', color: 'var(--color-primary)' }}>{formatINR(totals.totalMonthly)}</span></div>
            <div className="flex justify-between" style={{ marginTop: 'var(--space-2)' }}><span className="text-sm text-muted">Annual</span>
              <span className="font-semibold font-data">{formatINR(totals.totalAnnual)}</span></div>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={(entry: any) => `${entry.name}: ${formatINR(Number(entry.value))}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatINR(Number(v) || 0)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
