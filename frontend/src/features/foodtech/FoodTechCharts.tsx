/**
 * VYAVSAYMITRA — FoodTech Recharts Visualizations
 * 
 * Includes:
 * 1. Cost vs Revenue Composition Bar Chart
 * 2. Sensitivity Scenario Net Profit Comparison
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatINR } from '../../utils/financial';
import type { CostBreakdown, RevenueBreakdown, SensitivityAnalysis } from '../../types/foodtech';

interface CostRevenueProps {
  costs: CostBreakdown;
  revenue: RevenueBreakdown;
}

export const FoodTechCostRevenueChart: React.FC<CostRevenueProps> = ({ costs, revenue }) => {

  const breakdownData = [
    { name: 'Primary Revenue', value: revenue?.primary || 0, type: 'revenue', color: '#138808' },
    { name: 'Byproduct Revenue', value: revenue?.byproduct || 0, type: 'revenue', color: '#70B603' },
    { name: 'Raw Material Cost', value: costs?.items?.rawMaterial || (costs?.variable ? costs.variable * 0.8 : 0), type: 'cost', color: '#D97706' },
    { name: 'Other Variable Costs', value: costs?.items?.variableOther || (costs?.variable ? costs.variable * 0.2 : 0), type: 'cost', color: '#F59E0B' },
    { name: 'Fixed Operating Cost', value: costs?.fixed || 0, type: 'cost', color: '#DC2626' },
  ].filter(item => item.value > 0);

  return (
    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
        Revenue Realization vs Operating Cost Structure
      </h3>

      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} interval={0} angle={-15} textAnchor="end" />
            <YAxis tick={{ fontSize: 12, fill: '#4b5563' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(val: any) => [formatINR(Number(val) || 0), 'Amount']}
              contentStyle={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {breakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 text-xs text-muted" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-light)' }}>
        <div>
          <span className="font-semibold text-color-primary">Total Revenue: </span>
          <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>{formatINR(revenue?.total || 0)}</span>
        </div>
        <div>
          <span className="font-semibold text-color-primary">Total Cost: </span>
          <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>{formatINR(costs?.total || 0)}</span>
        </div>
        <div>
          <span className="font-semibold text-color-primary">Net Margin Spread: </span>
          <span style={{ fontWeight: 'bold', color: (revenue?.total - costs?.total) >= 0 ? 'var(--color-green)' : 'var(--color-error)' }}>
            {formatINR((revenue?.total || 0) - (costs?.total || 0))}
          </span>
        </div>
      </div>
    </div>
  );
};

interface SensitivityProps {
  sensitivity: SensitivityAnalysis;
  baseNetProfit: number;
}

export const FoodTechSensitivityChart: React.FC<SensitivityProps> = ({ sensitivity, baseNetProfit }) => {
  const data = [
    {
      scenario: 'Raw Material +10%',
      profit: sensitivity?.rawMaterialCostIncrease10Pct?.projectedNetProfit ?? baseNetProfit,
      delta: sensitivity?.rawMaterialCostIncrease10Pct?.delta ?? 0,
      color: '#DC2626',
    },
    {
      scenario: 'Selling Price -10%',
      profit: sensitivity?.sellingPriceDecrease10Pct?.projectedNetProfit ?? baseNetProfit,
      delta: sensitivity?.sellingPriceDecrease10Pct?.delta ?? 0,
      color: '#F59E0B',
    },
    {
      scenario: 'Baseline Run',
      profit: baseNetProfit,
      delta: 0,
      color: '#0B2545',
    },
    {
      scenario: 'Raw Material -10%',
      profit: sensitivity?.rawMaterialCostDecrease10Pct?.projectedNetProfit ?? baseNetProfit,
      delta: sensitivity?.rawMaterialCostDecrease10Pct?.delta ?? 0,
      color: '#138808',
    },
    {
      scenario: 'Selling Price +10%',
      profit: sensitivity?.sellingPriceIncrease10Pct?.projectedNetProfit ?? baseNetProfit,
      delta: sensitivity?.sellingPriceIncrease10Pct?.delta ?? 0,
      color: '#10B981',
    },
  ];

  return (
    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
        Sensitivity Stress Test (±10% Price & Cost Volatility)
      </h3>
      <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Projected enterprise net profit under commodity price swings calculated deterministically by the backend.
      </p>

      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: '#4b5563' }} interval={0} angle={-10} textAnchor="end" />
            <YAxis tick={{ fontSize: 12, fill: '#4b5563' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(val: any, _name: any, item: any) => [
                `${formatINR(Number(val) || 0)} (Delta: ${formatINR(item?.payload?.delta || 0)})`,
                'Projected Profit',
              ]}
              contentStyle={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`sens-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
