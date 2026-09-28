/**
 * VYAVSAYMITRA — ACTION PLAN & EXECUTION SERVICE (PHASE 7)
 * 
 * Provides deterministic, data-grounded action planning, document readiness tracking,
 * real progress calculation, and bankability readiness assessment.
 * Zero fabricated metrics; all outputs are strictly derived from relational records.
 */

const dbRepository = require('../models/dbRepository');

const STANDARD_DOCUMENTS = {
  agriculture: [
    { document_type: 'identity_proof', document_name: 'Aadhaar Card / Photo ID', source: 'required', notes: 'Government photo identification' },
    { document_type: 'pan_card', document_name: 'PAN Card', source: 'required', notes: 'Permanent Account Number for banking & credit' },
    { document_type: 'land_record', document_name: '7/12 Extract / Land Record (RoR)', source: 'required', notes: 'Proof of agricultural land ownership or notarized lease deed' },
    { document_type: 'bank_statement', document_name: 'Bank Passbook / 6-Month Statement', source: 'required', notes: 'Active savings or KCC banking account' },
    { document_type: 'soil_card', document_name: 'Soil Health Card', source: 'optional', notes: 'Official NPK & micronutrient profile' },
    { document_type: 'kcc_application', document_name: 'Kisan Credit Card (KCC) Application', source: 'scheme_specific', notes: 'Subsidized interest rate crop loan application' }
  ],
  foodtech: [
    { document_type: 'identity_proof', document_name: 'Aadhaar Card / Photo ID', source: 'required', notes: 'Promoter identification' },
    { document_type: 'pan_card', document_name: 'PAN Card', source: 'required', notes: 'Business/promoter PAN' },
    { document_type: 'fssai_license', document_name: 'FSSAI Registration / License', source: 'required', notes: 'Mandatory statutory food safety compliance' },
    { document_type: 'udyam_reg', document_name: 'Udyam MSME Registration', source: 'required', notes: 'For priority sector lending and government subsidies' },
    { document_type: 'machinery_quotes', document_name: 'Machinery Vendor Quotations', source: 'required', notes: 'Itemized vendor quotes for capital expenditure' },
    { document_type: 'bank_statement', document_name: 'Bank Statement (6 Months)', source: 'required', notes: 'Current/savings banking history' },
    { document_type: 'electricity_noc', document_name: 'Industrial Power / Utility Sanction', source: 'optional', notes: 'Load sanction from electricity board' },
    { document_type: 'pcb_noc', document_name: 'Pollution Control Board (PCB) Exemption/NOC', source: 'optional', notes: 'White/green category processing clearance' }
  ]
};

class ActionPlanService {
  /**
   * Returns default document requirements for domain
   */
  getStandardDocumentTemplates(domain) {
    const d = (domain || 'agriculture').toLowerCase();
    return STANDARD_DOCUMENTS[d] || STANDARD_DOCUMENTS.agriculture;
  }

  /**
   * Initializes standard document checklist if none exist for business
   */
  async seedDefaultDocumentsIfEmpty(businessId, domain) {
    const existing = await dbRepository.listBusinessDocuments(businessId);
    if (existing && existing.length > 0) return existing;

    const templates = this.getStandardDocumentTemplates(domain);
    const created = [];
    for (const t of templates) {
      const doc = await dbRepository.upsertBusinessDocument(businessId, {
        document_name: t.document_name,
        document_type: t.document_type,
        status: 'missing',
        source: t.source,
        notes: t.notes
      });
      created.push(doc);
    }

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'DOCUMENTS_INITIALIZED',
      title: 'Document Checklist Initialized',
      description: `Initialized ${created.length} compliance and banking document requirements.`,
      metadata: { count: created.length }
    });

    return created;
  }

  /**
   * Deterministically generates recommended action tasks based on real business state
   */
  generateDeterministicTasks(business, inputs, latestAnalysis, marketObs, schemes) {
    const isAgri = (business.domain || '').toLowerCase() === 'agriculture';
    const hasAnalysis = Boolean(latestAnalysis && (latestAnalysis.status === 'ANALYSIS_COMPLETE' || latestAnalysis.status === 'SUCCESS'));
    const rawInputs = inputs?.raw_inputs || inputs?.inputs || inputs || {};
    const tasks = [];

    if (isAgri) {
      if (!rawInputs.crop_type && !rawInputs.land_size) {
        tasks.push({
          title: 'Complete Agricultural Baseline Inputs',
          description: 'Specify your land holding, primary crop selection, soil category, and irrigation source.',
          category: 'operations',
          priority: 'high',
          status: 'pending',
          source: 'system'
        });
      } else {
        tasks.push({
          title: 'Soil Testing & Field Preparation',
          description: 'Conduct comprehensive soil nutrient analysis before sowing to optimize fertilizer dosage.',
          category: 'operations',
          priority: 'medium',
          status: 'pending',
          source: 'system'
        });
        tasks.push({
          title: 'Irrigation & Water Management Plan',
          description: 'Inspect pump sets and drip/sprinkler lines for optimal water distribution efficiency.',
          category: 'operations',
          priority: 'medium',
          status: 'pending',
          source: 'system'
        });
      }

      if (hasAnalysis) {
        if ((latestAnalysis.bank_loan_requirement || 0) > 0) {
          tasks.push({
            title: 'Apply for Kisan Credit Card (KCC) Crop Loan',
            description: `Submit bank application for working capital financing of ₹${Math.round(latestAnalysis.bank_loan_requirement).toLocaleString('en-IN')}.`,
            category: 'finance',
            priority: 'high',
            status: 'pending',
            source: 'analysis'
          });
        }
        tasks.push({
          title: 'APMC Mandi & FPO Buyer Linkage',
          description: 'Identify certified local APMC mandis and Farmer Producer Organizations for scheduled harvest off-take.',
          category: 'marketing',
          priority: 'medium',
          status: 'pending',
          source: 'market'
        });
      }
    } else {
      // FoodTech
      if (!rawInputs.product_type && !rawInputs.processing_capacity) {
        tasks.push({
          title: 'Define Processing Line & Capacity Specifications',
          description: 'Select your end-product, rated hourly output capacity, and working shifts.',
          category: 'operations',
          priority: 'high',
          status: 'pending',
          source: 'system'
        });
      }

      tasks.push({
        title: 'Apply for FSSAI Basic/State Food Safety License',
        description: 'Mandatory statutory food registration required prior to commercial processing and retail packing.',
        category: 'regulatory',
        priority: 'high',
        status: 'pending',
        source: 'system'
      });

      tasks.push({
        title: 'Procure Itemized Machinery Quotations',
        description: 'Obtain commercial quotations and technical specifications from recognized equipment manufacturers.',
        category: 'procurement',
        priority: 'high',
        status: 'pending',
        source: 'system'
      });

      if (hasAnalysis) {
        tasks.push({
          title: 'Finalize Bankable DPR & Working Capital Structure',
          description: 'Review debt-service coverage ratio and structure promoter margin requirement.',
          category: 'finance',
          priority: 'high',
          status: 'pending',
          source: 'analysis'
        });
        tasks.push({
          title: 'Packaging & Brand Labeling Compliance',
          description: 'Design nutritional labels, expiry declarations, and batch coding according to legal metrology rules.',
          category: 'marketing',
          priority: 'medium',
          status: 'pending',
          source: 'system'
        });
      }
    }

    // Scheme-specific task
    if (schemes && schemes.length > 0) {
      const topScheme = schemes[0];
      tasks.push({
        title: `Submit Application for ${topScheme.scheme_name || topScheme.name || 'Statutory Scheme'}`,
        description: `Compile project documents to claim capital subsidy and interest subvention benefits.`,
        category: 'finance',
        priority: 'high',
        status: 'pending',
        source: 'scheme'
      });
    }

    // DPR task
    if (hasAnalysis) {
      tasks.push({
        title: 'Generate & Export Official Bankable DPR',
        description: 'Create an immutable versioned Detailed Project Report for bank appraisal and loan sanction.',
        category: 'finance',
        priority: 'high',
        status: 'pending',
        source: 'dpr'
      });
    }

    return tasks;
  }

  /**
   * Initializes action plan tasks if none exist
   */
  async seedActionTasksIfEmpty(business, inputs, latestAnalysis, marketObs, schemes) {
    const existing = await dbRepository.listActionTasks(business.id);
    if (existing && existing.length > 0) return existing;

    const suggested = this.generateDeterministicTasks(business, inputs, latestAnalysis, marketObs, schemes);
    const created = [];
    for (const t of suggested) {
      const item = await dbRepository.createActionTask(business.id, t);
      created.push(item);
    }

    await dbRepository.createTimelineEvent(business.id, {
      eventType: 'ACTION_PLAN_GENERATED',
      title: 'Dynamic Action Plan Generated',
      description: `Generated ${created.length} execution milestones tailored to your business profile.`,
      metadata: { count: created.length }
    });

    return created;
  }

  /**
   * Calculates dynamic execution progress and bankability readiness strictly from state
   */
  calculateProgress({ business, inputs, analysis, documents, tasks, dprVersions, schemes, marketObs }) {
    // 1. Business Setup: 100% if business exists with domain and location
    const setupScore = (business && business.name && business.domain) ? 100 : 50;

    // 2. Operational Inputs
    const raw = inputs?.raw_inputs || inputs?.inputs || inputs || {};
    const isAgri = (business?.domain || '').toLowerCase() === 'agriculture';
    let inputFieldsCount = 0;
    let filledFieldsCount = 0;

    if (isAgri) {
      const checkFields = ['crop_type', 'land_size', 'soil_type', 'irrigation_type'];
      inputFieldsCount = checkFields.length;
      filledFieldsCount = checkFields.filter(f => raw[f] !== undefined && raw[f] !== null && raw[f] !== '').length;
    } else {
      const checkFields = ['product_type', 'processing_capacity', 'raw_material_type', 'power_source'];
      inputFieldsCount = checkFields.length;
      filledFieldsCount = checkFields.filter(f => raw[f] !== undefined && raw[f] !== null && raw[f] !== '').length;
    }
    const inputsScore = inputFieldsCount > 0 ? Math.round((filledFieldsCount / inputFieldsCount) * 100) : 0;

    // 3. Financial Feasibility Analysis
    const hasAnalysis = Boolean(analysis && (analysis.status === 'ANALYSIS_COMPLETE' || analysis.status === 'SUCCESS'));
    const analysisScore = hasAnalysis ? 100 : 0;

    // 4. Market Intelligence
    const hasMarket = Boolean(marketObs && marketObs.length > 0);
    const marketScore = hasMarket ? 100 : 0;

    // 5. Statutory Schemes
    const hasSchemes = Boolean(schemes && schemes.length > 0);
    const schemesScore = hasSchemes ? 100 : 0;

    // 6. Documentation Readiness
    const totalDocs = documents?.length || 0;
    const providedDocs = (documents || []).filter(d => d.status === 'provided' || d.status === 'verified').length;
    const documentsScore = totalDocs > 0 ? Math.round((providedDocs / totalDocs) * 100) : 0;

    // 7. Action Tasks Execution
    const totalTasks = tasks?.length || 0;
    const completedTasks = (tasks || []).filter(t => t.status === 'completed').length;
    const tasksScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 8. DPR Generation
    const hasDpr = Boolean(dprVersions && dprVersions.length > 0);
    const dprScore = hasDpr ? 100 : 0;

    // Weighted Overall Progress Calculation
    // Setup: 10%, Inputs: 20%, Analysis: 25%, Market: 10%, Schemes: 10%, Docs: 15%, DPR: 10%
    const overallProgress = Math.round(
      (setupScore * 0.10) +
      (inputsScore * 0.20) +
      (analysisScore * 0.25) +
      (marketScore * 0.10) +
      (schemesScore * 0.05) +
      (documentsScore * 0.15) +
      (dprScore * 0.10) +
      (tasksScore * 0.05)
    );

    // Readiness Assessment
    const dscr = analysis?.dscr !== undefined ? Number(analysis.dscr) : 0;
    const bankLoanReady = Boolean(
      hasAnalysis &&
      dscr >= 1.15 &&
      hasDpr &&
      providedDocs >= 2
    );

    const schemeEligible = Boolean(hasSchemes);

    const requiredDocs = (documents || []).filter(d => d.source === 'required');
    const regulatoryReady = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'provided' || d.status === 'verified');

    // Human-readable next milestone recommendation
    let nextMilestone = 'Complete business inputs to calculate feasibility.';
    if (!hasAnalysis) {
      nextMilestone = 'Run financial feasibility analysis to assess project viability.';
    } else if (!hasDpr) {
      nextMilestone = 'Generate bankable Detailed Project Report (DPR v1).';
    } else if (!regulatoryReady) {
      nextMilestone = 'Upload and verify remaining mandatory KYC & compliance documents.';
    } else if (completedTasks < totalTasks) {
      nextMilestone = 'Execute remaining action plan tasks for operational launch.';
    } else {
      nextMilestone = 'All prerequisites met! Submit DPR to financing institution.';
    }

    return {
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
      breakdown: {
        setup: { score: setupScore, complete: setupScore === 100, label: 'Business Profile & Setup' },
        inputs: { score: inputsScore, complete: inputsScore >= 100, label: 'Operational Inputs', fieldsCompleted: filledFieldsCount, totalFields: inputFieldsCount },
        analysis: { score: analysisScore, complete: hasAnalysis, label: 'Feasibility Analysis' },
        market: { score: marketScore, complete: hasMarket, label: 'Market Research' },
        schemes: { score: schemesScore, complete: hasSchemes, label: 'Statutory Schemes' },
        documents: { score: documentsScore, complete: documentsScore === 100, label: 'Document Readiness', provided: providedDocs, total: totalDocs },
        dpr: { score: dprScore, complete: hasDpr, label: 'Bankable DPR Generation', versionsCount: dprVersions?.length || 0 },
        execution: { score: tasksScore, complete: tasksScore === 100, label: 'Action Plan Tasks', completed: completedTasks, total: totalTasks }
      },
      readiness: {
        bankLoanReady,
        schemeEligible,
        regulatoryReady,
        dscr: hasAnalysis ? dscr : null,
        nextMilestone
      }
    };
  }
}

module.exports = new ActionPlanService();
