/**
 * VYAVSAYMITRA — Gemini Structured Business Analyst Service
 *
 * Generates AI-powered business interpretation by sending verified,
 * structured JSON context to Gemini and requiring structured JSON output.
 *
 * ABSOLUTE RULES:
 * - Gemini NEVER invents numbers, prices, subsidies, or government data.
 * - Gemini receives pre-calculated deterministic financial results.
 * - Gemini's role: interpret, explain, summarize, identify gaps, suggest actions.
 * - If Gemini is unavailable or returns malformed response, use deterministic fallback.
 * - API key remains strictly backend-only.
 */

const geminiConfig = require('../../config/gemini');

/**
 * @typedef {Object} GeminiAnalysisContext
 * @property {Object} business - Business profile
 * @property {Object} verifiedInputs - Validated business inputs
 * @property {Object} financialResults - Deterministic calculation output
 * @property {Object} marketData - Verified market observations
 * @property {Array}  fundingOptions - Matched funding schemes
 * @property {Array}  loanScenarios - Calculated loan comparisons
 * @property {Object} scenarioAnalysis - BASE/CONSERVATIVE/UPSIDE
 * @property {Array}  risks - Identified business risks
 * @property {Array}  documents - Business documents
 * @property {Array}  tasks - Action plan tasks
 * @property {Object} dprStatus - DPR generation status
 * @property {Object} dataProvenance - Source tracking
 * @property {Object} dataFreshness - Staleness indicators
 */

/**
 * @typedef {Object} StructuredGeminiResponse
 * @property {string} executiveSummary
 * @property {Array}  financialInterpretation
 * @property {Array}  marketInsights
 * @property {Array}  fundingInsights
 * @property {Array}  competitorInsights
 * @property {Array}  keyRisks
 * @property {Array}  missingInformation
 * @property {Array}  recommendedActions
 * @property {Array}  dataLimitations
 * @property {Array}  sourcesUsed
 */

const STRUCTURED_RESPONSE_SCHEMA = {
  required: ['executiveSummary', 'financialInterpretation', 'recommendedActions'],
  optional: ['marketInsights', 'fundingInsights', 'competitorInsights', 'keyRisks',
    'missingInformation', 'dataLimitations', 'sourcesUsed']
};

/**
 * Builds the structured context payload for Gemini.
 * Sanitizes sensitive data before sending.
 */
function buildAnalysisContext(ctx = {}) {
  const biz = ctx.business || {};
  const loc = biz.location || {};
  const fin = ctx.financialResults || {};
  const market = ctx.marketData || {};
  const funding = ctx.fundingOptions || [];
  const loans = ctx.loanScenarios || {};
  const scenarios = ctx.scenarioAnalysis || {};
  const risks = ctx.risks || {};
  const docs = (ctx.documents || []).map(d => ({
    name: d.document_name || d.name,
    status: d.status || d.verification_status || 'unknown',
    type: d.document_type || 'general'
  }));
  const tasks = (ctx.tasks || []).map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category
  }));

  return {
    business: {
      name: biz.name || 'Enterprise',
      domain: biz.domain || 'agriculture',
      businessType: biz.business_type || '',
      stage: biz.stage || 'planning',
      location: {
        state: loc.state || '',
        district: loc.district || '',
        village: loc.village || '',
        isRural: loc.is_rural !== false
      }
    },
    verifiedFinancials: {
      totalProjectCost: extractVal(fin, 'totalProjectCost', 'total_project_cost', 'totalInvestment'),
      promoterEquity: extractVal(fin, 'promoterEquity', 'promoter_equity', 'ownEquityContribution'),
      bankLoanRequired: extractVal(fin, 'bankLoanRequired', 'bankLoanRequirement', 'bank_loan_requirement', 'termLoanRequirement'),
      annualRevenue: extractVal(fin, 'annualRevenue', 'annual_revenue', 'grossReturn'),
      annualOperatingCost: extractVal(fin, 'annualOperatingCost', 'annual_operating_cost', 'totalCost'),
      netAnnualProfit: extractVal(fin, 'netAnnualProfit', 'net_annual_profit', 'netProfit'),
      monthlyProfit: extractVal(fin, 'monthlyProfit', 'estimatedMonthlyProfit', 'estimated_monthly_profit'),
      roi: extractVal(fin, 'roi', 'annualRoiPct', 'annual_roi_pct'),
      dscr: extractVal(fin, 'dscr'),
      viabilityRating: fin.viabilityRating || fin.viability_rating || 'VIABLE',
      engineName: fin.engineName || 'Deterministic Calculation Engine'
    },
    marketData: {
      commodity: market.commodity || '',
      modalPrice: market.modalPricePerQtl || market.price || 0,
      unit: market.unit || 'INR/quintal',
      source: market.current?.source || market.dataSource || '',
      observationDate: market.current?.observationDate || market.latestDataDate || '',
      dataStatus: market.dataStatus || 'unknown',
      trend: market.trend?.direction || 'UNKNOWN'
    },
    fundingOptions: funding.slice(0, 5).map(s => ({
      name: s.name || s.schemeName,
      ministry: s.ministry,
      subsidyPct: s.subsidyPercentage || s.subsidy_percentage,
      eligibilityStatus: s.eligibilityStatus || 'POTENTIALLY_APPLICABLE'
    })),
    loanComparison: loans.scenarios ? loans.scenarios.slice(0, 3).map(l => ({
      name: l.name,
      emi: l.emi,
      totalInterest: l.totalInterest,
      debtBurden: l.cashFlowImpact?.debtBurdenRating
    })) : [],
    scenarioSummary: scenarios.scenarios ? scenarios.scenarios.map(s => ({
      label: s.label,
      netProfit: s.adjustedNetProfit,
      roi: s.adjustedRoi,
      isViable: s.isViable
    })) : [],
    riskSummary: {
      overallRating: risks.overallRiskRating || 'UNKNOWN',
      healthScore: risks.healthScore || 0,
      topRisks: (risks.identifiedRisks || []).slice(0, 3).map(r => ({
        name: r.riskName,
        severity: r.severity,
        category: r.category
      }))
    },
    documentStatus: {
      total: docs.length,
      verified: docs.filter(d => d.status === 'verified').length,
      missing: docs.filter(d => d.status === 'missing').length,
      rejected: docs.filter(d => d.status === 'rejected').length
    },
    taskStatus: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'COMPLETED' || t.status === 'completed').length,
      pending: tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'completed').length
    },
    dprGenerated: !!(ctx.dprStatus?.generated || ctx.dprVersions?.length > 0),
    competitors: (ctx.competitors || []).slice(0, 4).map(c => ({
      name: c.name,
      category: c.category,
      geographicScope: c.geographicScope || 'LOCAL_DISTRICT',
      products: c.verifiedProducts || [],
      publicPricing: c.publicPriceDisclosure || 'Public pricing not available'
    })),
    dataFreshness: ctx.dataFreshness || {
      analysisAge: 'current',
      marketDataAge: 'unknown'
    }
  };
}

/**
 * Calls Gemini API with structured context and expects structured JSON response.
 * Falls back to deterministic narrative on failure.
 *
 * @param {GeminiAnalysisContext} context
 * @returns {Promise<StructuredGeminiResponse>}
 */
async function generateStructuredAnalysis(context) {
  const structuredContext = buildAnalysisContext(context);
  const key = geminiConfig.getApiKey();
  const model = geminiConfig.getModel();

  if (!key) {
    return buildDeterministicFallback(structuredContext, 'Gemini API key not configured');
  }

  const systemPrompt = `You are a business analyst for VYAVSAYMITRA, an Indian rural entrepreneurship advisory platform.

CRITICAL RULES:
1. You receive VERIFIED, pre-calculated business data. NEVER recalculate or invent financial numbers.
2. NEVER fabricate prices, subsidies, government scheme details, loan approvals, competitor data, or population statistics.
3. If data is missing, explicitly state "Not enough verified data available" for that topic.
4. NEVER say "Guaranteed profit", "Guaranteed ROI", "Guaranteed loan approval", or "Guaranteed eligibility".
5. Use language like "Projected", "Estimated from verified inputs", "Based on available market observations".
6. Your role is INTERPRETATION and EXPLANATION of the verified data provided.

You MUST respond with ONLY a valid JSON object (no markdown, no code fences) matching this exact schema:
{
  "executiveSummary": "string (2-3 sentences summarizing the business situation)",
  "financialInterpretation": ["array of insight strings explaining verified financial results"],
  "marketInsights": ["array of strings about market conditions based on provided data"],
  "fundingInsights": ["array of strings about funding options"],
  "competitorInsights": ["array of strings - say 'Verified competitor data is insufficient' if no data provided"],
  "keyRisks": ["array of risk descriptions with evidence from provided data"],
  "missingInformation": ["array of critical missing data items"],
  "recommendedActions": ["array of practical next steps for the entrepreneur"],
  "dataLimitations": ["array of data gaps or staleness warnings"],
  "sourcesUsed": ["array of source descriptions for transparency"]
}`;

  const userMessage = JSON.stringify(structuredContext, null, 0);

  try {
    const https = require('https');
    const timeoutMs = geminiConfig.getTimeoutMs() || 30000;

    const postData = JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '{"executiveSummary":"I will analyze the verified business data you provide and respond with a structured JSON assessment. I will never fabricate numbers or make guarantees."}' }] },
        { role: 'user', parts: [{ text: `Analyze this verified business context and respond with ONLY the JSON object:\n\n${userMessage}` }] }
      ],
      generationConfig: {
        temperature: geminiConfig.getTemperature(),
        maxOutputTokens: geminiConfig.getMaxOutputTokens(),
        responseMimeType: 'application/json'
      }
    });

    const rawResponse = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${key}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: timeoutMs
      }, (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const j = JSON.parse(buf);
              const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return resolve(text);
            } catch {}
          }
          reject(new Error(`Gemini API returned status ${res.statusCode}`));
        });
      });
      req.on('timeout', () => req.destroy(new Error('Gemini API timeout')));
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    // Parse and validate Gemini JSON response
    const parsed = parseGeminiResponse(rawResponse);
    if (parsed) {
      return {
        ...parsed,
        source: 'gemini_structured',
        model,
        generatedAt: new Date().toISOString()
      };
    }

    // Malformed response — try once more? No, use fallback.
    console.warn('[GEMINI ANALYST] Malformed Gemini response, using deterministic fallback');
    return buildDeterministicFallback(structuredContext, 'Gemini returned malformed response');

  } catch (err) {
    console.warn('[GEMINI ANALYST] Gemini call failed, using deterministic fallback:', err.message);
    return buildDeterministicFallback(structuredContext, err.message);
  }
}

/**
 * Parses and validates Gemini's JSON response against the expected schema.
 */
function parseGeminiResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Strip markdown fences if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Validate required fields
    for (const field of STRUCTURED_RESPONSE_SCHEMA.required) {
      if (!parsed[field]) return null;
    }

    // Ensure arrays are arrays
    for (const field of [...STRUCTURED_RESPONSE_SCHEMA.required, ...STRUCTURED_RESPONSE_SCHEMA.optional]) {
      if (field === 'executiveSummary') continue;
      if (parsed[field] && !Array.isArray(parsed[field])) {
        parsed[field] = [String(parsed[field])];
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Builds deterministic fallback analysis when Gemini is unavailable.
 */
function buildDeterministicFallback(ctx, reason) {
  const fin = ctx.verifiedFinancials || {};
  const mkt = ctx.marketData || {};
  const risk = ctx.riskSummary || {};
  const biz = ctx.business || {};
  const bizName = biz.name || 'Your Enterprise';
  const locStr = [biz.location?.village, biz.location?.district, biz.location?.state].filter(Boolean).join(', ') || 'Your Location';

  const executiveSummary = fin.totalProjectCost > 0
    ? `The ${biz.domain || 'business'} enterprise "${bizName}" in ${locStr} has a verified total project cost of ₹${(fin.totalProjectCost || 0).toLocaleString('en-IN')} with a projected annual net surplus of ₹${(fin.netAnnualProfit || 0).toLocaleString('en-IN')} (ROI: ${fin.roi || 0}%). ${fin.viabilityRating === 'HIGHLY_FEASIBLE' ? 'The project demonstrates strong financial viability.' : 'The project shows moderate viability requiring careful cost management.'}`
    : `Business analysis for "${bizName}" requires verified financial data. Please complete business information and run analysis.`;

  const financialInterpretation = [];
  if (fin.totalProjectCost > 0) {
    financialInterpretation.push(`Total project investment: ₹${fin.totalProjectCost.toLocaleString('en-IN')} (from verified calculation engine: ${fin.engineName || 'deterministic'})`);
  }
  if (fin.roi > 0) {
    financialInterpretation.push(`Projected Return on Investment: ${fin.roi}% — ${fin.roi >= 25 ? 'exceeds standard bank deposit benchmark rates' : 'moderate return requiring cost optimization'}`);
  }
  if (fin.dscr) {
    financialInterpretation.push(`Debt Service Coverage Ratio: ${fin.dscr} — ${fin.dscr >= 1.5 ? 'strong capacity for bank loan repayment' : 'tight repayment margin requiring careful cash flow management'}`);
  }
  if (fin.monthlyProfit > 0) {
    financialInterpretation.push(`Estimated monthly surplus: ₹${fin.monthlyProfit.toLocaleString('en-IN')} available for loan repayment and working capital`);
  }

  const marketInsights = [];
  if (mkt.commodity && mkt.modalPrice > 0) {
    marketInsights.push(`${mkt.commodity}: Verified modal price ₹${mkt.modalPrice.toLocaleString('en-IN')}/${mkt.unit || 'quintal'} (Source: ${mkt.source || 'verified market observation'}, Date: ${mkt.observationDate || 'recent'})`);
    marketInsights.push(`Market trend: ${mkt.trend || 'Data insufficient for trend analysis'}`);
  } else {
    marketInsights.push('Current verified market data is unavailable for this commodity/location.');
  }

  const fundingInsights = [];
  if (ctx.fundingOptions && ctx.fundingOptions.length > 0) {
    ctx.fundingOptions.forEach(f => {
      fundingInsights.push(`${f.name}: Potentially applicable (${f.ministry || 'Government of India'}) — Up to ${f.subsidyPct || 0}% subsidy. Eligibility requires branch verification.`);
    });
  } else {
    fundingInsights.push('Run scheme matching to identify applicable government funding options.');
  }

  const keyRisks = [];
  if (risk.topRisks && risk.topRisks.length > 0) {
    risk.topRisks.forEach(r => keyRisks.push(`${r.category}: ${r.name} (Severity: ${r.severity})`));
  }
  keyRisks.push('All projections are estimates. Actual results depend on market conditions, execution quality, and external factors.');

  const missingInformation = [];
  if (!fin.totalProjectCost) missingInformation.push('Financial analysis not yet completed — run business analysis');
  if (!mkt.commodity || mkt.modalPrice <= 0) missingInformation.push('Verified market price observation not available');
  if (ctx.documentStatus?.missing > 0) missingInformation.push(`${ctx.documentStatus.missing} mandatory document(s) not yet uploaded`);
  if (!ctx.dprGenerated) missingInformation.push('Bankable DPR not yet generated');

  const recommendedActions = [];
  if (!fin.totalProjectCost) {
    recommendedActions.push('Complete business information and run financial analysis');
  } else {
    recommendedActions.push('Review verified financial analysis and confirm business inputs are accurate');
  }
  if (!ctx.dprGenerated) recommendedActions.push('Generate Detailed Project Report (DPR) for bank submission');
  if (ctx.documentStatus?.missing > 0) recommendedActions.push('Upload missing mandatory documents');
  if (ctx.taskStatus?.pending > 0) recommendedActions.push(`Complete ${ctx.taskStatus.pending} pending action plan task(s)`);
  recommendedActions.push('Visit nearest bank branch with DPR and supporting documents for credit application');

  const competitorInsights = (ctx.competitors && ctx.competitors.length > 0)
    ? ctx.competitors.map(c => `Observed in ${c.geographicScope === 'LOCAL_DISTRICT' ? 'local district' : 'regional market hub'}: ${c.name} (${c.category}) — Public pricing: ${c.publicPricing || c.publicPriceDisclosure || 'Not publicly listed'}`)
    : ['Verified competitor data is insufficient for this location. Local market survey recommended.'];

  return {
    executiveSummary,
    financialInterpretation,
    marketInsights,
    fundingInsights,
    competitorInsights,
    keyRisks,
    missingInformation,
    recommendedActions,
    dataLimitations: [
      'AI-assisted interpretation is temporarily unavailable. Your verified financial and market analysis remains available.',
      `Reason: ${reason || 'Gemini service unavailable'}`
    ],
    sourcesUsed: [
      'Verified deterministic calculation engine',
      'VYAVSAYMITRA validated datasets',
      'Rule-based advisory synthesizer (fallback mode)'
    ],
    source: 'deterministic_fallback',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Extract numeric value from object trying multiple field names.
 */
function extractVal(obj, ...names) {
  for (const n of names) {
    const v = obj?.[n];
    if (v !== undefined && v !== null) {
      if (typeof v === 'object' && v.value !== undefined) return parseFloat(v.value) || 0;
      return parseFloat(v) || 0;
    }
  }
  return 0;
}

module.exports = {
  generateStructuredAnalysis,
  buildAnalysisContext,
  parseGeminiResponse,
  buildDeterministicFallback,
  STRUCTURED_RESPONSE_SCHEMA
};
