import { useState } from 'react';
import {
  Calculator,
  AlertTriangle,
  Sprout,
  Factory,
  Wrench,
  Package,
  Layers
} from 'lucide-react';
import './ResourcePlanner.css';

interface ResourcePlannerProps {
  domain: string;
  businessName: string;
  initialArea?: number;
  initialCapacity?: number;
}

export default function ResourcePlanner({
  domain,
  businessName,
  initialArea = 2,
  initialCapacity = 100
}: ResourcePlannerProps) {
  const isAgri = domain === 'agriculture';

  // Agri Input Planner State
  const [areaAcres, setAreaAcres] = useState<number>(initialArea || 2);
  const [seedRateKg, setSeedRateKg] = useState<number>(40); // 40 kg/acre for wheat
  const seedCostPerKg = 45;
  const [fertilizerBags, setFertilizerBags] = useState<number>(3); // 3 bags/acre
  const bagCost = 1350; // average DAP/Urea
  const [laborDays, setLaborDays] = useState<number>(12); // person-days per acre
  const laborDailyWage = 350;
  const irrigationHours = 25; // pumping hours
  const irrigationHourlyCost = 90;

  // FoodTech Machinery Planner State
  const [millCost, setMillCost] = useState<number>(115000);
  const [motorCost, setMotorCost] = useState<number>(35000);
  const [sieveCost, setSieveCost] = useState<number>(28000);
  const [packUnitCost, setPackUnitCost] = useState<number>(45000);
  const [installationCost, setInstallationCost] = useState<number>(22000);

  // Agri Calculations
  const totalSeedCost = Math.round(areaAcres * seedRateKg * seedCostPerKg);
  const totalFertilizerCost = Math.round(areaAcres * fertilizerBags * bagCost);
  const totalLaborCost = Math.round(areaAcres * laborDays * laborDailyWage);
  const totalIrrigationCost = Math.round(areaAcres * irrigationHours * irrigationHourlyCost);
  const totalAgriEstimate = totalSeedCost + totalFertilizerCost + totalLaborCost + totalIrrigationCost;

  // FoodTech Calculations
  const totalMachineryEstimate = millCost + motorCost + sieveCost + packUnitCost + installationCost;

  return (
    <div className="resource-planner-card">
      <div className="resource-planner-header">
        <div className="flex items-center gap-2">
          {isAgri ? (
            <Sprout size={20} className="text-green-600" />
          ) : (
            <Factory size={20} className="text-amber-600" />
          )}
          <h3 className="resource-planner-title">
            {isAgri ? `Farm Input Budget Planner — ${businessName}` : `Processing Machinery Planner (${initialCapacity} kg/hr) — ${businessName}`}
          </h3>
        </div>
        <span className="resource-badge">Interactive Estimator</span>
      </div>

      <div className="disclaimer-banner">
        <AlertTriangle size={15} className="text-amber-700 flex-shrink-0" />
        <span>
          <strong>User Estimate:</strong> Values below are planning estimates for operational readiness.
          {isAgri
            ? ' Real crop expenses vary by local agro-climatic zone, water depth, and sowing window.'
            : ' Consult certified machinery vendors for exact commercial quotations and technical specifications.'}
        </span>
      </div>

      {isAgri ? (
        /* Agriculture Farm Input Planner */
        <div className="planner-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="input-field-group">
              <label className="field-label">Land Area (Acres)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                className="field-input"
                value={areaAcres}
                onChange={(e) => setAreaAcres(Math.max(0.1, Number(e.target.value)))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Seed Rate (kg/acre)</label>
              <input
                type="number"
                min="1"
                className="field-input"
                value={seedRateKg}
                onChange={(e) => setSeedRateKg(Number(e.target.value))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Fertilizer (Bags/acre)</label>
              <input
                type="number"
                min="1"
                className="field-input"
                value={fertilizerBags}
                onChange={(e) => setFertilizerBags(Number(e.target.value))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Labor (Days/acre)</label>
              <input
                type="number"
                min="1"
                className="field-input"
                value={laborDays}
                onChange={(e) => setLaborDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="breakdown-grid">
            <div className="breakdown-col">
              <span className="col-name flex items-center gap-1">
                <Package size={14} /> Certified Seeds ({areaAcres * seedRateKg} kg)
              </span>
              <span className="col-val">₹{totalSeedCost.toLocaleString('en-IN')}</span>
              <span className="col-sub">@ ₹{seedCostPerKg}/kg</span>
            </div>

            <div className="breakdown-col">
              <span className="col-name flex items-center gap-1">
                <Layers size={14} /> Nutrients & Fertilizer ({areaAcres * fertilizerBags} bags)
              </span>
              <span className="col-val">₹{totalFertilizerCost.toLocaleString('en-IN')}</span>
              <span className="col-sub">@ ₹{bagCost}/bag avg</span>
            </div>

            <div className="breakdown-col">
              <span className="col-name flex items-center gap-1">
                <Wrench size={14} /> Labor ({areaAcres * laborDays} person-days)
              </span>
              <span className="col-val">₹{totalLaborCost.toLocaleString('en-IN')}</span>
              <span className="col-sub">@ ₹{laborDailyWage}/day</span>
            </div>

            <div className="breakdown-col">
              <span className="col-name flex items-center gap-1">
                <Calculator size={14} /> Water & Irrigation ({areaAcres * irrigationHours} hrs)
              </span>
              <span className="col-val">₹{totalIrrigationCost.toLocaleString('en-IN')}</span>
              <span className="col-sub">@ ₹{irrigationHourlyCost}/hr</span>
            </div>
          </div>

          <div className="planner-total-bar">
            <span>Estimated Seasonal Working Capital Requirement:</span>
            <strong className="text-green-700 text-lg">₹{totalAgriEstimate.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      ) : (
        /* FoodTech Machinery Planner */
        <div className="planner-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="input-field-group">
              <label className="field-label">Primary Processing Unit (₹)</label>
              <input
                type="number"
                step="5000"
                className="field-input"
                value={millCost}
                onChange={(e) => setMillCost(Number(e.target.value))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Electric Motor & Drives (₹)</label>
              <input
                type="number"
                step="2000"
                className="field-input"
                value={motorCost}
                onChange={(e) => setMotorCost(Number(e.target.value))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Sieving / Grading Unit (₹)</label>
              <input
                type="number"
                step="2000"
                className="field-input"
                value={sieveCost}
                onChange={(e) => setSieveCost(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="input-field-group">
              <label className="field-label">Heat Sealer & Packaging (₹)</label>
              <input
                type="number"
                step="2000"
                className="field-input"
                value={packUnitCost}
                onChange={(e) => setPackUnitCost(Number(e.target.value))}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">Installation, Wiring & Piping (₹)</label>
              <input
                type="number"
                step="2000"
                className="field-input"
                value={installationCost}
                onChange={(e) => setInstallationCost(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="planner-total-bar">
            <span>Estimated Plant & Machinery Capital Outlay:</span>
            <strong className="text-amber-700 text-lg">₹{totalMachineryEstimate.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
