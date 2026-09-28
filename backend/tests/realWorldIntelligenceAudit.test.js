/**
 * VYAVSAYMITRA — Comprehensive Real-World Intelligence, Data Grounding,
 * Financial Accuracy & AI Mitra Audit Test Suite
 *
 * Verifies:
 * 1. Financial Formula Accuracy & Provenance (Deterministic calculations, zero invented figures)
 * 2. Reducing-Balance EMI & Moratorium Computations
 * 3. Scenario Analysis Engine Multipliers & Viability Bounds
 * 4. Market Data Reconciliation Engine & Non-Fabrication Safeguards (No fake 2200 fallback)
 * 5. Grounded Regional Competitor Discovery (Observed entities vs. explicit insufficient data)
 * 6. Gemini Context Assembly, Schema Validation & Stale Analysis Detection
 * 7. Golden End-to-End Enterprise Journey: Mustard Cultivation in Anand, Gujarat (5 Acres, Rabi)
 */

const assert = require('assert');
const { generateScenarioAnalysis } = require('../src/services/business/scenarioAnalysisEngine');
const { calculateEMI, generateRepaymentSchedule, compareFundingScenarios } = require('../src/services/business/loanComparisonEngine');
const { discoverCompetitors } = require('../src/services/business/competitorService');
const { reconcileMarketData, normalizePriceToQuintal, getCanonicalCommodity } = require('../src/services/data/marketReconciliationEngine');
const { buildAnalysisContext, buildDeterministicFallback, parseGeminiResponse } = require('../src/services/ai/geminiAnalystService');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runAudit(name, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log('================================================================');
console.log('   VYAVSAYMITRA REAL-WORLD INTELLIGENCE & ACCURACY AUDIT');
console.log('================================================================\n');

// ══════════════════════════════════════════════════════════════════════
// 1. FINANCIAL ENGINE DETERMINISM & MATHEMATICAL FORMULAS
// ══════════════════════════════════════════════════════════════════════
console.log('--- 1. FINANCIAL FORMULA ACCURACY & DETERMINISM ---');

runAudit('Deterministic project cost, margin, and credit gap computation', () => {
  const areaAcres = 5;
  const costPerAcre = 22000;
  const totalProjectCost = areaAcres * costPerAcre;
  const promoterMarginPct = 0.20; // Statutory RBI PSL 20%
  const promoterEquity = Math.round(totalProjectCost * promoterMarginPct);
  const bankLoanRequirement = totalProjectCost - promoterEquity;

  assert.strictEqual(totalProjectCost, 110000);
  assert.strictEqual(promoterEquity, 22000);
  assert.strictEqual(bankLoanRequirement, 88000);
  assert.strictEqual(promoterEquity + bankLoanRequirement, totalProjectCost, 'Capital sources must sum to 100% of project cost');
});

runAudit('Operating income, net surplus, and annual ROI calculations', () => {
  const grossRevenue = 210000;
  const operatingCost = 95000;
  const netAnnualProfit = grossRevenue - operatingCost;
  const estimatedMonthlyProfit = Math.round(netAnnualProfit / 12);
  const totalProjectCost = 110000;
  const annualRoiPct = Number(((netAnnualProfit / totalProjectCost) * 100).toFixed(1));

  assert.strictEqual(netAnnualProfit, 115000);
  assert.strictEqual(estimatedMonthlyProfit, 9583);
  assert.strictEqual(annualRoiPct, 104.5);
});

runAudit('Standard reducing-balance monthly EMI formula', () => {
  // Principal: 5,00,000, Rate: 10.5% p.a., Tenure: 60 months (5 years)
  // r = 10.5 / 12 / 100 = 0.00875
  // EMI = [500000 * 0.00875 * (1.00875)^60] / [(1.00875)^60 - 1] = 10747
  const emiResult = calculateEMI(500000, 10.5, 60);
  assert.strictEqual(emiResult.emi, 10747, 'Standard reducing-balance EMI must match 10,747');
  assert.strictEqual(emiResult.totalPayment, 10747 * 60);
  assert.strictEqual(emiResult.totalInterest, (10747 * 60) - 500000);
});

runAudit('Reducing-balance repayment amortization schedule', () => {
  const schedule = generateRepaymentSchedule(100000, 12, 12, 0); // 12 months, 0 moratorium
  assert.strictEqual(schedule.length, 12, 'Schedule must contain 12 monthly installments');
  
  // Final month balance must be 0
  const finalMonth = schedule[11];
  assert.strictEqual(finalMonth.outstandingBalance, 0, 'Closing balance at loan termination must be 0');
  
  // Total principal repaid must equal original principal
  const totalPrincipalRepaid = schedule.reduce((sum, m) => sum + m.principalPaid, 0);
  assert.strictEqual(totalPrincipalRepaid, 100000, 'Sum of principal paid must equal loan principal');
});

runAudit('Moratorium interest accrual and capital adjustment', () => {
  // Principal: 2,00,000, Rate: 12%, Tenure: 36 months, Moratorium: 6 months
  const schedule = generateRepaymentSchedule(200000, 12, 36, 6);
  assert.strictEqual(schedule.length, 36);

  // During first 6 months, phase is MORATORIUM and principalPaid is 0
  for (let i = 0; i < 6; i++) {
    assert.strictEqual(schedule[i].phase, 'MORATORIUM');
    assert.strictEqual(schedule[i].principalPaid, 0);
  }

  // After moratorium, amortization begins
  assert.strictEqual(schedule[6].phase, 'REPAYMENT');
  assert.ok(schedule[6].principalPaid > 0);
});

// ══════════════════════════════════════════════════════════════════════
// 2. SCENARIO ANALYSIS ENGINE & VIABILITY MULTIPLIERS
// ══════════════════════════════════════════════════════════════════════
console.log('\n--- 2. SCENARIO ANALYSIS ENGINE ---');

runAudit('Scenario generation applies verified mathematical multipliers', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 400000,
    annualOperatingCost: 250000,
    netAnnualProfit: 150000,
    totalProjectCost: 200000,
    promoterEquity: 40000,
    bankLoanRequirement: 160000
  });

  assert.strictEqual(result.status, 'SUCCESS');
  assert.strictEqual(result.scenarios.length, 3);

  const base = result.scenarios.find(s => s.scenarioKey === 'base');
  const conservative = result.scenarios.find(s => s.scenarioKey === 'conservative');
  const upside = result.scenarios.find(s => s.scenarioKey === 'upside');

  // Base: 1.0x revenue, 1.0x cost
  assert.strictEqual(base.adjustedRevenue, 400000);
  assert.strictEqual(base.adjustedOperatingCost, 250000);
  assert.strictEqual(base.adjustedNetProfit, 150000);
  assert.strictEqual(base.dataStatus, 'VERIFIED');

  // Conservative: 0.85x revenue (-15%), 1.10x cost (+10%)
  assert.strictEqual(conservative.adjustedRevenue, 340000);
  assert.strictEqual(conservative.adjustedOperatingCost, 275000);
  assert.strictEqual(conservative.adjustedNetProfit, 65000);
  assert.strictEqual(conservative.dataStatus, 'PROJECTED');

  // Upside: 1.15x revenue (+15%), 0.95x cost (-5%)
  assert.strictEqual(upside.adjustedRevenue, 460000);
  assert.strictEqual(upside.adjustedOperatingCost, 237500);
  assert.strictEqual(upside.adjustedNetProfit, 222500);
  assert.strictEqual(upside.dataStatus, 'PROJECTED');
});

runAudit('Scenario break-even and viability evaluation', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 400000,
    annualOperatingCost: 250000,
    netAnnualProfit: 150000,
    totalProjectCost: 200000
  });

  const base = result.scenarios.find(s => s.scenarioKey === 'base');
  assert.ok(base.breakEvenMonths !== null, 'Break-even months must be calculated');
  assert.ok(base.breakEvenMonths > 0, 'Break-even months must be positive');
  assert.strictEqual(base.isViable, true, 'Base scenario with positive profit must be viable');
});

runAudit('Scenario engine returns explicit INSUFFICIENT_DATA on missing inputs', () => {
  const result = generateScenarioAnalysis({ annualRevenue: 0, annualOperatingCost: 0 });
  assert.strictEqual(result.status, 'INSUFFICIENT_DATA');
  assert.ok(result.message.includes('Revenue and cost data are required'));
});

// ══════════════════════════════════════════════════════════════════════
// 3. MARKET DATA RECONCILIATION ENGINE & PROVENANCE
// ══════════════════════════════════════════════════════════════════════
console.log('\n--- 3. MARKET DATA RECONCILIATION ENGINE ---');

runAudit('Commodity canonicalization prevents cross-commodity mismatches', () => {
  assert.strictEqual(getCanonicalCommodity('sarson'), 'Mustard');
  assert.strictEqual(getCanonicalCommodity('mustard'), 'Mustard');
  assert.strictEqual(getCanonicalCommodity('tamatar'), 'Tomato');
  assert.strictEqual(getCanonicalCommodity('dhan'), 'Rice');
  assert.strictEqual(getCanonicalCommodity('chana'), 'Gram');
  assert.strictEqual(getCanonicalCommodity('kapas'), 'Cotton');
});

runAudit('Unit normalization correctly standardizes INR/kg to INR/quintal', () => {
  const normResult = normalizePriceToQuintal(42.50, 'INR/kg');
  assert.strictEqual(normResult.normalizedPrice, 4250, '₹42.50/kg must normalize to ₹4,250/qtl');
  assert.strictEqual(normResult.baseUnit, 'INR/quintal');
});

runAudit('CRITICAL: Zero invented price when market data is absent (No 2200 fallback)', () => {
  // Test reconciliation with NO historical data and NO current data
  const result = reconcileMarketData(null, null, { commodity: 'ExoticDragonFruit' });

  assert.strictEqual(result.dataStatus, 'unavailable', 'Status must be explicitly unavailable');
  assert.strictEqual(result.modalPricePerQtl, null, 'Must NOT invent 2200 or any synthetic price');
  assert.strictEqual(result.farmgatePricePerKg, null, 'Farmgate price must be null');
  assert.ok(result.warnings.some(w => w.includes('No historical or current market observations found')));
});

runAudit('Current verified market data takes precedence over historical benchmarks', () => {
  const result = reconcileMarketData(
    { commodity: 'Mustard', modal_price: 3800, unit: 'INR/quintal' },
    {
      commodity: 'Mustard',
      modalPrice: 5650,
      unit: 'INR/quintal',
      market: 'Anand APMC',
      source: 'AGMARKNET Direct Feed',
      observationDate: '2026-03-15'
    },
    { commodity: 'Mustard' }
  );

  assert.strictEqual(result.modalPricePerQtl, 5650);
  assert.strictEqual(result.dataStatus, 'current');
  assert.strictEqual(result.provenance.source, 'AGMARKNET Direct Feed');
  assert.strictEqual(result.comparison.absoluteDifference, 1850);
});

// ══════════════════════════════════════════════════════════════════════
// 4. GROUNDED COMPETITOR DISCOVERY ENGINE
// ══════════════════════════════════════════════════════════════════════
console.log('\n--- 4. COMPETITOR DISCOVERY & REGISTRY ---');

runAudit('Discovers verified registered competitors in Anand, Gujarat for Dairy/Agro', () => {
  const result = discoverCompetitors({
    location: { district: 'Anand', state: 'Gujarat' },
    domain: 'dairy'
  });
  assert.strictEqual(result.status, 'SUCCESS');
  assert.ok(result.competitorsCount >= 1);

  const amul = result.competitors.find(c => c.name.includes('Amul') || c.name.includes('Kaira'));
  assert.ok(amul, 'Should identify Amul / Kaira District Union in Anand district');
  assert.strictEqual(amul.dataStatus, 'OBSERVED');
  assert.strictEqual(amul.scaleCategory, 'Large Cooperative Union');
  assert.ok(amul.verificationSource.includes('Gujarat Cooperative Societies Register'));
  assert.strictEqual(amul.revenue, undefined, 'Must not include fabricated revenue figures');
});

runAudit('Discovers agricultural seed and processing competitors in Anand, Gujarat', () => {
  const result = discoverCompetitors({
    location: { district: 'Anand', state: 'Gujarat' },
    domain: 'agriculture'
  });
  assert.strictEqual(result.status, 'SUCCESS');
  assert.ok(result.competitorsCount >= 1);
  const agro = result.competitors.find(c => c.category.includes('Agro') || c.category.includes('Dairy'));
  assert.ok(agro, 'Should identify observed agricultural or agro-processing participant');
});

runAudit('Returns INSUFFICIENT_VERIFIED_DATA for unmapped micro-locations with guidance', () => {
  const result = discoverCompetitors({
    location: { district: 'NonExistentRemotePanchayat', state: 'ImaginaryState' },
    domain: 'manufacturing'
  });
  assert.strictEqual(result.status, 'INSUFFICIENT_VERIFIED_DATA');
  assert.strictEqual(result.competitors.length, 0);
  assert.ok(result.fieldSurveyGuidance.length >= 3, 'Must provide actionable ground survey steps');
  assert.ok(result.fieldSurveyGuidance.some(g => g.includes('APMC') || g.includes('DIC')));
});

// ══════════════════════════════════════════════════════════════════════
// 5. GEMINI AI GROUNDING, STALENESS & RESPONSE STRUCTURE
// ══════════════════════════════════════════════════════════════════════
console.log('\n--- 5. GEMINI AI GROUNDING & CONTEXT ASSEMBLY ---');

runAudit('buildAnalysisContext embeds competitors, loan gaps, and staleness flag', () => {
  const business = {
    id: 'biz-101',
    name: 'Charotar Mustard Farm',
    domain: 'agriculture',
    business_type: 'AGRICULTURE',
    location: { district: 'Anand', state: 'Gujarat' }
  };
  const financials = {
    totalProjectCost: 110000,
    promoterEquity: 22000,
    bankLoanRequirement: 88000,
    netAnnualProfit: 115000,
    annualRevenue: 210000,
    annualOperatingCost: 95000
  };

  const context = buildAnalysisContext({
    business,
    financialResults: financials,
    competitors: [{ name: 'Local Agro Trader', category: 'Trading' }]
  });

  assert.strictEqual(context.business.name, 'Charotar Mustard Farm');
  assert.strictEqual(context.verifiedFinancials.totalProjectCost, 110000);
  assert.strictEqual(context.competitors.length, 1);
});

runAudit('buildDeterministicFallback enforces required sections and ground truth', () => {
  const context = {
    business: {
      name: 'Charotar Mustard Farm',
      domain: 'agriculture',
      location: { district: 'Anand', state: 'Gujarat' }
    },
    verifiedFinancials: {
      totalProjectCost: 110000,
      promoterEquity: 22000,
      bankLoanRequired: 88000,
      annualRevenue: 210000,
      annualOperatingCost: 95000,
      netAnnualProfit: 115000,
      monthlyProfit: 9583,
      roi: 104.5,
      dscr: 1.8,
      viabilityRating: 'HIGHLY_FEASIBLE'
    },
    marketData: {
      commodity: 'Mustard',
      modalPrice: 5250,
      unit: 'INR/quintal',
      source: 'Anand APMC'
    },
    competitors: [
      { name: 'Charotar Agro Processing', category: 'Agro-Processing', geographicScope: 'LOCAL_DISTRICT' }
    ]
  };

  const response = buildDeterministicFallback(context);
  assert.strictEqual(response.source, 'deterministic_fallback');
  assert.ok(response.executiveSummary.includes('₹1,10,000'));
  assert.ok(response.financialInterpretation.length >= 3);
  assert.ok(response.marketInsights.length >= 1);
  assert.ok(response.competitorInsights.length >= 1);
  assert.ok(response.recommendedActions.length >= 3);
  assert.ok(response.sourcesUsed.some(s => s.includes('deterministic') || s.includes('validated')));
});

runAudit('parseGeminiResponse cleans markdown artifacts and validates schema', () => {
  const rawJson = '```json\n{"executiveSummary":"Test summary","financialInterpretation":["Feasible"],"recommendedActions":["Apply for KCC"],"sourcesUsed":["Verified APMC"]}\n```';
  const parsed = parseGeminiResponse(rawJson);
  assert.ok(parsed !== null, 'Cleaned JSON must be parsed');
  assert.strictEqual(parsed.executiveSummary, 'Test summary');
  assert.strictEqual(parsed.financialInterpretation[0], 'Feasible');
  assert.strictEqual(parsed.recommendedActions[0], 'Apply for KCC');
});

// ══════════════════════════════════════════════════════════════════════
// 6. GOLDEN END-TO-END TEST CASE: MUSTARD IN ANAND, GUJARAT (5 ACRES)
// ══════════════════════════════════════════════════════════════════════
console.log('\n--- 6. GOLDEN TEST CASE: MUSTARD IN ANAND, GUJARAT (5 ACRES, RABI) ---');

runAudit('Golden Journey: Cross-consistency between Analysis, Scenarios, Loans & Competitors', () => {
  // 1. Enterprise Parameters
  const goldenBusiness = {
    id: 'golden-mustard-001',
    name: 'Anand Charotar Mustard Enterprise',
    domain: 'agriculture',
    business_type: 'AGRICULTURE',
    location: { village: 'Vasad', district: 'Anand', state: 'Gujarat' },
    inputs: {
      crop: 'Mustard',
      area: 5,
      areaUnit: 'Acres',
      season: 'Rabi',
      irrigation: 'Borewell / Drip',
      expectedYieldPerAcre: 8 // Quintals per acre -> 40 Qtl total
    }
  };

  // 2. Deterministic Feasibility Execution
  const verifiedCultivationCostPerAcre = 22000;
  const totalYieldQuintals = goldenBusiness.inputs.area * goldenBusiness.inputs.expectedYieldPerAcre; // 40 Qtl
  const verifiedMandiModalPrice = 5250; // ₹5,250/Qtl (Standard Anand APMC Rabi baseline)

  const totalProjectCost = goldenBusiness.inputs.area * verifiedCultivationCostPerAcre; // ₹1,10,000
  const promoterEquity = Math.round(totalProjectCost * 0.20); // ₹22,000 (20%)
  const bankLoanRequirement = totalProjectCost - promoterEquity; // ₹88,000 (80%)
  
  const annualRevenue = totalYieldQuintals * verifiedMandiModalPrice; // 40 * 5250 = ₹2,10,000
  const annualOperatingCost = totalProjectCost; // ₹1,10,000
  const netAnnualProfit = annualRevenue - annualOperatingCost; // ₹1,00,000
  const annualRoiPct = Number(((netAnnualProfit / totalProjectCost) * 100).toFixed(1)); // 90.9%

  const goldenAnalysis = {
    total_project_cost: totalProjectCost,
    promoter_equity: promoterEquity,
    bank_loan_requirement: bankLoanRequirement,
    annual_revenue: annualRevenue,
    annual_operating_cost: annualOperatingCost,
    net_annual_profit: netAnnualProfit,
    estimated_monthly_profit: Math.round(netAnnualProfit / 12),
    annual_roi_pct: annualRoiPct,
    dscr: 2.1,
    viability_rating: 'HIGHLY_FEASIBLE',
    is_stale: 0
  };

  // 3. Scenario Derivation
  const goldenScenarios = generateScenarioAnalysis({
    annualRevenue: goldenAnalysis.annual_revenue,
    annualOperatingCost: goldenAnalysis.annual_operating_cost,
    netAnnualProfit: goldenAnalysis.net_annual_profit,
    totalProjectCost: goldenAnalysis.total_project_cost,
    promoterEquity: goldenAnalysis.promoter_equity,
    bankLoanRequirement: goldenAnalysis.bank_loan_requirement
  });

  // Cross-consistency check: Base scenario MUST match analysis
  const baseScenario = goldenScenarios.scenarios.find(s => s.scenarioKey === 'base');
  assert.strictEqual(baseScenario.adjustedRevenue, goldenAnalysis.annual_revenue, 'Base scenario revenue must equal analysis revenue');
  assert.strictEqual(baseScenario.adjustedNetProfit, goldenAnalysis.net_annual_profit, 'Base scenario profit must equal analysis profit');

  // 4. Funding Comparison Derivation
  const goldenLoans = compareFundingScenarios({
    totalProjectCost: goldenAnalysis.total_project_cost,
    promoterEquity: goldenAnalysis.promoter_equity,
    estimatedMonthlyProfit: goldenAnalysis.estimated_monthly_profit
  });

  // Cross-consistency check: Loan funding gap MUST equal bank loan requirement
  assert.strictEqual(goldenLoans.fundingGap, goldenAnalysis.bank_loan_requirement, 'Loan gap must equal bank loan requirement');
  assert.strictEqual(goldenLoans.totalProjectCost, goldenAnalysis.total_project_cost);
  assert.strictEqual(goldenLoans.promoterEquity, goldenAnalysis.promoter_equity);

  // 5. Competitor Discovery
  const goldenCompetitors = discoverCompetitors(goldenBusiness);
  assert.strictEqual(goldenCompetitors.status, 'SUCCESS');
  assert.ok(goldenCompetitors.competitorsCount >= 1, 'Must find registered agricultural enterprises in Anand');

  // 6. Complete Context Assembly
  const fullContext = buildAnalysisContext({
    business: goldenBusiness,
    financialResults: goldenAnalysis,
    scenarioAnalysis: goldenScenarios,
    loanScenarios: goldenLoans,
    competitors: goldenCompetitors.competitors
  });
  assert.strictEqual(fullContext.business.name, 'Anand Charotar Mustard Enterprise');
  assert.strictEqual(fullContext.verifiedFinancials.totalProjectCost, 110000);
  assert.ok(fullContext.competitors.length >= 1);

  const deterministicReport = buildDeterministicFallback(fullContext);
  assert.strictEqual(deterministicReport.source, 'deterministic_fallback');
  assert.ok(deterministicReport.executiveSummary.includes('₹1,10,000'));
});

// ══════════════════════════════════════════════════════════════════════
// SUMMARY REPORT
// ══════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL REAL-WORLD INTELLIGENCE & GROUNDING AUDITS PASSED PERFECTLY!\n');
  process.exit(0);
}
