/**
 * VYAVSAYMITRA — FoodTech Model Selector (Phase 3 Step 5)
 * 
 * Dynamically queries GET /api/business/foodtech/models.
 * Never hardcodes the catalog.
 */

import React, { useEffect, useState } from 'react';
import {
  Wheat,
  CircleDot,
  Droplet,
  Flame,
  Layers,
  Building2,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { foodtechApi, FoodTechApiError } from '../../api/foodtechApi';
import type { FoodTechModelSummary } from '../../types/foodtech';

interface Props {
  selectedModelId: string | null;
  onSelectModel: (model: FoodTechModelSummary) => void;
}

// Icon helper by subcategory / archetype keyword
function getModelIcon(modelId: string, subcategory: string) {
  const id = modelId.toUpperCase();
  if (id.includes('FLOUR') || subcategory.toLowerCase().includes('grain')) {
    return <Wheat size={24} />;
  }
  if (id.includes('RICE')) {
    return <Layers size={24} />;
  }
  if (id.includes('PULSE') || id.includes('DAL')) {
    return <CircleDot size={24} />;
  }
  if (id.includes('OIL')) {
    return <Droplet size={24} />;
  }
  if (id.includes('SPICE')) {
    return <Flame size={24} />;
  }
  return <Building2 size={24} />;
}

export const FoodTechModelSelector: React.FC<Props> = ({
  selectedModelId,
  onSelectModel,
}) => {
  const [models, setModels] = useState<FoodTechModelSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await foodtechApi.getModels();
      setModels(data);
      // Auto-select first model if none selected
      if (!selectedModelId && data.length > 0) {
        onSelectModel(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch FoodTech models:', err);
      if (err instanceof FoodTechApiError) {
        setError(err.message);
      } else {
        setError('Unable to load institutional FoodTech models from the server. Please verify backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin text-color-primary" style={{ margin: '0 auto var(--space-3)' }} />
        <p className="text-sm font-semibold text-color-primary">Loading verified institutional FoodTech models...</p>
        <p className="text-xs text-muted">Retrieving statutory benchmarks from MoFPI, CSIR-CFTRI & NABARD registry.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-light)', padding: 'var(--space-6)' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
          <AlertCircle size={22} color="var(--color-error)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'bold', color: 'var(--color-error)' }}>
            Model Catalog Retrieval Failed
          </h3>
        </div>
        <p className="text-sm text-color-primary" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>
        <button className="btn btn--outline btn--sm" onClick={fetchModels}>
          <RefreshCw size={14} /> Retry Loading Models
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-2" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
            Select Institutional FoodTech Business Model
          </h2>
          <p className="text-xs text-muted">
            Choose from 5 nationally verified micro-processing models codified with statutory out-turn and recovery benchmarks.
          </p>
        </div>
        <span className="badge badge--green">
          {models.length} Models Available
        </span>
      </div>

      <div className="foodtech-model-grid">
        {models.map((model) => {
          const isSelected = selectedModelId === model.businessId;
          const sources = model.dataSources || [];
          const sourceTitles = sources.map((s) => s.organization || s.title).filter(Boolean);

          return (
            <div
              key={model.businessId}
              className={`foodtech-model-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectModel(model)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectModel(model);
                }
              }}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="foodtech-model-card__icon-wrap">
                    {getModelIcon(model.businessId, model.subcategory)}
                  </div>
                  {isSelected && (
                    <span className="badge badge--green flex items-center gap-1">
                      <CheckCircle size={12} /> Selected
                    </span>
                  )}
                </div>

                <div className="foodtech-model-card__title">{model.businessName}</div>
                <div className="foodtech-model-card__sub">{model.subcategory} • {model.category}</div>
                <div className="foodtech-model-card__desc">{model.description}</div>
              </div>

              <div className="foodtech-model-card__meta">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Standard Recovery:</span>
                  <span className="font-semibold" style={{ color: 'var(--color-green)' }}>
                    {model.benchmarkDefaults?.recovery_rate?.value ?? '—'}% {model.benchmarkDefaults?.recovery_rate?.unit ?? ''}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Required Inputs:</span>
                  <span className="font-medium text-color-primary">
                    {model.requiredParameters?.length || 0} Parameters
                  </span>
                </div>

                {sourceTitles.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div className="text-xs text-muted flex items-center gap-1" style={{ marginBottom: '2px' }}>
                      <BookOpen size={11} /> Sources:
                    </div>
                    <div className="foodtech-model-card__tags">
                      {sourceTitles.slice(0, 2).map((src, i) => (
                        <span key={i} className="badge badge--primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className={`btn btn--sm ${isSelected ? 'btn--green' : 'btn--outline'}`}
                    style={{ width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectModel(model);
                    }}
                  >
                    {isSelected ? 'Configuring Model' : 'Select Model'} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
