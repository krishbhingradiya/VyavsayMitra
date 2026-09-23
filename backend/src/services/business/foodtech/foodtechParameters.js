/**
 * VYAVSAYMITRA — FoodTech & Agro-Processing Standardized Parameter Definitions
 * 
 * Defines authoritative, reusable parameter schemas covering:
 * - Raw Material intake & characteristics
 * - Processing throughput & conversion efficiencies
 * - Output & Byproduct yields
 * - Operating Costs (ICMAI CAS Cost Classification)
 * - Fixed & Capital Structure
 * - Financial & Debt parameters
 * 
 * Strict Data Status Rules:
 * - VERIFIED_DATA: Empirically established by institutional benchmarks (MoFPI, NABARD, CFTRI, CACP)
 * - USER_INPUT: Declared directly by the entrepreneur / operator
 * - CALCULATED: Derived deterministically via formula engine
 * - ESTIMATE: Statistical benchmark with explicit confidence bounds
 * - UNKNOWN: Missing or unbenchmarked parameter (strictly never converted to zero)
 */

const { DATA_STATUSES } = require('../../formulaEngine/parameterSchema');

const DATA_TYPES = {
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  ARRAY: 'array'
};

const FOODTECH_PARAMETERS = [
  // ─── 1. RAW MATERIAL PARAMETERS ───────────────────────────────────
  {
    parameterId: 'raw_material_quantity',
    name: 'Raw Material Intake Quantity',
    description: 'Total weight of unprocessed agro-produce fed into the processing facility',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: true,
    minimum: 0,
    source: 'Operational Weighbridge / Entrepreneur Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['raw_material_quantity >= 0']
  },
  {
    parameterId: 'raw_material_price',
    name: 'Raw Material Procurement Price',
    description: 'Delivered cost of raw agricultural produce per unit at factory gate',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/kg',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'Verified Mandi / Procurement Invoice / Entrepreneur Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['raw_material_price >= 0']
  },
  {
    parameterId: 'raw_material_unit',
    name: 'Raw Material Measurement Unit',
    description: 'Physical measurement standard used for raw material intake',
    dataType: DATA_TYPES.STRING,
    unit: 'unit',
    currency: null,
    required: false,
    allowedValues: ['kg', 'quintal', 'tonne', 'litre'],
    source: 'Standard Weights & Measures (Legal Metrology Act, 2009)',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['allowedValues.includes(raw_material_unit)']
  },
  {
    parameterId: 'raw_material_moisture',
    name: 'Raw Material Moisture Content %',
    description: 'Percentage moisture content of raw grain/produce upon receiving',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 100,
    source: 'BIS / CSIR-CFTRI Post-Harvest Grain Standards',
    sourceDate: '2023-2025',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['raw_material_moisture >= 0', 'raw_material_moisture <= 100']
  },
  {
    parameterId: 'raw_material_grade',
    name: 'Raw Material Quality Grade',
    description: 'Standardized commodity quality classification (e.g. FAQ, Grade A, Milling Grade)',
    dataType: DATA_TYPES.STRING,
    unit: 'grade',
    currency: null,
    required: false,
    allowedValues: ['FAQ', 'Grade-A', 'Grade-B', 'Commercial', 'Premium'],
    source: 'AGMARK / BIS Quality Certification System',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['allowedValues.includes(raw_material_grade)']
  },

  // ─── 2. PROCESSING & EFFICIENCY PARAMETERS ─────────────────────────
  {
    parameterId: 'processing_capacity',
    name: 'Rated Machine Processing Capacity',
    description: 'Maximum mechanical throughput per hour or operating day under continuous load',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg/day',
    currency: null,
    required: true,
    minimum: 0,
    source: 'Machine Manufacturer OEM Specification / NABARD Project Profile',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['processing_capacity > 0']
  },
  {
    parameterId: 'operating_hours',
    name: 'Daily Operating Hours',
    description: 'Actual machine operational running hours per day',
    dataType: DATA_TYPES.NUMBER,
    unit: 'hours/day',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 24,
    source: 'Plant Shift Schedule / NABARD Benchmark (Standard 8-10 hrs/day)',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['operating_hours >= 1', 'operating_hours <= 24']
  },
  {
    parameterId: 'recovery_rate',
    name: 'Primary Product Recovery Rate %',
    description: 'Net conversion efficiency percentage of primary saleable product from raw intake',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: true,
    minimum: 0,
    maximum: 100,
    source: 'MoFPI PMFME Guidelines / CSIR-CFTRI Process Standards',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['recovery_rate >= 0', 'recovery_rate <= 100']
  },
  {
    parameterId: 'processing_loss',
    name: 'Processing & Handling Loss %',
    description: 'Moisture reduction, dust collection, cleaning foreign matter, and conveyance shrinkage',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 100,
    source: 'CSIR-CFTRI Milling Engineering Norms',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['processing_loss >= 0', 'processing_loss < 100']
  },
  {
    parameterId: 'wastage',
    name: 'Unsalable Waste & Foreign Impurities %',
    description: 'Stones, mud balls, straw, broken husks, and unsalable residue discarded',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 50,
    source: 'Destoner / Screen Separator Efficiency Norms',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['wastage >= 0', 'wastage <= 50']
  },
  {
    parameterId: 'conversion_ratio',
    name: 'Raw to Finished Goods Ratio',
    description: 'Kilograms of raw material required to produce one kilogram of finished product',
    dataType: DATA_TYPES.NUMBER,
    unit: 'ratio',
    currency: null,
    required: false,
    minimum: 1,
    source: 'Process Costing & Mass Balance Standard',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: false,
    validationRules: ['conversion_ratio >= 1']
  },
  {
    parameterId: 'byproduct_recovery',
    name: 'Saleable Byproduct Recovery Rate %',
    description: 'Secondary commercial byproduct extraction ratio (e.g. bran, oil cake, husk)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 100,
    source: 'NABARD Model Bankable Project Profiles',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['byproduct_recovery >= 0', 'byproduct_recovery <= 100']
  },

  // ─── 3. OUTPUT PARAMETERS ─────────────────────────────────────────
  {
    parameterId: 'finished_product_quantity',
    name: 'Finished Product Output Quantity',
    description: 'Net volume of prime salable finished packaged goods produced',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: true,
    minimum: 0,
    source: 'Calculated from Intake & Recovery or Production Declaration',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['finished_product_quantity >= 0']
  },
  {
    parameterId: 'byproduct_quantity',
    name: 'Secondary Byproduct Quantity',
    description: 'Net volume of secondary saleable commercial byproducts produced',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Mass Balance & Byproduct Extraction Fraction',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['byproduct_quantity >= 0']
  },
  {
    parameterId: 'selling_price',
    name: 'Primary Finished Product Selling Price',
    description: 'Wholesale or retail realization per unit of finished product',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/kg',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'Market Survey / Wholesale Trade Price / Entrepreneur Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['selling_price >= 0']
  },
  {
    parameterId: 'byproduct_selling_price',
    name: 'Secondary Byproduct Selling Price',
    description: 'Market realization per unit of commercial byproduct (e.g. cattle feed bran, oil cake)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/kg',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Feed Market / Local Trade Reference',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['byproduct_selling_price >= 0']
  },
  {
    parameterId: 'packaging_quantity',
    name: 'Packaging Units Required',
    description: 'Number of individual retail pouches, bags, or containers required',
    dataType: DATA_TYPES.NUMBER,
    unit: 'packs',
    currency: null,
    required: false,
    minimum: 0,
    source: 'SKU Packaging Specification',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['packaging_quantity >= 0']
  },

  // ─── 4. COST PARAMETERS (ICMAI CAS-1) ─────────────────────────────
  {
    parameterId: 'raw_material_cost',
    name: 'Total Raw Material Procurement Cost',
    description: 'Aggregate direct material cost incurred for raw produce intake',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'ICMAI Cost Accounting Standard CAS-6: Material Cost',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['raw_material_cost >= 0']
  },
  {
    parameterId: 'labour_cost',
    name: 'Operational Direct Labour Cost',
    description: 'Machine operators, helpers, handling, and packing labor wages',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'State Statutory Minimum Wages / Operational Payroll',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['labour_cost >= 0']
  },
  {
    parameterId: 'electricity_cost',
    name: 'Industrial Power & Electricity Cost',
    description: 'Milling motor power, lighting, and 3-phase industrial electricity tariffs',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'State Electricity Regulatory Commission (SERC) Industrial Tariff',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['electricity_cost >= 0']
  },
  {
    parameterId: 'fuel_cost',
    name: 'Fuel & Boiler / Generator Cost',
    description: 'Diesel fuel for backup genset, drying furnaces, or husk-fired boilers',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Fuel Consumption Logs / Entrepreneur Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['fuel_cost >= 0']
  },
  {
    parameterId: 'water_cost',
    name: 'Industrial Water & Conditioning Cost',
    description: 'Water conditioning, grain soaking/washing, and effluent treatment charges',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Industrial Water Tariffs / Water Delivery Receipts',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['water_cost >= 0']
  },
  {
    parameterId: 'packaging_cost',
    name: 'Packaging Material Cost',
    description: 'Food-grade multi-layer pouches, gunny/HDPE bags, sealing tape, and outer corrugated boxes',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Packaging Vendor Quotation / MoFPI PMFME Standard (₹1-2/kg)',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['packaging_cost >= 0']
  },
  {
    parameterId: 'transport_cost',
    name: 'Freight & Logistics Cost',
    description: 'Inward raw grain haulage and outward distribution freight',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Commercial Freight Standard / Entrepreneur Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['transport_cost >= 0']
  },
  {
    parameterId: 'maintenance_cost',
    name: 'Repairs, Consumables & Maintenance Cost',
    description: 'Stone mill redressing, screen replacement, motor lubrication, and preventive maintenance',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'NABARD Maintenance Benchmark (1.5-2.5% of Plant & Machinery p.a.)',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['maintenance_cost >= 0']
  },
  {
    parameterId: 'rent',
    name: 'Premises Lease & Shed Rent',
    description: 'Contractual monthly or annual rental cost of food processing premises',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Commercial Lease Agreement / Local Standard',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['rent >= 0']
  },
  {
    parameterId: 'other_operating_cost',
    name: 'Other Variable Operating Expenses',
    description: 'Consumables, sanitation, regulatory testing (FSSAI), and miscellaneous variable expenses',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Operational Expense Records',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['other_operating_cost >= 0']
  },
  {
    parameterId: 'other_variable_cost',
    name: 'Other Variable Operating Expenses (Alias)',
    description: 'Consumables, sanitation, regulatory testing (FSSAI), and miscellaneous variable expenses',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Operational Expense Records / ICMAI CAS-1',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['other_variable_cost >= 0']
  },

  // ─── 5. BUSINESS & CAPITAL STRUCTURE PARAMETERS ───────────────────
  {
    parameterId: 'fixed_cost',
    name: 'Total Periodic Fixed Cost',
    description: 'Overheads independent of production throughput (rent, permanent supervisor, insurance, base depreciation)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'ICMAI CAS-1 Cost Classification',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['fixed_cost >= 0']
  },
  {
    parameterId: 'variable_cost',
    name: 'Total Periodic Variable Cost',
    description: 'Expenses directly scaling with production (raw material, process power, packaging, freight)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'ICMAI CAS-1 Cost Classification',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['variable_cost >= 0']
  },
  {
    parameterId: 'working_capital',
    name: 'Working Capital Buffer Requirement',
    description: 'Liquidity margin required to fund raw material buffer, WIP, and receivable trade credit',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'RBI Nayak Committee Turnover Norm (20-25% of annual operating turnover)',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['working_capital >= 0']
  },
  {
    parameterId: 'initial_investment',
    name: 'Initial Project Capital Investment',
    description: 'Total setup capital (plant, machinery, electrification, civil works, initial working capital)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: true,
    minimum: 0,
    source: 'NABARD Model Bankable Project / PMEGP Project Profiles',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['initial_investment >= 0']
  },
  {
    parameterId: 'operating_days',
    name: 'Annual Operating Days',
    description: 'Number of active manufacturing / processing days per calendar year',
    dataType: DATA_TYPES.NUMBER,
    unit: 'days/year',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 365,
    source: 'NABARD Industrial Agro-Processing Norms (Standard 300 days/year)',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['operating_days >= 1', 'operating_days <= 365']
  },
  {
    parameterId: 'production_days',
    name: 'Monthly Production Days',
    description: 'Working days allocated to active production per month',
    dataType: DATA_TYPES.NUMBER,
    unit: 'days/month',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 31,
    source: 'Standard Working Cycle (typically 25 days/month)',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['production_days >= 1', 'production_days <= 31']
  },

  // ─── 6. FINANCIAL & CREDIT PARAMETERS ─────────────────────────────
  {
    parameterId: 'loan_amount',
    name: 'Bank Term Loan / Working Capital Loan Amount',
    description: 'Institutional debt requested to fund capital expenditure and margin money',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Bank Loan Sanction / Financial Appraisal',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['loan_amount >= 0']
  },
  {
    parameterId: 'interest_rate',
    name: 'Annual Bank Interest Rate %',
    description: 'Commercial interest rate charged on term loan or cash credit facility',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 36,
    source: 'RBI Lending Rates / Commercial Bank Priority Sector Lending (PSL)',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['interest_rate >= 0', 'interest_rate <= 36']
  },
  {
    parameterId: 'loan_tenure',
    name: 'Loan Repayment Tenure',
    description: 'Number of years over which institutional debt is amortized',
    dataType: DATA_TYPES.NUMBER,
    unit: 'years',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 20,
    source: 'NABARD / Bank Amortization Norms (Standard 5-7 years)',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['loan_tenure >= 1', 'loan_tenure <= 20']
  },
  {
    parameterId: 'own_contribution',
    name: 'Promoter Own Equity Contribution',
    description: 'Margin money contributed by the entrepreneur (typically 10-25% under PMEGP/PMFME)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'PMEGP / PMFME Guidelines',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['own_contribution >= 0']
  },

  // ─── 7. INTERMEDIATE & SPECIALIZED FOODTECH PARAMETERS ────────────
  {
    parameterId: 'target_output',
    name: 'Target Finished Goods Output Quantity',
    description: 'Planned commercial production volume to be achieved',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Production Planning / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['target_output >= 0']
  },
  {
    parameterId: 'effective_yield',
    name: 'Effective Net Yield Rate Percentage',
    description: 'Net conversion efficiency percentage after accounting for processing losses',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 100,
    source: 'CSIR-CFTRI Process Engineering Norms',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['effective_yield >= 0', 'effective_yield <= 100']
  },
  {
    parameterId: 'variable_cost_per_unit',
    name: 'Variable Cost per Finished Unit',
    description: 'Aggregate variable cost incurred per kilogram of finished product',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/kg',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'ICMAI CAS-4 Unit Costing / Calculated',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['variable_cost_per_unit >= 0']
  },
  {
    parameterId: 'net_annual_cashflow',
    name: 'Net Annual Operating Cash Flow',
    description: 'Annual enterprise operating cash surplus available for capital recovery and debt service',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/year',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Cash Flow Projection / Bank Appraisal Standard',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['net_annual_cashflow >= 0']
  },
  {
    parameterId: 'cake_selling_price',
    name: 'Oil Cake Byproduct Realization Price',
    description: 'Market realization per kg of high-protein oil press cake (khali)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR/kg',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Feed Market / ICAR-DRMR Price Benchmark',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['cake_selling_price >= 0']
  },
  {
    parameterId: 'wheat_input',
    name: 'Wheat Grain Intake Quantity',
    description: 'Weight of cleaned wheat grain fed into flour mill',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Weighbridge Intake / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['wheat_input >= 0']
  },
  {
    parameterId: 'flour_recovery_rate',
    name: 'Flour Recovery Rate %',
    description: 'Extraction percentage of whole wheat flour from cleaned wheat',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 80,
    maximum: 98,
    source: 'NABARD Model Bankable Project on Mini Flour Mill',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['flour_recovery_rate >= 80', 'flour_recovery_rate <= 98']
  },
  {
    parameterId: 'bran_recovery_rate',
    name: 'Wheat Bran Recovery Rate %',
    description: 'Extraction percentage of wheat bran (chokar) from cleaned wheat',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 15,
    source: 'NABARD Model Bankable Project on Mini Flour Mill',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['bran_recovery_rate >= 0', 'bran_recovery_rate <= 15']
  },
  {
    parameterId: 'processing_loss_rate',
    name: 'Milling Processing Loss Rate %',
    description: 'Percentage loss of weight due to moisture variation and fine dusting',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 10,
    source: 'CSIR-CFTRI Stone Milling Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['processing_loss_rate >= 0', 'processing_loss_rate <= 10']
  },
  {
    parameterId: 'paddy_input',
    name: 'Raw Paddy Intake Quantity',
    description: 'Weight of raw cleaned paddy fed into rice mill',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Intake Weighbridge / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['paddy_input >= 0']
  },
  {
    parameterId: 'milling_recovery_rate',
    name: 'Rice Milling Out-Turn Ratio %',
    description: 'Total milled rice recovery percentage from raw paddy',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 60,
    maximum: 72,
    source: 'DFPD Statutory Custom Milling Norms',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['milling_recovery_rate >= 60', 'milling_recovery_rate <= 72']
  },
  {
    parameterId: 'husk_recovery_rate',
    name: 'Rice Husk Byproduct Recovery Rate %',
    description: 'De-husking biomass husk recovery percentage from raw paddy',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 15,
    maximum: 25,
    source: 'CSIR-CFTRI Rice Milling Engineering Norms',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['husk_recovery_rate >= 15', 'husk_recovery_rate <= 25']
  },
  {
    parameterId: 'broken_rice_recovery_rate',
    name: 'Broken Rice Byproduct Recovery Rate %',
    description: 'Broken rice separated during grading and sizing',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 25,
    source: 'DFPD Rice Specification / CSIR-CFTRI Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['broken_rice_recovery_rate >= 0', 'broken_rice_recovery_rate <= 25']
  },
  {
    parameterId: 'head_rice_recovery_rate',
    name: 'Head Rice (Whole Grain) Recovery Rate %',
    description: 'Full whole kernel polished rice recovery percentage from raw paddy',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 40,
    maximum: 65,
    source: 'CSIR-CFTRI Rice Milling Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['head_rice_recovery_rate >= 40', 'head_rice_recovery_rate <= 65']
  },
  {
    parameterId: 'raw_pulse_input',
    name: 'Whole Raw Pulse Intake Quantity',
    description: 'Weight of raw whole pulse (chana, tur, moong) fed into dal mill',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Intake Weighbridge / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['raw_pulse_input >= 0']
  },
  {
    parameterId: 'dal_recovery_rate',
    name: 'Split Dehulled Dal Recovery Rate %',
    description: 'Primary saleable split dal recovery percentage from whole raw pulse',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 65,
    maximum: 80,
    source: 'CSIR-CFTRI Mini Dal Mill Technology Guidelines',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['dal_recovery_rate >= 65', 'dal_recovery_rate <= 80']
  },
  {
    parameterId: 'chuni_husk_recovery_rate',
    name: 'Pulse Chuni & Husk Byproduct Recovery Rate %',
    description: 'High-protein cattle feed byproduct recovery fraction from pulse dehulling',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 15,
    maximum: 30,
    source: 'CSIR-CFTRI Mini Dal Mill Guidelines',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['chuni_husk_recovery_rate >= 15', 'chuni_husk_recovery_rate <= 30']
  },
  {
    parameterId: 'seed_input',
    name: 'Cleaned Oilseed Intake Quantity',
    description: 'Weight of cleaned mustard / groundnut seed fed into oil expeller',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Weighbridge Intake / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['seed_input >= 0']
  },
  {
    parameterId: 'oil_recovery_rate',
    name: 'Mechanical Oil Recovery Rate %',
    description: 'Raw filtered edible oil extraction percentage from seed intake',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 15,
    maximum: 50,
    source: 'ICAR-DRMR Mechanical Expelling Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['oil_recovery_rate >= 15', 'oil_recovery_rate <= 50']
  },
  {
    parameterId: 'oil_cake_recovery_rate',
    name: 'Oil Cake (Khali) Byproduct Recovery Rate %',
    description: 'De-oiled press cake byproduct recovery percentage from seed intake',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 45,
    maximum: 80,
    source: 'ICAR-DRMR / NABARD Oil Expeller Profile',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['oil_cake_recovery_rate >= 45', 'oil_cake_recovery_rate <= 80']
  },
  {
    parameterId: 'raw_spice_input',
    name: 'Cleaned Raw Whole Spice Intake Quantity',
    description: 'Weight of cleaned dry spice berries/rhizomes fed into pulverizer',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Intake Weighbridge / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['raw_spice_input >= 0']
  },
  {
    parameterId: 'spice_recovery_rate',
    name: 'Spice Powder Recovery Rate %',
    description: 'Fine ground spice powder recovery percentage from cleaned raw spice intake',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 90,
    maximum: 98,
    source: 'Spices Board India / CSIR-CFTRI Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['spice_recovery_rate >= 90', 'spice_recovery_rate <= 98']
  },
  {
    parameterId: 'raw_material_required',
    name: 'Required Raw Material Intake Quantity',
    description: 'Calculated gross raw material required to achieve target finished output',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Calculated from Target Output & Effective Yield',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['raw_material_required >= 0']
  },
  {
    parameterId: 'broken_rice_output',
    name: 'Broken Rice Byproduct Quantity',
    description: 'Quantity of broken rice byproduct separated during milling',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Calculated from Paddy Intake & Broken Rice Ratio',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['broken_rice_output >= 0']
  },
  {
    parameterId: 'head_rice_output',
    name: 'Whole Head Rice Primary Product Quantity',
    description: 'Quantity of premium whole kernel head rice produced',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Calculated from Paddy Intake & Head Rice Ratio',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['head_rice_output >= 0']
  },
  {
    parameterId: 'flour_milling_loss',
    name: 'Flour Milling Processing & Handling Loss',
    description: 'Physical weight loss during wheat cleaning, destoning, and milling',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Calculated from Wheat Input & Milling Loss Rate',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['flour_milling_loss >= 0']
  },
  {
    parameterId: 'oil_cake_value',
    name: 'Total Oil Cake Byproduct Commercial Realization',
    description: 'Total revenue generated from sale of residual oil press cake (khali)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'INR',
    currency: 'INR',
    required: false,
    minimum: 0,
    source: 'Calculated from Oil Cake Quantity & Selling Price',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['oil_cake_value >= 0']
  },
  {
    parameterId: 'initial_fruit_weight',
    name: 'Initial Fresh Fruit Intake Weight',
    description: 'Gross weight of fresh sliced/prepared fruit for dehydration processing',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Weighbridge Intake / User Input',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.USER_INPUT,
    userInputAllowed: true,
    validationRules: ['initial_fruit_weight >= 0']
  },
  {
    parameterId: 'mass_transfer_rate',
    name: 'Osmotic Mass Transfer Water Removal Rate %',
    description: 'Percentage of water removed from fruit tissue during osmotic soak',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 80,
    source: 'CSIR-CFTRI Fruit Technology Standards',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.ESTIMATE,
    userInputAllowed: true,
    validationRules: ['mass_transfer_rate >= 0', 'mass_transfer_rate <= 80']
  },
  {
    parameterId: 'water_loss_weight',
    name: 'Osmotic Water Loss Weight',
    description: 'Weight of moisture extracted from fruit during osmosis',
    dataType: DATA_TYPES.NUMBER,
    unit: 'kg',
    currency: null,
    required: false,
    minimum: 0,
    source: 'Calculated from Initial Weight & Mass Transfer Rate',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['water_loss_weight >= 0']
  },
  {
    parameterId: 'die_diameter',
    name: 'Extruder Die Orifice Diameter',
    description: 'Internal bore diameter of snack food extruder die plate',
    dataType: DATA_TYPES.NUMBER,
    unit: 'mm',
    currency: null,
    required: false,
    minimum: 0.5,
    maximum: 25,
    source: 'Extruder OEM Machine Tooling Spec',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['die_diameter >= 0.5', 'die_diameter <= 25']
  },
  {
    parameterId: 'expansion_factor',
    name: 'Snack HTST Radial Expansion Factor',
    description: 'Volumetric expansion ratio of cooked starch collet upon exiting die',
    dataType: DATA_TYPES.NUMBER,
    unit: 'ratio',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 10,
    source: 'Food Rheology Pilot Data',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.ESTIMATE,
    userInputAllowed: true,
    validationRules: ['expansion_factor >= 1', 'expansion_factor <= 10']
  },
  {
    parameterId: 'collet_diameter',
    name: 'Expanded Snack Collet Product Diameter',
    description: 'Final expanded diameter of puffed namkeen snack',
    dataType: DATA_TYPES.NUMBER,
    unit: 'mm',
    currency: null,
    required: false,
    minimum: 1,
    maximum: 100,
    source: 'Calculated / Finished Snack SKU Spec',
    sourceDate: '2024-2026',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['collet_diameter >= 1', 'collet_diameter <= 100']
  },
  {
    parameterId: 'initial_oil_pct',
    name: 'Initial Oil Content in Seed/Cake %',
    description: 'Percentage oil content of press cake prior to solvent extraction',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 50,
    source: 'Laboratory Soxhlet Test / SEA Norms',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.VERIFIED_DATA,
    userInputAllowed: true,
    validationRules: ['initial_oil_pct >= 0', 'initial_oil_pct <= 50']
  },
  {
    parameterId: 'retention_factor',
    name: 'Hexane Extraction Cake Retention Ratio',
    description: 'Fraction of bound lipid remaining unextracted after wash cycle',
    dataType: DATA_TYPES.NUMBER,
    unit: 'ratio',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 1,
    source: 'Solvent Plant Kinetic Benchmark',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.ESTIMATE,
    userInputAllowed: true,
    validationRules: ['retention_factor >= 0', 'retention_factor <= 1']
  },
  {
    parameterId: 'residual_oil_pct',
    name: 'Residual Oil in De-oiled Meal %',
    description: 'Percentage oil remaining in final de-oiled meal (DOC)',
    dataType: DATA_TYPES.NUMBER,
    unit: 'PERCENT',
    currency: null,
    required: false,
    minimum: 0,
    maximum: 5,
    source: 'Laboratory Analysis / BIS DOC Standard',
    sourceDate: '2024-01-01',
    dataStatus: DATA_STATUSES.CALCULATED,
    userInputAllowed: true,
    validationRules: ['residual_oil_pct >= 0', 'residual_oil_pct <= 5']
  }
];

/**
 * Validates a single parameter input against its schema definition
 * 
 * @param {string} parameterId
 * @param {*} value
 * @param {string} [unit]
 * @param {string} [currency]
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFoodTechParameter(parameterId, value, unit, currency) {
  const schema = FOODTECH_PARAMETERS.find(p => p.parameterId === parameterId);
  if (!schema) {
    return { valid: false, error: `Unknown parameterId: '${parameterId}'` };
  }

  if (value === undefined || value === null) {
    if (schema.required) {
      return { valid: false, error: `Required parameter '${parameterId}' is missing` };
    }
    return { valid: true };
  }

  // Type check
  if (schema.dataType === DATA_TYPES.NUMBER) {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `Parameter '${parameterId}' must be a valid number, got ${typeof value}` };
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      return { valid: false, error: `Parameter '${parameterId}' (${value}) is below minimum allowed bound (${schema.minimum})` };
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return { valid: false, error: `Parameter '${parameterId}' (${value}) exceeds maximum allowed bound (${schema.maximum})` };
    }
  }

  if (schema.dataType === DATA_TYPES.STRING) {
    if (typeof value !== 'string') {
      return { valid: false, error: `Parameter '${parameterId}' must be a string` };
    }
    if (schema.allowedValues && !schema.allowedValues.includes(value)) {
      return { valid: false, error: `Parameter '${parameterId}' value '${value}' is not among allowed: [${schema.allowedValues.join(', ')}]` };
    }
  }

  // Unit check if provided
  if (unit && schema.unit && unit !== schema.unit && schema.unit !== 'unit') {
    return { valid: false, error: `Unit mismatch for '${parameterId}': expected '${schema.unit}', received '${unit}'` };
  }

  // Currency check if provided
  if (currency) {
    const normCurrency = String(currency).toUpperCase().trim();
    if (schema.currency && normCurrency !== schema.currency) {
      return { valid: false, error: `Currency mismatch for '${parameterId}': expected '${schema.currency}', received '${currency}'` };
    }
    if (!schema.currency && normCurrency !== 'INR') {
      return { valid: false, error: `Unsupported currency '${currency}' for parameter '${parameterId}'. System standard is INR.` };
    }
  }

  return { valid: true };
}

module.exports = {
  FOODTECH_PARAMETERS,
  validateFoodTechParameter
};
