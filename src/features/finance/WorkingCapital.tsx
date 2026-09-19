import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR, calculateWorkingCapital as calcWC } from '../../utils/financial';
import { Banknote, Info } from 'lucide-react';

export default function WorkingCapital() {
  const { t } = useTranslation();
  const { workingCapitalInputs, setWorkingCapitalInputs } = useFinanceStore();
  const total = calcWC(workingCapitalInputs);

  const handleChange = (field: string, value: number) => {
    setWorkingCapitalInputs({ ...workingCapitalInputs, [field]: value });
  };

  const fields = [
    { key: 'inventory', label: t('finance.inventory') },
    { key: 'rawMaterial', label: t('finance.rawMaterial') },
    { key: 'labour', label: t('finance.labour') },
    { key: 'transport', label: t('finance.transport') },
    { key: 'utilities', label: t('finance.utilities') },
    { key: 'emergencyReserve', label: t('finance.emergencyReserve') },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-8)' }}>
        <Banknote size={24} /><h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{t('finance.workingCapital')}</h1>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-info)', background: 'var(--color-info-light)' }}>
        <div className="flex items-center gap-2"><Info size={16} style={{ color: 'var(--color-info)' }} /><p className="text-sm">{t('finance.workingCapitalExplain')}</p></div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: 'var(--space-5)' }}>Monthly Working Capital Requirement</h3>
        {fields.map((f) => (
          <div key={f.key} className="form-group">
            <label className="form-label">{f.label} (₹)</label>
            <input type="number" className="form-input" value={(workingCapitalInputs as any)[f.key]}
              onChange={(e) => handleChange(f.key, parseInt(e.target.value) || 0)} />
          </div>
        ))}
        <div style={{ borderTop: '2px solid var(--color-green)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <div className="flex justify-between">
            <span className="font-semibold">Estimated Monthly Working Capital</span>
            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-data)', color: 'var(--color-green)' }}>{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
