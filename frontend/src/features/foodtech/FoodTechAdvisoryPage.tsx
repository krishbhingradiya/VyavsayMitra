/**
 * VYAVSAYMITRA — FoodTech Advisory & Bankable DPR Page (Phase 3 Step 5)
 * 
 * Orchestrates the complete end-to-end user flow:
 * 1. Dynamic Model Selection
 * 2. Parameter Input & Validation
 * 3. Verified Institutional Advisory & Viability Dashboard
 */

import { useState } from 'react';
import { FoodTechModelSelector } from './FoodTechModelSelector';
import { FoodTechInputForm } from './FoodTechInputForm';
import { FoodTechDashboard } from './FoodTechDashboard';
import { foodtechApi, FoodTechApiError } from '../../api/foodtechApi';
import type { FoodTechModelSummary, FoodTechInputPayload, FoodTechAdvisoryResult } from '../../types/foodtech';
import './foodtech.css';

export default function FoodTechAdvisoryPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState<FoodTechModelSummary | null>(null);
  const [advisoryResult, setAdvisoryResult] = useState<FoodTechAdvisoryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [missingInputs, setMissingInputs] = useState<string[]>([]);

  const handleSelectModel = (model: FoodTechModelSummary) => {
    setSelectedModel(model);
    setServerError(null);
    setMissingInputs([]);
    setCurrentStep(2);
  };

  const handleSubmitParameters = async (payload: FoodTechInputPayload) => {
    setIsLoading(true);
    setServerError(null);
    setMissingInputs([]);

    try {
      const data = await foodtechApi.getAdvisory(payload);
      setAdvisoryResult(data);
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Advisory execution failed:', err);
      if (err instanceof FoodTechApiError) {
        setServerError(err.message);
        if (err.missingInputs && Array.isArray(err.missingInputs)) {
          setMissingInputs(err.missingInputs);
        }
      } else {
        setServerError(err.message || 'An unexpected error occurred while communicating with the advisory engine.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyInputs = () => {
    setCurrentStep(2);
  };

  const handleResetToCatalog = () => {
    setSelectedModel(null);
    setAdvisoryResult(null);
    setServerError(null);
    setMissingInputs([]);
    setCurrentStep(1);
  };

  return (
    <div className="foodtech-page page-enter">
      {/* Visual Step Wizard Progress Bar */}
      <div className="foodtech-steps">
        <div
          className={`foodtech-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setCurrentStep(1)}
          style={{ cursor: 'pointer' }}
        >
          <div className="foodtech-step-num">1</div>
          <span>Select Model</span>
        </div>

        <div className="foodtech-step-divider" />

        <div
          className={`foodtech-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => selectedModel && setCurrentStep(2)}
          style={{ cursor: selectedModel ? 'pointer' : 'not-allowed' }}
        >
          <div className="foodtech-step-num">2</div>
          <span>Configure Parameters</span>
        </div>

        <div className="foodtech-step-divider" />

        <div
          className={`foodtech-step-item ${currentStep === 3 ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => advisoryResult && setCurrentStep(3)}
          style={{ cursor: advisoryResult ? 'pointer' : 'not-allowed' }}
        >
          <div className="foodtech-step-num">3</div>
          <span>Advisory & DPR Analysis</span>
        </div>
      </div>

      {/* STEP 1: MODEL SELECTION */}
      {currentStep === 1 && (
        <FoodTechModelSelector
          selectedModelId={selectedModel?.businessId || null}
          onSelectModel={handleSelectModel}
        />
      )}

      {/* STEP 2: DYNAMIC INPUT FORM */}
      {currentStep === 2 && selectedModel && (
        <div>
          <div className="flex justify-between items-center flex-wrap gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <button className="btn btn--outline btn--sm" onClick={handleResetToCatalog}>
              ← Change Business Model
            </button>
            <span className="badge badge--green">
              Selected Model: {selectedModel.businessName}
            </span>
          </div>

          <FoodTechInputForm
            model={selectedModel}
            onSubmit={handleSubmitParameters}
            isLoading={isLoading}
            serverError={serverError}
            missingInputs={missingInputs}
          />
        </div>
      )}

      {/* STEP 3: ADVISORY DASHBOARD */}
      {currentStep === 3 && advisoryResult && (
        <FoodTechDashboard
          advisory={advisoryResult}
          onModifyInputs={handleModifyInputs}
        />
      )}
    </div>
  );
}
