import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/financial';
import { Calendar, Info } from 'lucide-react';

export default function MoratoriumSection() {
  const { t } = useTranslation();
  const { selectedScheme, repaymentSchedule } = useFinanceStore();

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <Calendar size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.moratorium')}</h1>
      </div>

      {/* Explanation */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-info)', background: 'var(--color-info-light)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-3)' }}>
          <Info size={18} style={{ color: 'var(--color-info)' }} />
          <h3 style={{ fontSize: 'var(--font-size-base)' }}>What is Moratorium?</h3>
        </div>
        <p className="text-sm">{t('finance.moratoriumExplain')}</p>
      </div>

      {selectedScheme ? (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Moratorium Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="flex justify-between"><span className="text-sm text-muted">Moratorium Period</span><span className="font-semibold">{selectedScheme.scheme.moratoriumMonths} {t('finance.months')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Applicable Scheme</span><span className="font-semibold">{selectedScheme.scheme.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Interest Rate</span><span className="font-semibold">{selectedScheme.scheme.interestRate}%</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Interest During Moratorium</span><span className="font-semibold">{repaymentSchedule ? formatINR(repaymentSchedule.moratoriumInterest) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Treatment</span><span className="font-semibold">Capitalized (added to principal)</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">EMI Starts After</span><span className="font-semibold">Month {selectedScheme.scheme.moratoriumMonths + 1}</span></div>
            </div>
          </div>
          <div className="card" style={{ background: 'var(--color-warning-light)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Important Notes</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <li>• During the moratorium period, no regular EMI payments are required.</li>
              <li>• Interest continues to accrue during this period.</li>
              <li>• The accrued interest is capitalized (added to the loan principal).</li>
              <li>• Your effective loan amount after moratorium will be slightly higher than the original.</li>
              <li>• This is a prototype assumption. Actual terms depend on the lender.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="empty-state"><Calendar size={48} className="empty-state__icon" /><h3 className="empty-state__title">No scheme selected yet.</h3><p className="empty-state__description">Complete the Margin Calculator to see moratorium details.</p></div>
      )}
    </div>
  );
}
