/**
 * VYAVSAYMITRA — FoodTech Mass Balance Conservation Flow Diagram
 * 
 * Visualizes the strict physical transformation:
 * Raw Intake ──> Primary Output + Byproducts + Processing Loss
 */

import React from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, Scale, Layers } from 'lucide-react';
import type { ProductionBreakdown } from '../../types/foodtech';

interface Props {
  rawMaterialQuantity: number;
  rawMaterialUnit: string;
  production: ProductionBreakdown;
  businessName?: string;
}

export const FoodTechMassBalanceFlow: React.FC<Props> = ({
  rawMaterialQuantity,
  rawMaterialUnit,
  production,
  businessName,
}) => {
  const primaryVal = production?.primaryOutput?.value || 0;
  const primaryUnit = production?.primaryOutput?.unit || rawMaterialUnit;
  const primaryLabel = production?.primaryOutput?.label || 'Primary Output';

  const byproducts = production?.byproducts || [];
  const totalByproductVal = byproducts.reduce((acc, bp) => acc + (bp.value || 0), 0);

  const lossVal = production?.processingLoss?.value || 0;
  const lossUnit = production?.processingLoss?.unit || rawMaterialUnit;

  const totalAccounted = primaryVal + totalByproductVal + lossVal;
  const isConservationValid = rawMaterialQuantity > 0 && Math.abs(totalAccounted - rawMaterialQuantity) <= (rawMaterialQuantity * 0.005);

  const primaryPct = rawMaterialQuantity > 0 ? ((primaryVal / rawMaterialQuantity) * 100).toFixed(1) : '0';
  const byproductPct = rawMaterialQuantity > 0 ? ((totalByproductVal / rawMaterialQuantity) * 100).toFixed(1) : '0';
  const lossPct = rawMaterialQuantity > 0 ? ((lossVal / rawMaterialQuantity) * 100).toFixed(1) : '0';

  return (
    <div className="mass-balance-container">
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center gap-2">
          <Scale size={20} color="var(--color-primary)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>
            Physical Mass Balance & Output Conservation
          </h3>
        </div>

        <div>
          {isConservationValid ? (
            <span className="badge badge--green flex items-center gap-1">
              <CheckCircle2 size={13} />
              Mass Conservation Verified (MoFPI/CFTRI Standards)
            </span>
          ) : (
            <span className="badge badge--saffron flex items-center gap-1">
              <AlertTriangle size={13} />
              Balance: {totalAccounted.toLocaleString()} / {rawMaterialQuantity.toLocaleString()} {rawMaterialUnit}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Under the first law of thermodynamics and national food technology norms, total primary product, byproducts, and handling losses must deterministically equal raw intake.
      </p>

      {/* Visual Node Flow */}
      <div className="mass-balance-flow">
        {/* Node 1: Raw Intake */}
        <div className="mass-balance-node mass-balance-node--input">
          <div className="text-xs text-muted uppercase font-semibold">Raw Intake</div>
          <div className="mass-balance-node__val">
            {rawMaterialQuantity.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>{rawMaterialUnit}</span>
          </div>
          <div className="mass-balance-node__pct">100.0% Processing Feed</div>
          <div className="text-xs" style={{ marginTop: '4px', color: 'var(--color-primary)' }}>
            {businessName ? `Raw material for ${businessName}` : 'Base Commodity'}
          </div>
        </div>

        <div className="mass-balance-arrow">
          <ArrowRight size={22} />
        </div>

        {/* Node 2: Primary Output */}
        <div className="mass-balance-node mass-balance-node--primary">
          <div className="text-xs text-muted uppercase font-semibold">Primary Output</div>
          <div className="mass-balance-node__val" style={{ color: 'var(--color-green)' }}>
            {primaryVal.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>{primaryUnit}</span>
          </div>
          <div className="mass-balance-node__pct" style={{ color: 'var(--color-green-dark)', fontWeight: 'bold' }}>
            {primaryPct}% Recovery Yield
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
            {primaryLabel}
          </div>
        </div>

        <div className="mass-balance-arrow">
          <ArrowRight size={22} />
        </div>

        {/* Node 3: Byproducts */}
        <div className="mass-balance-node mass-balance-node--byproduct">
          <div className="text-xs text-muted uppercase font-semibold">Commercial Byproducts</div>
          <div className="mass-balance-node__val" style={{ color: 'var(--color-saffron-dark)' }}>
            {totalByproductVal.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>{rawMaterialUnit}</span>
          </div>
          <div className="mass-balance-node__pct" style={{ color: 'var(--color-saffron-dark)' }}>
            {byproductPct}% Byproduct Share
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
            {byproducts.length > 0 ? byproducts.map(bp => bp.name).join(', ') : 'None'}
          </div>
        </div>

        <div className="mass-balance-arrow">
          <ArrowRight size={22} />
        </div>

        {/* Node 4: Processing Loss */}
        <div className="mass-balance-node mass-balance-node--loss">
          <div className="text-xs text-muted uppercase font-semibold">Handling / Moisture Loss</div>
          <div className="mass-balance-node__val" style={{ color: '#495057' }}>
            {lossVal.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>{lossUnit}</span>
          </div>
          <div className="mass-balance-node__pct">
            {lossPct}% Process Loss
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
            Aspiration / Dust / Loss
          </div>
        </div>
      </div>

      {/* Detailed Byproduct Breakdown if multiple streams */}
      {byproducts.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-light)' }}>
          <div className="text-xs font-semibold text-muted" style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={13} />
            BYPRODUCT STREAMS REALIZATION:
          </div>
          <div className="flex gap-4 flex-wrap">
            {byproducts.map((bp, idx) => (
              <div key={idx} className="badge badge--saffron" style={{ fontSize: '12px', padding: '4px 8px' }}>
                <strong>{bp.name}:</strong> {bp.value.toLocaleString('en-IN')} {bp.unit} ({rawMaterialQuantity > 0 ? ((bp.value / rawMaterialQuantity) * 100).toFixed(1) : '0'}%)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
