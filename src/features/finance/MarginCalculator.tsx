import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUIStore } from '../../store/useUIStore';
import { formatINR, formatPercent } from '../../utils/financial';
import { DollarSign, ArrowRight } from 'lucide-react';

export default function MarginCalculator() {
  const { t } = useTranslation();
  const { marginCapital, projectCost, selectedScheme, recalculateAll } = useFinanceStore();
  const addToast = useUIStore((s) => s.addToast);
  const [capital, setCapital] = useState(marginCapital);
  const [prevMargin, setPrevMargin] = useState(marginCapital);

  if (marginCapital !== prevMargin) {
    setPrevMargin(marginCapital);
    setCapital(marginCapital);
  }

  const handleCalculate = () => {
    recalculateAll(capital);
    addToast({ type: 'success', message: 'Financial structure calculated successfully ✓' });
  };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <DollarSign size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.marginCalculator')}</h1>
      </div>

      <div className="grid grid-2">
        {/* Input */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)' }}>{t('finance.marginCapital')}</h3>
          <div className="form-group">
            <label className="form-label">{t('finance.marginCapital')} (₹)</label>
            <input type="number" className="form-input" value={capital} onChange={(e) => setCapital(parseInt(e.target.value) || 0)}
              style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)' }} />
            <span className="form-hint">Your own investment amount (Margin Money)</span>
          </div>
          <div className="form-group">
            <label className="form-label">{t('finance.marginPercent')}</label>
            <input type="text" className="form-input" value="10%" disabled />
            <span className="form-hint">Standard margin requirement</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
            {[50000, 100000, 200000, 500000, 1000000].map((amt) => (
              <button key={amt} className={`btn btn--sm ${capital === amt ? 'btn--green' : 'btn--outline-green'}`} onClick={() => setCapital(amt)}>
                {formatINR(amt)}
              </button>
            ))}
          </div>
          <button className="btn btn--green btn--full btn--lg" onClick={handleCalculate}>
            {t('finance.calculate')} <ArrowRight size={16} />
          </button>
        </div>

        {/* Result */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-cream), var(--color-green-lighter))' }}>
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Calculation Result</h3>
          {projectCost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <span className="text-xs text-muted">{t('finance.marginCapital')}</span>
                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)' }}>{formatINR(projectCost.marginCapital)}</p>
                <span className="text-xs text-muted">{formatPercent(projectCost.marginPercentage)} of project cost</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-4)' }}>
                <span className="text-xs text-muted">{t('finance.totalProjectCost')}</span>
                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)', color: 'var(--color-primary)' }}>{formatINR(projectCost.totalProjectCost)}</p>
                <span className="form-hint">Margin ÷ {formatPercent(projectCost.marginPercentage)}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-4)' }}>
                <span className="text-xs text-muted">{t('finance.totalLoanAmount')}</span>
                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)', color: 'var(--color-green)' }}>{formatINR(projectCost.loanAmount)}</p>
                <span className="form-hint">{formatPercent(projectCost.loanPercentage)} of project cost</span>
              </div>
              {selectedScheme && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
                  <span className="text-xs text-muted">{t('scheme.applicableScheme')}</span>
                  <p className="font-semibold">{selectedScheme.scheme.name}</p>
                  <div className="flex gap-4" style={{ marginTop: 'var(--space-2)' }}>
                    <span className="text-xs">Interest: {formatPercent(selectedScheme.scheme.interestRate)}</span>
                    <span className="text-xs">Tenure: {selectedScheme.scheme.tenureYears} {t('finance.years')}</span>
                    <span className="text-xs">Moratorium: {selectedScheme.scheme.moratoriumMonths} {t('finance.months')}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p className="text-sm text-muted">Enter your capital and click Calculate</p>
            </div>
          )}
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>How It Works</h3>
        <div className="text-sm" style={{ fontFamily: 'var(--font-data)', background: 'var(--color-surface-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
          Project Cost = Available Margin ÷ Margin Percentage<br />
          Loan Amount = Project Cost × (100% - Margin%)<br /><br />
          Example: {formatINR(100000)} ÷ 10% = {formatINR(1000000)} project cost<br />
          Loan = {formatINR(1000000)} × 90% = {formatINR(900000)}
        </div>
        <p className="text-xs text-muted">{t('common.demoDisclaimer')}</p>
      </div>
    </div>
  );
}
