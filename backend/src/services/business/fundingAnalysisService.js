/**
 * VYAVSAYMITRA — Production Funding & Credit Scheme Structuring Service
 * 
 * Structures financial assistance:
 * - Promotor Equity Margin (5% to 15%)
 * - Eligible Capital Subsidies (PMEGP 25-35%, PMFME 35%, AHIDF)
 * - Bank Term Loan & Working Capital Limits
 * - Amortization Schedule, Moratorium & Interest Rates
 * - Priority Scheme Matching & Application Guidance
 */

const dataService = require('../data/dataService');

/**
 * Structures funding package and matches government schemes
 * 
 * @param {Object} params
 * @param {number} params.projectCost - Total investment required
 * @param {string} params.businessType - Sector archetype
 * @param {boolean} [params.isRural=true] - Rural vs urban context
 * @param {boolean} [params.isSpecialCategory=false] - SC/ST/Women/Ex-serviceman category
 * @param {number} [params.availableCapital] - User available equity
 * @returns {Object} Comprehensive funding structure and scheme recommendations
 */
function analyzeFundingOptions(params = {}) {
  const projectCost = Math.max(10000, parseFloat(params.projectCost || 150000));
  const businessType = params.businessType || 'general_msme';
  const isRural = params.isRural !== false;
  const isSpecialCategory = !!params.isSpecialCategory;

  // Retrieve eligible government schemes from validated database
  const eligibleSchemes = dataService.getEligibleSchemes({
    businessType,
    projectCost,
    isRural,
    isSpecialCategory
  });

  // Select top primary scheme
  let primaryScheme = null;
  if (businessType === 'food-processing') {
    primaryScheme = eligibleSchemes.find(s => s.id === 'pmfme_micro_food') || eligibleSchemes[0];
  } else if (businessType === 'dairy' || businessType === 'poultry') {
    primaryScheme = eligibleSchemes.find(s => s.id === 'pmegp') || eligibleSchemes.find(s => s.id === 'nabard_ahidf') || eligibleSchemes[0];
  } else if (projectCost <= 50000) {
    primaryScheme = eligibleSchemes.find(s => s.id === 'mudra_shishu') || eligibleSchemes[0];
  } else if (projectCost <= 500000) {
    primaryScheme = eligibleSchemes.find(s => s.id === 'mudra_kishore') || eligibleSchemes[0];
  } else {
    primaryScheme = eligibleSchemes.find(s => s.id === 'pmegp') || eligibleSchemes[0];
  }

  // Capital Structuring
  const ownMarginPct = primaryScheme?.required_own_margin_percentage || (isSpecialCategory ? 5 : 10);
  const estimatedSubsidy = primaryScheme?.estimated_subsidy_amount || 0;
  
  const minRequiredOwnContribution = Math.round((projectCost * ownMarginPct) / 100);
  const promoterEquity = params.availableCapital !== undefined && params.availableCapital !== null
    ? Math.max(minRequiredOwnContribution, Math.min(projectCost, parseFloat(params.availableCapital)))
    : minRequiredOwnContribution;

  // Bank loan covers remainder
  const bankTermLoan = Math.max(0, projectCost - promoterEquity - (primaryScheme?.id === 'pmegp' ? 0 : estimatedSubsidy));
  
  // Repayment parameters
  const interestRate = primaryScheme?.interest_rate_range ? primaryScheme.interest_rate_range[0] : 8.0;
  const tenureYears = primaryScheme?.tenure_years || 5;
  const moratoriumMonths = primaryScheme?.moratorium_months || 6;

  // EMI calculation (P * r * (1+r)^n / ((1+r)^n - 1))
  const monthlyRate = (interestRate / 100) / 12;
  const totalMonths = tenureYears * 12;
  let estimatedMonthlyEmi = 0;
  if (bankTermLoan > 0 && monthlyRate > 0) {
    estimatedMonthlyEmi = Math.round(
      (bankTermLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
    );
  }

  return {
    totalProjectCost: projectCost,
    capitalStructure: {
      promoterEquityContribution: promoterEquity,
      promoterEquityPercentage: +( (promoterEquity / projectCost) * 100 ).toFixed(1),
      estimatedGovernmentSubsidy: estimatedSubsidy,
      subsidyPercentage: primaryScheme?.subsidy_percentage || 0,
      bankTermLoanRequired: bankTermLoan,
      bankLoanPercentage: +( (bankTermLoan / projectCost) * 100 ).toFixed(1)
    },
    loanTerms: {
      indicativeInterestRatePct: interestRate,
      tenureYears: tenureYears,
      moratoriumPeriodMonths: moratoriumMonths,
      estimatedMonthlyEmi: estimatedMonthlyEmi,
      annualDebtService: estimatedMonthlyEmi * 12
    },
    primaryRecommendedScheme: primaryScheme ? {
      schemeId: primaryScheme.id,
      schemeName: primaryScheme.name,
      ministry: primaryScheme.ministry,
      portalUrl: primaryScheme.portal_url,
      subsidyBenefit: `Up to ${primaryScheme.subsidy_percentage}% capital subsidy (₹${estimatedSubsidy.toLocaleString('en-IN')})`,
      marginRequirement: `${primaryScheme.required_own_margin_percentage}% promoter equity`
    } : null,
    allEligibleSchemes: eligibleSchemes.map(s => ({
      id: s.id,
      name: s.name,
      ministry: s.ministry,
      subsidyPercentage: s.subsidy_percentage,
      estimatedSubsidyAmount: s.estimated_subsidy_amount,
      ownMarginPercentage: s.required_own_margin_percentage,
      estimatedBankLoan: s.estimated_bank_loan,
      portalUrl: s.portal_url
    })),
    documentationChecklist: [
      'Aadhaar Card and PAN Card of Promoter',
      'Rural Residence Certificate / Gram Panchayat NOC',
      'Detailed Project Report (DPR) with Technical Feasibility',
      'Land Ownership 7/12 Extract or Registered Lease Deed (Minimum 5 years)',
      'Quotation / Proforma Invoices for Machinery & Equipment',
      'Bank Account Statement (Last 6 Months)'
    ],
    provenance: {
      source: 'validated_government_schemes.json (MoMSME, MoFPI, DAHD)',
      sourceType: 'DATABASE_VALUE',
      confidence: 0.98
    }
  };
}

module.exports = {
  analyzeFundingOptions
};
