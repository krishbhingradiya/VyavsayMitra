/**
 * VYAVSAYMITRA — Start New Business Wizard (Phase 3)
 * 
 * Dynamic, domain-specific onboarding for rural micro-entrepreneurs:
 * Step 1: Sector ("What do you want to start?" — Agriculture vs FoodTech)
 * Step 2: Business Basics & Archetype Selection
 * Step 3: Location & Rural Catchment
 * Step 4: Domain-Specific Operational Parameters
 * Step 5: Capital & Financials
 * Step 6: Professional Review & Creation
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import { useUIStore } from '../../store/useUIStore';
import type { BusinessDomain } from '../../types/business';
import {
  Sprout,
  Factory,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Wheat,
} from 'lucide-react';
import './StartNewBusinessWizard.css';

// Pre-defined agronomic crop archetypes
const AGRI_CROPS = [
  { name: 'Wheat', category: 'Cereals', season: 'Rabi', duration: '120 days', water: 'Medium', defaultYield: 18 },
  { name: 'Mustard', category: 'Oilseeds', season: 'Rabi', duration: '105 days', water: 'Low', defaultYield: 8 },
  { name: 'Cotton', category: 'Commercial / Cash Crop', season: 'Kharif', duration: '160 days', water: 'Medium', defaultYield: 10 },
  { name: 'Paddy (Rice)', category: 'Cereals', season: 'Kharif', duration: '130 days', water: 'High', defaultYield: 22 },
  { name: 'Soyabean', category: 'Oilseeds', season: 'Kharif', duration: '95 days', water: 'Low-Medium', defaultYield: 9 },
  { name: 'Groundnut', category: 'Oilseeds', season: 'Kharif', duration: '110 days', water: 'Medium', defaultYield: 11 },
  { name: 'Gram (Chana)', category: 'Pulses', season: 'Rabi', duration: '100 days', water: 'Low', defaultYield: 7 },
  { name: 'Maize', category: 'Cereals', season: 'Kharif', duration: '100 days', water: 'Medium', defaultYield: 20 },
];

// Pre-defined foodtech processing models
const DEFAULT_FOODTECH_MODELS: Array<{
  businessId: string;
  name: string;
  rawMaterial: string;
  product: string;
  capacityDefault: number;
  priceDefault: number;
  desc: string;
}> = [
  {
    businessId: 'FOODTECH_FLOUR_MILL',
    name: 'Mini Flour Mill (Atta Chakki)',
    rawMaterial: 'Food Grains (Wheat / Maize)',
    product: 'Whole Wheat Flour (Atta) & Bran',
    capacityDefault: 500,
    priceDefault: 36,
    desc: 'Local micro-milling unit with high daily retail consumer turnover and byproduct sales.',
  },
  {
    businessId: 'FOODTECH_OIL_EXPELLER',
    name: 'Cold-Pressed Oil Expeller Unit',
    rawMaterial: 'Mustard / Groundnut Oilseeds',
    product: 'Filtered Cold-Pressed Oil & Cattle Oilcake',
    capacityDefault: 400,
    priceDefault: 165,
    desc: 'Mechanical screw expeller extracting edible oils. Lucrative oilcake sold to local dairies.',
  },
  {
    businessId: 'FOODTECH_SPICE_GRINDING',
    name: 'Spice Grinding & Packaging Unit',
    rawMaterial: 'Whole Spices (Chili, Turmeric, Coriander)',
    product: 'Packaged Pure Ground Spices',
    capacityDefault: 150,
    priceDefault: 240,
    desc: 'Hygienic pulverizing and retail packet sealing with high value-addition margins.',
  },
  {
    businessId: 'FOODTECH_RICE_PROCESSING',
    name: 'Mini Rice Mill & Polisher',
    rawMaterial: 'Paddy Rice',
    product: 'Milled Rice & Rice Bran',
    capacityDefault: 800,
    priceDefault: 42,
    desc: 'Paddy de-husking and polishing unit with steady procurement from local farmers.',
  },
  {
    businessId: 'FOODTECH_DAL_PROCESSING',
    name: 'Dal Processing & Splitting Mill',
    rawMaterial: 'Raw Pulses (Gram, Toor, Moong)',
    product: 'Cleaned, De-husked & Split Pulses',
    capacityDefault: 500,
    priceDefault: 95,
    desc: 'De-husking, splitting, and grading unit serving regional grocery wholesale and retail.',
  },
  {
    businessId: 'FOODTECH_TOMATO_PROCESSING',
    name: 'Tomato Puree & Sauce Unit',
    rawMaterial: 'Fresh Tomatoes',
    product: 'Concentrated Tomato Puree & Paste',
    capacityDefault: 300,
    priceDefault: 85,
    desc: 'Season surplus preservation preventing farmgate distress sales.',
  },
];

export default function StartNewBusinessWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const createBusiness = useBusinessStore((s) => s.createBusiness);
  const runAnalysis = useBusinessStore((s) => s.runAnalysis);
  const addToast = useUIStore((s) => s.addToast);

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Core Entity State
  const [domain, setDomain] = useState<BusinessDomain | null>(null);
  const [businessName, setBusinessName] = useState<string>('');

  // Location State
  const [location, setLocation] = useState({
    state: user?.location?.state || 'Gujarat',
    district: user?.location?.district || 'Anand',
    taluka: user?.location?.block || 'Anand',
    village: user?.location?.village || 'Changa',
    is_rural: true,
  });

  // Agriculture Domain Inputs
  const [agriInputs, setAgriInputs] = useState({
    crop: 'Wheat',
    cropCategory: 'Cereals',
    farmingModel: 'Open Field Commercial',
    season: 'Rabi',
    area: 5,
    areaUnit: 'acre',
    irrigationAvailable: true,
    irrigationType: 'Tube Well / Borewell',
    expectedYieldPerAcre: 18,
    experienceLevel: 'Intermediate (3–5 years)',
    existingEquipment: 'Tractor & basic implements available',
    sellingChannel: 'Local Mandi (APMC)',
  });

  // FoodTech Domain Inputs
  const [selectedFoodtechModel, setSelectedFoodtechModel] = useState<string>('FOODTECH_FLOUR_MILL');
  const [foodtechInputs, setFoodtechInputs] = useState({
    rawMaterial: 'Food Grains (Wheat / Maize)',
    finishedProduct: 'Whole Wheat Flour (Atta)',
    raw_material_quantity: 500,
    daily_working_hours: 8,
    working_days_per_month: 26,
    expected_utilization_pct: 85,
    selling_price: 36,
    machineryRequirement: 'New Semi-Automatic Unit',
    existingMachinery: 'None (Fresh Startup)',
    three_phase_power: true,
    land_status: 'owned',
  });

  // Capital & Financial State
  const [availableCapital, setAvailableCapital] = useState<number>(user?.capital || 150000);
  const [expectedInvestment, setExpectedInvestment] = useState<number>(0);
  const [workingCapitalType, setWorkingCapitalType] = useState<string>('Bank Cash Credit / Overdraft');
  const [existingInfrastructure, setExistingInfrastructure] = useState<string>('Own land / premises available');

  // Parse URL search parameters (e.g. from "Explore Business Ideas" cards)
  useEffect(() => {
    const urlDomain = searchParams.get('domain');
    const urlType = searchParams.get('type');
    const urlCrop = searchParams.get('crop');

    if (urlDomain === 'agriculture' || urlDomain === 'foodtech') {
      setDomain(urlDomain);
      if (urlDomain === 'agriculture') {
        if (urlCrop) {
          const matchedCrop = AGRI_CROPS.find((c) => c.name.toLowerCase() === urlCrop.toLowerCase());
          if (matchedCrop) {
            setAgriInputs((prev) => ({
              ...prev,
              crop: matchedCrop.name,
              cropCategory: matchedCrop.category,
              season: matchedCrop.season,
              expectedYieldPerAcre: matchedCrop.defaultYield,
            }));
            setBusinessName(`${matchedCrop.name} Cultivation Enterprise`);
          } else {
            setAgriInputs((prev) => ({ ...prev, crop: urlCrop }));
            setBusinessName(`${urlCrop} Cultivation Enterprise`);
          }
        } else {
          setBusinessName('Wheat Cultivation Enterprise');
        }
        setStep(2);
      } else if (urlDomain === 'foodtech') {
        const ftType = urlType || 'FOODTECH_FLOUR_MILL';
        setSelectedFoodtechModel(ftType);
        const foundDef = DEFAULT_FOODTECH_MODELS.find((m) => m.businessId === ftType);
        if (foundDef) {
          setFoodtechInputs((prev) => ({
            ...prev,
            rawMaterial: foundDef.rawMaterial,
            finishedProduct: foundDef.product,
            raw_material_quantity: foundDef.capacityDefault,
            selling_price: foundDef.priceDefault,
          }));
          setBusinessName(foundDef.name);
        } else {
          setBusinessName('FoodTech Agro-Processing Unit');
        }
        setStep(2);
      }
    }
  }, [searchParams]);

  // Auto-fill business name when crop or model changes if not manually customized
  const handleCropSelect = (cropName: string) => {
    const found = AGRI_CROPS.find((c) => c.name === cropName);
    if (found) {
      setAgriInputs({
        ...agriInputs,
        crop: found.name,
        cropCategory: found.category,
        season: found.season,
        expectedYieldPerAcre: found.defaultYield,
      });
      setBusinessName(`${found.name} Farming Enterprise`);
    }
  };

  const handleFoodtechModelSelect = (modelId: string) => {
    setSelectedFoodtechModel(modelId);
    const found = DEFAULT_FOODTECH_MODELS.find((m) => m.businessId === modelId);
    if (found) {
      setFoodtechInputs((prev) => ({
        ...prev,
        rawMaterial: found.rawMaterial,
        finishedProduct: found.product,
        raw_material_quantity: found.capacityDefault,
        selling_price: found.priceDefault,
      }));
      setBusinessName(found.name);
    }
  };

  const handleDomainCardClick = (selected: BusinessDomain) => {
    setDomain(selected);
    if (selected === 'agriculture') {
      setBusinessName(`${agriInputs.crop} Farming Enterprise`);
    } else {
      const found = DEFAULT_FOODTECH_MODELS.find((m) => m.businessId === selectedFoodtechModel);
      setBusinessName(found ? found.name : 'Agro-Processing Unit');
    }
  };

  const handleConfirmDomain = (selected: BusinessDomain, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDomain(selected);
    if (selected === 'agriculture') {
      setBusinessName(`${agriInputs.crop} Farming Enterprise`);
    } else {
      const found = DEFAULT_FOODTECH_MODELS.find((m) => m.businessId === selectedFoodtechModel);
      setBusinessName(found ? found.name : 'Agro-Processing Unit');
    }
    setStep(2);
  };

  const handleCompleteWizard = async () => {
    if (!businessName.trim()) {
      addToast('Please enter a business name.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeDomain: BusinessDomain = domain || 'agriculture';
      const inputs =
        activeDomain === 'agriculture'
          ? {
              ...agriInputs,
              capitalAvailable: availableCapital,
              expectedInvestment: expectedInvestment || availableCapital * 3,
              workingCapitalType,
              existingInfrastructure,
              state: location.state,
              district: location.district,
              taluka: location.taluka,
              village: location.village,
              isRural: location.is_rural,
            }
          : {
              ...foodtechInputs,
              businessId: selectedFoodtechModel,
              capitalAvailable: availableCapital,
              expectedInvestment: expectedInvestment || availableCapital * 3,
              workingCapitalType,
              existingInfrastructure,
              state: location.state,
              district: location.district,
              taluka: location.taluka,
              village: location.village,
              isRural: location.is_rural,
            };

      // 1. Create Business (Guaranteed independent record with UUID, never overwriting existing businesses)
      const newBiz = await createBusiness({
        name: businessName.trim(),
        domain: activeDomain,
        business_type: activeDomain === 'agriculture' ? agriInputs.crop : selectedFoodtechModel,
        location,
        inputs,
      });

      addToast(`Business "${newBiz.name}" created! Running bankable feasibility analysis...`, 'success');

      // 2. Run instant analysis on the newly created business
      try {
        await runAnalysis(newBiz.id, inputs);
      } catch (anlErr: any) {
        console.warn('[WIZARD] Analysis execution notice:', anlErr.message);
      }

      // 3. Navigate directly to the independent business workspace
      navigate(`/businesses/${newBiz.id}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to create business.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wizard-page page-enter">
      {/* Header */}
      <div className="wizard-header">
        <div className="wizard-header__badge">
          <Sparkles size={14} /> Guided Rural Enterprise Onboarding
        </div>
        <h1 className="wizard-header__title">Start Your Rural Enterprise</h1>
        <p className="wizard-header__desc">
          Answer only the questions required for your chosen sector to compute bankable feasibility, AGMARKNET market selling rates, and matching government subsidies.
        </p>
      </div>

      {/* Progressive Step Navigation Indicator */}
      <div className="wizard-steps-nav">
        {[
          { num: 1, label: 'Sector' },
          { num: 2, label: 'Business Type' },
          { num: 3, label: 'Location' },
          { num: 4, label: 'Operations' },
          { num: 5, label: 'Investment' },
          { num: 6, label: 'Review' },
        ].map((s) => (
          <div
            key={s.num}
            className={`wizard-step-pill ${step === s.num ? 'active' : ''} ${
              step > s.num ? 'completed' : ''
            }`}
            onClick={() => step > s.num && setStep(s.num)}
          >
            <div className="wizard-step-circle">
              {step > s.num ? <CheckCircle2 size={13} /> : s.num}
            </div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="wizard-card card">
        {/* ── STEP 1: DOMAIN / SECTOR SELECTION ────────────────── */}
        {step === 1 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">What do you want to start?</h2>
            <p className="wizard-step-subheading">
              Select one sector. Only questions relevant to your choice will be asked.
            </p>

            <div className="grid grid-2 wizard-domain-grid">
              {/* Agriculture Card */}
              <div
                className={`wizard-domain-card ${domain !== null && domain === 'agriculture' ? 'selected' : ''}`}
                onClick={() => handleDomainCardClick('agriculture')}
              >
                <div className="wizard-domain-icon green">
                  <Sprout size={36} />
                </div>
                <div className="wizard-domain-body">
                  <div className="flex items-center gap-2">
                    <h3 className="wizard-domain-title">🌾 Agriculture</h3>
                    <span className="badge badge--green">Crops & Mandi</span>
                  </div>
                  <p className="wizard-domain-text">
                    Food cultivation, farming and agricultural activities. Computes cost of cultivation, regional APMC prices, and Kisan Credit Card loan eligibility.
                  </p>
                  <ul className="wizard-domain-features">
                    <li>✓ Directorate of Economics & Statistics benchmarks</li>
                    <li>✓ AGMARKNET live daily APMC wholesale prices</li>
                    <li>✓ KCC, PM-KISAN, and PMKSY subsidy matching</li>
                  </ul>
                  <button
                    type="button"
                    className="btn btn--green btn--block"
                    style={{ marginTop: '1.25rem' }}
                    onClick={(e) => handleConfirmDomain('agriculture', e)}
                  >
                    Select Agriculture <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* FoodTech / Agro-Processing Card */}
              <div
                className={`wizard-domain-card ${domain !== null && domain === 'foodtech' ? 'selected' : ''}`}
                onClick={() => handleDomainCardClick('foodtech')}
              >
                <div className="wizard-domain-icon saffron">
                  <Factory size={36} />
                </div>
                <div className="wizard-domain-body">
                  <div className="flex items-center gap-2">
                    <h3 className="wizard-domain-title">🏭 FoodTech / Agro-Processing</h3>
                    <span className="badge badge--warning">MoFPI & PMFME</span>
                  </div>
                  <p className="wizard-domain-text">
                    Processing, manufacturing and value-added food businesses. Computes machinery capex, operating surplus, break-even output, and PMFME capital subsidies.
                  </p>
                  <ul className="wizard-domain-features">
                    <li>✓ Physical transformation & output recovery analysis</li>
                    <li>✓ Bankable Detailed Project Report (DPR) structuring</li>
                    <li>✓ PMFME 35% credit-linked capital subsidy</li>
                  </ul>
                  <button
                    type="button"
                    className="btn btn--saffron btn--block"
                    style={{ marginTop: '1.25rem' }}
                    onClick={(e) => handleConfirmDomain('foodtech', e)}
                  >
                    Select FoodTech <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {domain && (
              <div className="flex justify-end items-center mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={(e) => handleConfirmDomain(domain, e)}
                >
                  Continue to {domain === 'agriculture' ? 'Agriculture' : 'FoodTech'} Setup →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: BUSINESS BASICS & ARCHETYPE ──────────────── */}
        {step === 2 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">
              {domain === 'agriculture'
                ? 'Select your crop and farming model'
                : 'Select your food processing business model'}
            </h2>
            <p className="wizard-step-subheading">
              {domain === 'agriculture'
                ? 'Choose your primary crop to evaluate seasonal benchmarks and Mandi price trends.'
                : 'Select an institutional processing archetype to structure machine capex and production capacity.'}
            </p>

            {/* Business Title Input */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Business Enterprise Name</label>
              <input
                type="text"
                className="form-input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={
                  domain === 'agriculture'
                    ? 'e.g. Ramesh Wheat Cultivation'
                    : 'e.g. Ramesh Mini Flour Mill'
                }
              />
              <span className="text-xs text-muted">You can customize this enterprise name anytime.</span>
            </div>

            {domain === 'agriculture' ? (
              <>
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                  Select Primary Crop
                </label>
                <div className="grid grid-2" style={{ gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {AGRI_CROPS.map((crop) => (
                    <div
                      key={crop.name}
                      className={`wizard-option-card ${agriInputs.crop === crop.name ? 'selected' : ''}`}
                      onClick={() => handleCropSelect(crop.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wheat size={18} className="text-green" />
                          <strong>{crop.name}</strong>
                        </div>
                        <span className="badge badge--neutral">{crop.season}</span>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: '0.35rem' }}>
                        Category: {crop.category} · Duration: {crop.duration}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Crop Category</label>
                    <select
                      className="form-select"
                      value={agriInputs.cropCategory}
                      onChange={(e) => setAgriInputs({ ...agriInputs, cropCategory: e.target.value })}
                    >
                      <option value="Cereals">Cereals (Wheat, Rice, Maize)</option>
                      <option value="Oilseeds">Oilseeds (Mustard, Groundnut, Soyabean)</option>
                      <option value="Commercial / Cash Crop">Commercial / Cash Crop (Cotton, Sugarcane)</option>
                      <option value="Pulses">Pulses (Gram, Moong, Toor)</option>
                      <option value="Horticulture">Horticulture (Vegetables, Fruits)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Farming Model</label>
                    <select
                      className="form-select"
                      value={agriInputs.farmingModel}
                      onChange={(e) => setAgriInputs({ ...agriInputs, farmingModel: e.target.value })}
                    >
                      <option value="Open Field Commercial">Open Field Commercial Farming</option>
                      <option value="Organic / Natural Farming">Organic / Natural Farming (ZBNF)</option>
                      <option value="Contract Farming">Contract Farming with FPO / Aggregator</option>
                      <option value="High-Density Cultivation">High-Density Precision Farming</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                  Select Agro-Processing Archetype
                </label>
                <div className="grid grid-2" style={{ gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {DEFAULT_FOODTECH_MODELS.map((model) => (
                    <div
                      key={model.businessId}
                      className={`wizard-option-card ${
                        selectedFoodtechModel === model.businessId ? 'selected' : ''
                      }`}
                      onClick={() => handleFoodtechModelSelect(model.businessId)}
                    >
                      <div className="flex items-center justify-between">
                        <strong>{model.name}</strong>
                        <span className="badge badge--green">Verified</span>
                      </div>
                      <p className="text-xs text-muted" style={{ margin: '0.35rem 0' }}>
                        {model.desc}
                      </p>
                      <div className="text-xs text-muted">
                        Raw Material: <strong>{model.rawMaterial}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Key Raw Material</label>
                    <input
                      type="text"
                      className="form-input"
                      value={foodtechInputs.rawMaterial}
                      onChange={(e) => setFoodtechInputs({ ...foodtechInputs, rawMaterial: e.target.value })}
                      placeholder="e.g. Wheat grain, Oilseeds"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Finished Product</label>
                    <input
                      type="text"
                      className="form-input"
                      value={foodtechInputs.finishedProduct}
                      onChange={(e) =>
                        setFoodtechInputs({ ...foodtechInputs, finishedProduct: e.target.value })
                      }
                      placeholder="e.g. Whole Wheat Flour, Cold-Pressed Oil"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="wizard-actions">
              <button className="btn btn--outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>
                Next: Location <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: LOCATION & RURAL CLASSIFICATION ──────────── */}
        {step === 3 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">Where will your business be located?</h2>
            <p className="wizard-step-subheading">
              Location determines APMC Mandi market linkages and rural capital subsidy percentages.
            </p>

            <div className="grid grid-2" style={{ gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  value={location.state}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  placeholder="e.g. Gujarat"
                />
              </div>

              <div className="form-group">
                <label className="form-label">District</label>
                <input
                  type="text"
                  className="form-input"
                  value={location.district}
                  onChange={(e) => setLocation({ ...location, district: e.target.value })}
                  placeholder="e.g. Anand"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Taluka / Tehsil / Block</label>
                <input
                  type="text"
                  className="form-input"
                  value={location.taluka}
                  onChange={(e) => setLocation({ ...location, taluka: e.target.value })}
                  placeholder="e.g. Petlad / Anand"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Village / Town</label>
                <input
                  type="text"
                  className="form-input"
                  value={location.village}
                  onChange={(e) => setLocation({ ...location, village: e.target.value })}
                  placeholder="e.g. Changa"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Area Classification</label>
                <div className="flex gap-4" style={{ marginTop: '0.4rem' }}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_rural"
                      checked={location.is_rural}
                      onChange={() => setLocation({ ...location, is_rural: true })}
                    />
                    <span>Rural (Village) — Eligible for higher 25%–35% credit-linked subsidies</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_rural"
                      checked={!location.is_rural}
                      onChange={() => setLocation({ ...location, is_rural: false })}
                    />
                    <span>Semi-Urban / Municipal Town</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn btn--outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn--primary" onClick={() => setStep(4)}>
                Next: Operations <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: DOMAIN-SPECIFIC OPERATIONS ───────────────── */}
        {step === 4 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">
              Operational details for {businessName}
            </h2>
            <p className="wizard-step-subheading">
              Provide your operational parameters. Only questions required for your selected business are shown.
            </p>

            {domain === 'agriculture' ? (
              /* AGRICULTURE OPERATIONS */
              <div className="grid grid-2" style={{ gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Cultivation Land Area</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      className="form-input"
                      value={agriInputs.area}
                      onChange={(e) =>
                        setAgriInputs({ ...agriInputs, area: parseFloat(e.target.value) || 1 })
                      }
                    />
                    <select
                      className="form-select"
                      style={{ width: '130px' }}
                      value={agriInputs.areaUnit}
                      onChange={(e) => setAgriInputs({ ...agriInputs, areaUnit: e.target.value })}
                    >
                      <option value="acre">Acres</option>
                      <option value="hectare">Hectares</option>
                      <option value="bigha">Bighas</option>
                    </select>
                  </div>
                  <span className="text-xs text-muted">Standard family operational holding is 2 to 5 acres.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Sowing Season</label>
                  <select
                    className="form-select"
                    value={agriInputs.season}
                    onChange={(e) => setAgriInputs({ ...agriInputs, season: e.target.value })}
                  >
                    <option value="Rabi">Rabi (Winter Season: Oct – Mar)</option>
                    <option value="Kharif">Kharif (Monsoon Season: Jun – Oct)</option>
                    <option value="Zaid">Zaid (Summer Season: Mar – Jun)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Irrigation Facility & Source</label>
                  <select
                    className="form-select"
                    value={agriInputs.irrigationType}
                    onChange={(e) =>
                      setAgriInputs({ ...agriInputs, irrigationType: e.target.value })
                    }
                  >
                    <option value="Tube Well / Borewell">Tube Well / Borewell</option>
                    <option value="Canal Irrigation">Canal Irrigation</option>
                    <option value="Drip / Micro-Irrigation">Drip / Micro-Irrigation (PMKSY Subsidized)</option>
                    <option value="Rainfed">Rainfed (Dryland Agriculture)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Yield Target (Quintals / Acre)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    value={agriInputs.expectedYieldPerAcre}
                    onChange={(e) =>
                      setAgriInputs({
                        ...agriInputs,
                        expectedYieldPerAcre: parseFloat(e.target.value) || 1,
                      })
                    }
                  />
                  <span className="text-xs text-muted">Regional average benchmark is {agriInputs.expectedYieldPerAcre} Qtl/acre.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Farming Experience</label>
                  <select
                    className="form-select"
                    value={agriInputs.experienceLevel}
                    onChange={(e) =>
                      setAgriInputs({ ...agriInputs, experienceLevel: e.target.value })
                    }
                  >
                    <option value="Beginner (< 2 years)">Beginner (&lt; 2 years)</option>
                    <option value="Intermediate (3–5 years)">Intermediate (3–5 years)</option>
                    <option value="Experienced (> 5 years)">Experienced (&gt; 5 years)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Produce Selling Channel</label>
                  <select
                    className="form-select"
                    value={agriInputs.sellingChannel}
                    onChange={(e) =>
                      setAgriInputs({ ...agriInputs, sellingChannel: e.target.value })
                    }
                  >
                    <option value="Local Mandi (APMC)">Local Mandi (APMC Wholesale)</option>
                    <option value="Direct Village Trader">Direct Village Trader / Aggregator</option>
                    <option value="Farmer Producer Organization (FPO)">FPO Collective Procurement</option>
                    <option value="Direct to Retail Consumers">Direct to Local Consumers</option>
                  </select>
                </div>
              </div>
            ) : (
              /* FOODTECH OPERATIONS */
              <div className="grid grid-2" style={{ gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Daily Raw Material Processing Capacity (Kg/day)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    className="form-input"
                    value={foodtechInputs.raw_material_quantity}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        raw_material_quantity: parseFloat(e.target.value) || 100,
                      })
                    }
                  />
                  <span className="text-xs text-muted">Typical micro-enterprise capacity is 300–800 Kg/day.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Finished Product Selling Price (₹ / Kg)</label>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    className="form-input"
                    value={foodtechInputs.selling_price}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        selling_price: parseFloat(e.target.value) || 30,
                      })
                    }
                  />
                  <span className="text-xs text-muted">Current regional benchmark is ₹{foodtechInputs.selling_price}/Kg.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Operating Hours</label>
                  <select
                    className="form-select"
                    value={foodtechInputs.daily_working_hours}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        daily_working_hours: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    <option value={6}>6 Hours (Single Shift)</option>
                    <option value={8}>8 Hours (Standard Full Shift)</option>
                    <option value={12}>12 Hours (Seasonal Peak Shift)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Operating Days</label>
                  <select
                    className="form-select"
                    value={foodtechInputs.working_days_per_month}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        working_days_per_month: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    <option value={25}>25 Days / Month</option>
                    <option value={26}>26 Days / Month (Standard)</option>
                    <option value={30}>30 Days / Month (Continuous)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Machinery Status & Sourcing</label>
                  <select
                    className="form-select"
                    value={foodtechInputs.machineryRequirement}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        machineryRequirement: e.target.value,
                      })
                    }
                  >
                    <option value="New Semi-Automatic Unit">New Semi-Automatic Machinery (PMFME Eligible)</option>
                    <option value="Fully Automatic Commercial Unit">Fully Automatic Commercial Unit</option>
                    <option value="Upgrading Existing Equipment">Upgrading Existing Equipment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Electricity Connection</label>
                  <select
                    className="form-select"
                    value={foodtechInputs.three_phase_power ? 'yes' : 'no'}
                    onChange={(e) =>
                      setFoodtechInputs({
                        ...foodtechInputs,
                        three_phase_power: e.target.value === 'yes',
                      })
                    }
                  >
                    <option value="yes">Three-Phase Commercial Power Connected</option>
                    <option value="no">Single-Phase (Requires 3-Phase Power Sanction)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="wizard-actions">
              <button className="btn btn--outline" onClick={() => setStep(3)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn--primary" onClick={() => setStep(5)}>
                Next: Capital & Investment <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: CAPITAL & FINANCIALS ─────────────────────── */}
        {step === 5 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">Capital & Financial Capacity</h2>
            <p className="wizard-step-subheading">
              Specify your promoter equity margin to determine bank term loan and working capital credit limits.
            </p>

            <div className="grid grid-2" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Available Promoter Own Capital (₹)</label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  className="form-input"
                  value={availableCapital}
                  onChange={(e) => setAvailableCapital(parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-muted">
                  Banks require 10–15% promoter margin money for priority sector and rural credit.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Total Project Budget (₹)</label>
                <input
                  type="number"
                  min="50000"
                  step="25000"
                  className="form-input"
                  value={expectedInvestment || availableCapital * 3}
                  onChange={(e) => setExpectedInvestment(parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-muted">
                  Leave as estimated if you want the verified calculation engine to compute exact capex.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Working Capital Arrangement</label>
                <select
                  className="form-select"
                  value={workingCapitalType}
                  onChange={(e) => setWorkingCapitalType(e.target.value)}
                >
                  <option value="Bank Cash Credit / Overdraft">Bank Cash Credit / Overdraft Facility</option>
                  <option value="Kisan Credit Card (KCC)">Kisan Credit Card (KCC 4% Interest)</option>
                  <option value="Self-Funded from Promoter Capital">Self-Funded from Promoter Capital</option>
                  <option value="Mudra Shishu / Kishore Loan">Mudra Loan (Collateral-Free)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Existing Land & Civil Infrastructure</label>
                <select
                  className="form-select"
                  value={existingInfrastructure}
                  onChange={(e) => setExistingInfrastructure(e.target.value)}
                >
                  <option value="Own land / premises available">Own land / premises available</option>
                  <option value="Rented / Leased rural premises">Rented / Leased rural premises</option>
                  <option value="Panchayat / Co-op land allocated">Panchayat / Cooperative space allocated</option>
                </select>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn btn--outline" onClick={() => setStep(4)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn--primary" onClick={() => setStep(6)}>
                Next: Review Business <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: PROFESSIONAL REVIEW BEFORE CREATION ──────── */}
        {step === 6 && (
          <div className="wizard-step-content">
            <h2 className="wizard-step-heading">Review & Confirm Your Enterprise</h2>
            <p className="wizard-step-subheading">
              Verify your enterprise parameters before initializing your dedicated workspace and calculation runs.
            </p>

            <div
              className="card"
              style={{
                background: 'var(--color-surface-secondary)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="flex justify-between items-start flex-wrap gap-2" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <span className="text-xs text-muted block">Enterprise Name</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0' }}>
                    {businessName}
                  </h3>
                </div>
                <span
                  className={`badge ${
                    domain === 'agriculture' ? 'badge--green' : 'badge--warning'
                  } flex items-center gap-1`}
                >
                  {domain === 'agriculture' ? <Sprout size={13} /> : <Factory size={13} />}
                  {domain === 'agriculture' ? 'Agriculture' : 'FoodTech / Processing'}
                </span>
              </div>

              <div className="grid grid-3" style={{ gap: '1.25rem', fontSize: '0.85rem' }}>
                <div>
                  <span className="text-muted block text-xs">Sector & Model</span>
                  <strong>{domain === 'agriculture' ? agriInputs.crop : selectedFoodtechModel}</strong>
                  <div className="text-xs text-muted">
                    {domain === 'agriculture' ? agriInputs.farmingModel : foodtechInputs.machineryRequirement}
                  </div>
                </div>

                <div>
                  <span className="text-muted block text-xs">Enterprise Location</span>
                  <strong>
                    {location.village}, {location.district}
                  </strong>
                  <div className="text-xs text-muted">
                    {location.state} ({location.is_rural ? 'Rural' : 'Semi-Urban'})
                  </div>
                </div>

                <div>
                  <span className="text-muted block text-xs">Operational Scale</span>
                  <strong>
                    {domain === 'agriculture'
                      ? `${agriInputs.area} ${agriInputs.areaUnit}s`
                      : `${foodtechInputs.raw_material_quantity} Kg / day`}
                  </strong>
                  <div className="text-xs text-muted">
                    {domain === 'agriculture'
                      ? `${agriInputs.season} Season`
                      : `${foodtechInputs.daily_working_hours} hrs/day shift`}
                  </div>
                </div>

                <div>
                  <span className="text-muted block text-xs">Promoter Own Margin</span>
                  <strong className="text-green" style={{ fontSize: '1.05rem' }}>
                    ₹{availableCapital.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div>
                  <span className="text-muted block text-xs">Working Capital Plan</span>
                  <strong>{workingCapitalType}</strong>
                </div>

                <div>
                  <span className="text-muted block text-xs">Physical Premises</span>
                  <strong>{existingInfrastructure}</strong>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn btn--outline" onClick={() => setStep(5)} disabled={isSubmitting}>
                <ArrowLeft size={16} /> Edit Details
              </button>
              <button
                className="btn btn--green btn--lg"
                onClick={handleCompleteWizard}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Creating Enterprise & Calculating...'
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Create Business & Launch Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
