/**
 * VYAVSAYMITRA — Business Intelligence Pipeline Tests
 *
 * Tests for:
 * 1. Scenario Analysis Engine (BASE/CONSERVATIVE/UPSIDE)
 * 2. Loan Comparison Engine (EMI, repayment, cash flow)
 * 3. Gemini Analyst Service (structured response, deterministic fallback)
 */

const assert = require('assert');
const { generateScenarioAnalysis } = require('../src/services/business/scenarioAnalysisEngine');
const { calculateEMI, generateRepaymentSchedule, compareFundingScenarios } = require('../src/services/business/loanComparisonEngine');
const { buildAnalysisContext, parseGeminiResponse, buildDeterministicFallback } = require('../src/services/ai/geminiAnalystService');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// 1. SCENARIO ANALYSIS ENGINE
// ════════════════════════════════════════════════════════════════
console.log('\n═══ SCENARIO ANALYSIS ENGINE ═══');

test('generates 3 scenarios from valid financials', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 500000,
    annualOperatingCost: 350000,
    netAnnualProfit: 150000,
    totalProjectCost: 300000,
    promoterEquity: 30000,
    bankLoanRequirement: 200000
  });
  assert.strictEqual(result.status, 'SUCCESS');
  assert.strictEqual(result.scenarios.length, 3);
  assert.deepStrictEqual(result.scenarios.map(s => s.scenarioKey), ['base', 'conservative', 'upside']);
});

test('base scenario matches original values', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 500000,
    annualOperatingCost: 350000,
    netAnnualProfit: 150000,
    totalProjectCost: 300000
  });
  const base = result.scenarios.find(s => s.scenarioKey === 'base');
  assert.strictEqual(base.adjustedRevenue, 500000);
  assert.strictEqual(base.adjustedOperatingCost, 350000);
  assert.strictEqual(base.adjustedNetProfit, 150000);
  assert.strictEqual(base.dataStatus, 'VERIFIED');
});

test('conservative scenario applies correct multipliers', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 500000,
    annualOperatingCost: 350000
  });
  const conservative = result.scenarios.find(s => s.scenarioKey === 'conservative');
  assert.strictEqual(conservative.adjustedRevenue, 425000);  // 500000 * 0.85
  assert.strictEqual(conservative.adjustedOperatingCost, 385000);  // 350000 * 1.10
  assert.strictEqual(conservative.dataStatus, 'PROJECTED');
});

test('upside scenario applies correct multipliers', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 500000,
    annualOperatingCost: 350000
  });
  const upside = result.scenarios.find(s => s.scenarioKey === 'upside');
  assert.strictEqual(upside.adjustedRevenue, 575000);  // 500000 * 1.15
  assert.strictEqual(upside.adjustedOperatingCost, 332500);  // 350000 * 0.95
  assert.strictEqual(upside.dataStatus, 'PROJECTED');
});

test('returns INSUFFICIENT_DATA for empty input', () => {
  const result = generateScenarioAnalysis(null);
  assert.strictEqual(result.status, 'INSUFFICIENT_DATA');
});

test('handles custom configuration overrides', () => {
  const result = generateScenarioAnalysis(
    { annualRevenue: 1000000, annualOperatingCost: 700000 },
    { conservative: { revenueMultiplier: 0.70, costMultiplier: 1.20 } }
  );
  const conservative = result.scenarios.find(s => s.scenarioKey === 'conservative');
  assert.strictEqual(conservative.adjustedRevenue, 700000);  // 1000000 * 0.70
  assert.strictEqual(conservative.adjustedOperatingCost, 840000);  // 700000 * 1.20
});

test('tracks provenance with assumptions', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 500000,
    annualOperatingCost: 350000
  });
  assert.ok(result.provenance);
  assert.strictEqual(result.provenance.sourceType, 'FORMULA');
  assert.ok(result.provenance.assumptions.length > 0);
});

test('viability flag correctly set for negative profit scenario', () => {
  const result = generateScenarioAnalysis({
    annualRevenue: 100000,
    annualOperatingCost: 120000
  });
  const base = result.scenarios.find(s => s.scenarioKey === 'base');
  assert.strictEqual(base.isViable, false);
  assert.strictEqual(base.adjustedNetProfit, -20000);
});

// ════════════════════════════════════════════════════════════════
// 2. LOAN COMPARISON ENGINE
// ════════════════════════════════════════════════════════════════
console.log('\n═══ LOAN COMPARISON ENGINE ═══');

test('calculates EMI correctly for standard loan', () => {
  // ₹1,00,000 at 12% for 12 months = ₹8,885
  const { emi, totalPayment, totalInterest } = calculateEMI(100000, 12, 12);
  assert.ok(emi >= 8880 && emi <= 8890, `EMI ${emi} should be ~8885`);
  assert.ok(totalPayment > 100000);
  assert.ok(totalInterest > 0);
});

test('calculates EMI correctly for zero interest', () => {
  const { emi, totalPayment, totalInterest } = calculateEMI(120000, 0, 12);
  assert.strictEqual(emi, 10000);
  assert.strictEqual(totalPayment, 120000);
  assert.strictEqual(totalInterest, 0);
});

test('returns zero EMI for zero principal', () => {
  const { emi } = calculateEMI(0, 12, 12);
  assert.strictEqual(emi, 0);
});

test('generates repayment schedule with moratorium', () => {
  const schedule = generateRepaymentSchedule(100000, 12, 18, 6);
  assert.ok(schedule.length > 0);

  // First 6 months should be moratorium
  const moratorium = schedule.filter(s => s.phase === 'MORATORIUM');
  assert.strictEqual(moratorium.length, 6);
  moratorium.forEach(m => assert.strictEqual(m.principalPaid, 0));

  // Repayment months should have principal > 0
  const repayment = schedule.filter(s => s.phase === 'REPAYMENT');
  assert.ok(repayment.length > 0);
  repayment.forEach(r => assert.ok(r.principalPaid >= 0));
});

test('compares multiple funding scenarios', () => {
  const result = compareFundingScenarios({
    totalProjectCost: 500000,
    promoterEquity: 50000,
    estimatedMonthlyProfit: 25000
  });
  assert.strictEqual(result.status, 'SUCCESS');
  assert.ok(result.scenarios.length >= 3);
  result.scenarios.forEach(s => {
    assert.ok(s.name);
    assert.ok(s.emi >= 0);
  });
});

test('calculates cash flow impact correctly', () => {
  const result = compareFundingScenarios({
    totalProjectCost: 500000,
    promoterEquity: 50000,
    estimatedMonthlyProfit: 25000,
    loanOptions: [
      { id: 'test', name: 'Test Loan', loanAmount: 450000, interestRate: 10, tenureYears: 5, moratoriumMonths: 0, isVerified: true }
    ]
  });
  const scenario = result.scenarios[0];
  assert.ok(scenario.cashFlowImpact);
  assert.ok(scenario.cashFlowImpact.debtBurdenRating);
  assert.strictEqual(scenario.cashFlowImpact.estimatedMonthlyProfit, 25000);
});

test('handles subsidy correctly in loan calculation', () => {
  const result = compareFundingScenarios({
    totalProjectCost: 1000000,
    promoterEquity: 100000,
    loanOptions: [
      { id: 'subsidized', name: 'PMEGP', loanAmount: 900000, interestRate: 8, tenureYears: 7, moratoriumMonths: 12, subsidyPct: 25, isVerified: true }
    ]
  });
  const scenario = result.scenarios[0];
  assert.strictEqual(scenario.originalLoanAmount, 900000);
  assert.strictEqual(scenario.subsidyAmount, 225000);  // 25% of 900000
  assert.strictEqual(scenario.loanAmount, 675000);  // post-subsidy
});

test('returns INSUFFICIENT_DATA for zero project cost', () => {
  const result = compareFundingScenarios({ totalProjectCost: 0 });
  assert.strictEqual(result.status, 'INSUFFICIENT_DATA');
});

test('funding comparison has correct provenance', () => {
  const result = compareFundingScenarios({
    totalProjectCost: 500000,
    promoterEquity: 50000
  });
  assert.ok(result.provenance);
  assert.strictEqual(result.provenance.sourceType, 'FORMULA');
  assert.ok(result.provenance.method.includes('EMI'));
});

// ════════════════════════════════════════════════════════════════
// 3. GEMINI ANALYST SERVICE (DETERMINISTIC COMPONENTS)
// ════════════════════════════════════════════════════════════════
console.log('\n═══ GEMINI ANALYST SERVICE ═══');

test('builds analysis context from business data', () => {
  const ctx = buildAnalysisContext({
    business: { name: 'Ramesh Farm', domain: 'agriculture', location: { state: 'Gujarat', district: 'Anand' } },
    financialResults: { totalProjectCost: 500000, annualRevenue: 300000, netAnnualProfit: 100000 },
    marketData: { commodity: 'Wheat', modalPricePerQtl: 2500 },
    documents: [{ name: 'Aadhaar', status: 'verified' }, { name: 'PAN', status: 'missing' }],
    tasks: [{ title: 'Task 1', status: 'completed' }, { title: 'Task 2', status: 'pending' }]
  });
  assert.strictEqual(ctx.business.name, 'Ramesh Farm');
  assert.strictEqual(ctx.verifiedFinancials.totalProjectCost, 500000);
  assert.strictEqual(ctx.marketData.commodity, 'Wheat');
  assert.strictEqual(ctx.documentStatus.verified, 1);
  assert.strictEqual(ctx.documentStatus.missing, 1);
  assert.strictEqual(ctx.taskStatus.completed, 1);
});

test('parses valid Gemini JSON response', () => {
  const response = JSON.stringify({
    executiveSummary: 'Good business',
    financialInterpretation: ['Revenue is strong'],
    recommendedActions: ['Apply for loan'],
    marketInsights: ['Wheat prices stable']
  });
  const parsed = parseGeminiResponse(response);
  assert.ok(parsed);
  assert.strictEqual(parsed.executiveSummary, 'Good business');
  assert.strictEqual(parsed.financialInterpretation.length, 1);
});

test('parses Gemini response with code fence wrapping', () => {
  const response = '```json\n{"executiveSummary":"Test","financialInterpretation":["A"],"recommendedActions":["B"]}\n```';
  const parsed = parseGeminiResponse(response);
  assert.ok(parsed);
  assert.strictEqual(parsed.executiveSummary, 'Test');
});

test('rejects Gemini response missing required fields', () => {
  const response = JSON.stringify({ marketInsights: ['Test'] });
  const parsed = parseGeminiResponse(response);
  assert.strictEqual(parsed, null);
});

test('rejects invalid JSON from Gemini', () => {
  const parsed = parseGeminiResponse('This is not JSON at all');
  assert.strictEqual(parsed, null);
});

test('deterministic fallback generates complete analysis', () => {
  const ctx = buildAnalysisContext({
    business: { name: 'Test Farm', domain: 'agriculture', location: { state: 'Gujarat', district: 'Anand' } },
    financialResults: { totalProjectCost: 500000, annualRevenue: 300000, netAnnualProfit: 100000, annualRoiPct: 20, dscr: 1.8, estimatedMonthlyProfit: 8333 },
    fundingOptions: [{ name: 'PMEGP', ministry: 'MoMSME', subsidyPercentage: 25 }],
    documents: [{ name: 'PAN', status: 'missing' }]
  });
  const fallback = buildDeterministicFallback(ctx, 'API key not configured');
  assert.ok(fallback.executiveSummary);
  assert.ok(fallback.financialInterpretation.length > 0);
  assert.ok(fallback.recommendedActions.length > 0);
  assert.strictEqual(fallback.source, 'deterministic_fallback');
  assert.ok(fallback.dataLimitations.some(d => d.includes('unavailable')));
});

test('deterministic fallback includes funding insights when schemes provided', () => {
  const ctx = buildAnalysisContext({
    business: { name: 'Test', domain: 'agriculture' },
    financialResults: {},
    fundingOptions: [{ name: 'MUDRA Shishu', ministry: 'MoF', subsidyPercentage: 0 }]
  });
  const fallback = buildDeterministicFallback(ctx, 'test');
  assert.ok(fallback.fundingInsights.length > 0);
  assert.ok(fallback.fundingInsights[0].includes('MUDRA'));
});

test('deterministic fallback identifies missing information', () => {
  const ctx = buildAnalysisContext({
    business: { name: 'Test', domain: 'agriculture' },
    financialResults: {},
    documents: [{ name: 'Aadhaar', status: 'missing' }, { name: 'PAN', status: 'missing' }]
  });
  const fallback = buildDeterministicFallback(ctx, 'test');
  assert.ok(fallback.missingInformation.length > 0);
  assert.ok(fallback.missingInformation.some(m => m.includes('document')));
});

// ════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════');
console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('═══════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
