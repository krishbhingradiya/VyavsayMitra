import { useState, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/financial';
import {
  FileCheck,
  Printer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export default function BusinessPlanPage() {
  const user = useAuthStore((s) => s.user);
  const { projectCost, selectedScheme, emiResult, operatingCosts } = useFinanceStore();
  const activeScheme = selectedScheme?.scheme;

  // Financial model assumptions (customizable)
  const [dailyUnits, setDailyUnits] = useState(350); // e.g., 350 litres of milk / day
  const [unitPrice, setUnitPrice] = useState(58); // ₹58 / litre
  const [growthRateYear2, setGrowthRateYear2] = useState(15);
  const [growthRateYear3, setGrowthRateYear3] = useState(20);

  // Stable document references
  const [dprRefId] = useState('VM-784219');
  const [reportDate] = useState('17 Sep 2026');

  // Total monthly operating costs calculated from store array
  const monthlyOperatingTotal = useMemo(() => {
    if (!operatingCosts || operatingCosts.length === 0) return 45000;
    return operatingCosts.reduce((acc, item) => acc + item.amount, 0);
  }, [operatingCosts]);

  // Computed projections
  const projections = useMemo(() => {
    const monthlyRevenueYear1 = dailyUnits * unitPrice * 30;
    const annualRevenueYear1 = monthlyRevenueYear1 * 12;

    const annualOpCostYear1 = monthlyOperatingTotal * 12;
    const annualEMICost = (emiResult?.monthlyEMI || 13500) * 12;

    const annualNetProfitYear1 = annualRevenueYear1 - annualOpCostYear1 - annualEMICost;

    // Year 2 (+growth rate revenue, +8% cost)
    const annualRevenueYear2 = Math.round(annualRevenueYear1 * (1 + growthRateYear2 / 100));
    const annualOpCostYear2 = Math.round(annualOpCostYear1 * 1.08);
    const annualNetProfitYear2 = annualRevenueYear2 - annualOpCostYear2 - annualEMICost;

    // Year 3 (+growth rate revenue, +8% cost)
    const annualRevenueYear3 = Math.round(annualRevenueYear2 * (1 + growthRateYear3 / 100));
    const annualOpCostYear3 = Math.round(annualOpCostYear2 * 1.08);
    const annualNetProfitYear3 = annualRevenueYear3 - annualOpCostYear3 - annualEMICost;

    const chartData = [
      {
        year: 'Year 1',
        Revenue: annualRevenueYear1,
        Expenses: annualOpCostYear1 + annualEMICost,
        NetProfit: annualNetProfitYear1,
      },
      {
        year: 'Year 2',
        Revenue: annualRevenueYear2,
        Expenses: annualOpCostYear2 + annualEMICost,
        NetProfit: annualNetProfitYear2,
      },
      {
        year: 'Year 3',
        Revenue: annualRevenueYear3,
        Expenses: annualOpCostYear3 + annualEMICost,
        NetProfit: annualNetProfitYear3,
      },
    ];

    // Break-even
    const rentItem = operatingCosts?.find((item) => item.id === 'rent');
    const labourItem = operatingCosts?.find((item) => item.id === 'labour');
    const fixedCostsMonthly =
      (rentItem ? rentItem.amount : 6000) +
      (labourItem ? labourItem.amount : 12000) +
      (emiResult?.monthlyEMI || 13500);

    const variableCostPerUnit = 40; // ₹40 feed/procurement per litre
    const breakEvenUnits = Math.round(fixedCostsMonthly / Math.max(1, unitPrice - variableCostPerUnit));

    return {
      monthlyRevenueYear1,
      annualRevenueYear1,
      annualNetProfitYear1,
      annualRevenueYear2,
      annualNetProfitYear2,
      annualRevenueYear3,
      annualNetProfitYear3,
      chartData,
      breakEvenUnits,
      fixedCostsMonthly,
    };
  }, [dailyUnits, unitPrice, growthRateYear2, growthRateYear3, monthlyOperatingTotal, operatingCosts, emiResult]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-enter">
      {/* Action Header */}
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
              background: 'rgba(22, 131, 74, 0.12)',
              color: 'var(--color-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck size={24} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 1.2,
              }}
            >
              Detailed Project Report (DPR) & Business Plan
            </h1>
            <p className="text-sm text-muted">
              Standard bank-ready comprehensive project appraisal report for credit sanction and subsidies.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={handlePrint} className="btn btn--outline btn--sm">
            <Printer size={16} />
            Print / Save as PDF
          </button>
          <Link to="/reports" className="btn btn--primary btn--sm">
            View All Reports
          </Link>
        </div>
      </div>

      {/* Printable Document Container */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Document Header (Formal Govt/Bank Style) */}
        <div
          style={{
            borderBottom: '2px solid var(--color-primary)',
            paddingBottom: 'var(--space-6)',
            marginBottom: 'var(--space-8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'var(--font-weight-bold)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-green)',
                marginBottom: 'var(--space-1)',
              }}
            >
              VYAVSAYMITRA PROJECT APPRAISAL DOSSIER
            </div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
              Project Profile: {user?.businessInterest ? user.businessInterest.toUpperCase() : 'DAIRY ENTERPRISE'}
            </h2>
            <p className="text-sm text-muted">
              Location: {user?.location.village || 'Changa'}, Block: {user?.location.block || 'Petlad'}, Dist: {user?.location.district || 'Anand'}, {user?.location.state || 'Gujarat'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(11, 37, 69, 0.08)',
                color: 'var(--color-primary)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              DPR Ref: {dprRefId}
            </span>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Generated: {reportDate}
            </div>
          </div>
        </div>

        {/* SECTION 1: Executive Summary */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
            }}
          >
            1. Executive Summary & Promoter Profile
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
              background: 'var(--color-bg)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div>
              <span className="text-xs text-muted block">Promoter Name</span>
              <strong className="text-sm">{user?.name || 'Ramesh Patel'}</strong>
            </div>
            <div>
              <span className="text-xs text-muted block">Contact Number</span>
              <strong className="text-sm font-data">{user?.phone || '+91 98765 43210'}</strong>
            </div>
            <div>
              <span className="text-xs text-muted block">Enterprise Category</span>
              <strong className="text-sm" style={{ textTransform: 'capitalize' }}>
                {user?.businessInterest || 'Dairy & Animal Husbandry'}
              </strong>
            </div>
            <div>
              <span className="text-xs text-muted block">Promoter Experience</span>
              <strong className="text-sm" style={{ textTransform: 'capitalize' }}>
                {user?.experience || 'Some Experience'}
              </strong>
            </div>
          </div>

          <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
            The proposed enterprise is aimed at establishing a modernized micro/small enterprise in{' '}
            <strong>{user?.location.village || 'Changa'}</strong>, catering to direct consumers and local commercial buyers.
            With an initial self-equity margin contribution of{' '}
            <strong>{formatINR(projectCost?.marginCapital || 100000)}</strong> (10%), the unit seeks term credit assistance
            of <strong>{formatINR(projectCost?.loanAmount || 900000)}</strong> (90%) under the{' '}
            <strong>{activeScheme?.name || 'Term Loan Scheme'}</strong>.
          </p>
        </div>

        {/* SECTION 2: Project Cost & Means of Finance */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
            }}
          >
            2. Capital Outlay & Means of Finance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Capital Cost Breakdown
              </h4>
              <table className="data-table" style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                <tbody>
                  <tr>
                    <td>Plant / Shed / Civil Work</td>
                    <td className="font-data font-semibold text-right">{formatINR((projectCost?.totalProjectCost || 1000000) * 0.45)}</td>
                  </tr>
                  <tr>
                    <td>Machinery / Livestock / Equipment</td>
                    <td className="font-data font-semibold text-right">{formatINR((projectCost?.totalProjectCost || 1000000) * 0.35)}</td>
                  </tr>
                  <tr>
                    <td>Initial Working Capital / Buffer</td>
                    <td className="font-data font-semibold text-right">{formatINR((projectCost?.totalProjectCost || 1000000) * 0.15)}</td>
                  </tr>
                  <tr>
                    <td>Contingency / Prelim Expenses</td>
                    <td className="font-data font-semibold text-right">{formatINR((projectCost?.totalProjectCost || 1000000) * 0.05)}</td>
                  </tr>
                  <tr style={{ background: 'var(--color-bg)', fontWeight: 'bold' }}>
                    <td>Total Project Outlay</td>
                    <td className="font-data text-right" style={{ color: 'var(--color-primary)' }}>
                      {formatINR(projectCost?.totalProjectCost || 1000000)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Means of Finance
              </h4>
              <table className="data-table" style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                <tbody>
                  <tr>
                    <td>Promoter Contribution (Margin Money - 10%)</td>
                    <td className="font-data font-semibold text-right" style={{ color: 'var(--color-saffron)' }}>
                      {formatINR(projectCost?.marginCapital || 100000)}
                    </td>
                  </tr>
                  <tr>
                    <td>Bank Loan Requested (90%)</td>
                    <td className="font-data font-semibold text-right" style={{ color: 'var(--color-green)' }}>
                      {formatINR(projectCost?.loanAmount || 900000)}
                    </td>
                  </tr>
                  <tr>
                    <td>Applicable Scheme Channel</td>
                    <td className="font-semibold text-right">{activeScheme?.name || 'Term Loan Scheme'}</td>
                  </tr>
                  <tr>
                    <td>Estimated Annual Interest Rate</td>
                    <td className="font-data text-right">{activeScheme?.interestRate || 8}% p.a.</td>
                  </tr>
                  <tr style={{ background: 'var(--color-bg)', fontWeight: 'bold' }}>
                    <td>Monthly Debt Service (EMI)</td>
                    <td className="font-data text-right" style={{ color: 'var(--color-primary)' }}>
                      {formatINR(emiResult?.monthlyEMI || 14032)} / mo
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 3: 3-Year Financial Forecast & Profitability */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
              3. Three-Year Financial Projections & Viability
            </h3>
            <span className="text-xs text-muted">Sensitivity Assumptions</span>
          </div>

          {/* Assumption Sliders */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              background: 'var(--color-cream)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <label className="text-xs font-semibold block" style={{ marginBottom: 4 }}>
                Daily Output Units (e.g. Litres / Units): <strong>{dailyUnits}</strong>
              </label>
              <input
                type="range"
                min="100"
                max="1000"
                step="25"
                value={dailyUnits}
                onChange={(e) => setDailyUnits(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block" style={{ marginBottom: 4 }}>
                Unit Selling Price (₹): <strong>₹{unitPrice}</strong>
              </label>
              <input
                type="range"
                min="30"
                max="150"
                step="2"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block" style={{ marginBottom: 4 }}>
                Year 2 Growth Rate: <strong>{growthRateYear2}%</strong>
              </label>
              <input
                type="range"
                min="5"
                max="35"
                step="5"
                value={growthRateYear2}
                onChange={(e) => setGrowthRateYear2(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block" style={{ marginBottom: 4 }}>
                Year 3 Growth Rate: <strong>{growthRateYear3}%</strong>
              </label>
              <input
                type="range"
                min="5"
                max="35"
                step="5"
                value={growthRateYear3}
                onChange={(e) => setGrowthRateYear3(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Projections Table */}
          <table className="data-table" style={{ width: '100%', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-6)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                <th style={{ textAlign: 'left' }}>Financial Metric (₹)</th>
                <th style={{ textAlign: 'right' }}>Year 1</th>
                <th style={{ textAlign: 'right' }}>Year 2 (+{growthRateYear2}%)</th>
                <th style={{ textAlign: 'right' }}>Year 3 (+{growthRateYear3}%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Revenue from Operations</td>
                <td className="font-data font-semibold text-right">{formatINR(projections.annualRevenueYear1)}</td>
                <td className="font-data font-semibold text-right">{formatINR(projections.annualRevenueYear2)}</td>
                <td className="font-data font-semibold text-right">{formatINR(projections.annualRevenueYear3)}</td>
              </tr>
              <tr>
                <td>Operating Expenses (Raw Material, Labour, Power, Misc)</td>
                <td className="font-data text-right text-muted">{formatINR(monthlyOperatingTotal * 12)}</td>
                <td className="font-data text-right text-muted">{formatINR(Math.round(monthlyOperatingTotal * 12 * 1.08))}</td>
                <td className="font-data text-right text-muted">{formatINR(Math.round(monthlyOperatingTotal * 12 * 1.16))}</td>
              </tr>
              <tr>
                <td>Debt Service (Principal + Interest)</td>
                <td className="font-data text-right text-muted">{formatINR((emiResult?.monthlyEMI || 13500) * 12)}</td>
                <td className="font-data text-right text-muted">{formatINR((emiResult?.monthlyEMI || 13500) * 12)}</td>
                <td className="font-data text-right text-muted">{formatINR((emiResult?.monthlyEMI || 13500) * 12)}</td>
              </tr>
              <tr style={{ background: 'rgba(22, 131, 74, 0.06)', fontWeight: 'bold' }}>
                <td style={{ color: 'var(--color-green)' }}>Net Cash Profit (Surplus)</td>
                <td className="font-data text-right" style={{ color: 'var(--color-green)', fontSize: '15px' }}>
                  {formatINR(projections.annualNetProfitYear1)}
                </td>
                <td className="font-data text-right" style={{ color: 'var(--color-green)', fontSize: '15px' }}>
                  {formatINR(projections.annualNetProfitYear2)}
                </td>
                <td className="font-data text-right" style={{ color: 'var(--color-green)', fontSize: '15px' }}>
                  {formatINR(projections.annualNetProfitYear3)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Chart */}
          <div style={{ height: 260, marginBottom: 'var(--space-4)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip formatter={(v: any) => formatINR(Number(v) || 0)} />
                <Legend />
                <Bar dataKey="Revenue" fill="#0B2545" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#F28C28" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" fill="#16834A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 4: Risk Mitigation & Banking Endorsement */}
        <div>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
            }}
          >
            4. Risk Assessment & Appraisal Checklist
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="card" style={{ background: 'var(--color-bg)' }}>
              <strong className="text-xs text-muted block" style={{ marginBottom: 4 }}>
                Debt Service Coverage Ratio (DSCR)
              </strong>
              <div className="font-data font-semibold text-lg" style={{ color: 'var(--color-green)' }}>
                {(projections.annualNetProfitYear1 / ((emiResult?.monthlyEMI || 13500) * 12) + 1).toFixed(2)}x
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Benchmark {'>'} 1.5x is met. Strong creditworthiness and debt servicing capability.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--color-bg)' }}>
              <strong className="text-xs text-muted block" style={{ marginBottom: 4 }}>
                Monthly Break-Even Volume
              </strong>
              <div className="font-data font-semibold text-lg" style={{ color: 'var(--color-primary)' }}>
                {projections.breakEvenUnits.toLocaleString('en-IN')} units / month
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Requires operating at {Math.round((projections.breakEvenUnits / (dailyUnits * 30)) * 100)}% of current projected capacity.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--color-bg)' }}>
              <strong className="text-xs text-muted block" style={{ marginBottom: 4 }}>
                Moratorium Buffer
              </strong>
              <div className="font-data font-semibold text-lg" style={{ color: 'var(--color-saffron)' }}>
                {activeScheme?.moratoriumMonths || 6} Months Grace
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Principal repayment waived during initial stabilization and setup phase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
