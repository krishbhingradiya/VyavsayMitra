/**
 * VYAVSAYMITRA — Data Freshness & Stale-Data Governance Policy
 * 
 * Defines strict freshness thresholds and categorizations:
 * - CURRENT: Active statutory guidelines, schemes, or invariant biology (validated for present year)
 * - RECENT: Multi-year census records updated within standard agronomic cycles (1-5 years)
 * - HISTORICAL_REFERENCE: Past market or survey datasets (> 5 years old) usable for reference baselines
 * - STALE: Datasets where temporal drift / inflation invalidate nominal values without indexing
 * - INSUFFICIENT: Incomplete or missing coverage
 */

const FRESHNESS_POLICY = {
  // Max days before category transition
  THRESHOLDS: {
    MARKET_PRICES: {
      MAX_CURRENT_DAYS: 30,         // > 30 days is no longer current spot market data
      MAX_RECENT_DAYS: 365,         // > 1 year is historical reference
      CATEGORY: 'HISTORICAL_REFERENCE',
      LATEST_OBSERVATION_DATE: '2016-11-01',
      OLDEST_OBSERVATION_DATE: '2014-09-01',
      WARNING: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.'
    },
    CROP_YIELD: {
      MAX_CURRENT_DAYS: 365 * 2,    // Agronomic statistics published with 1-2 year reporting lag
      MAX_RECENT_DAYS: 365 * 6,     // Up to 6 years considered recent agronomic trend
      CATEGORY: 'RECENT',
      LATEST_OBSERVATION_DATE: '2020-05-31',
      OLDEST_OBSERVATION_DATE: '1997-01-01',
      WARNING: 'Crop yield benchmarks reflect Directorate of Economics & Statistics (DES) agricultural census statistics (1997-2020).'
    },
    AGRONOMIC_SUITABILITY: {
      MAX_CURRENT_DAYS: 365 * 20,   // Biologically and physiologically invariant N-P-K & pH tolerance
      CATEGORY: 'CURRENT',
      LATEST_OBSERVATION_DATE: '2024-01-01',
      OLDEST_OBSERVATION_DATE: '2015-01-01',
      WARNING: null
    },
    COST_OF_CULTIVATION: {
      MAX_CURRENT_DAYS: 365 * 3,
      CATEGORY: 'HISTORICAL_REFERENCE',
      LATEST_OBSERVATION_DATE: '2019-03-31',
      OLDEST_OBSERVATION_DATE: '2010-01-01',
      WARNING: 'Cultivation operational costs reflect DES Comprehensive Scheme benchmark distributions; local input costs may vary.'
    },
    NABARD_BENCHMARKS: {
      MAX_CURRENT_DAYS: 365 * 2,    // Priority sector norms for 2024-2026
      CATEGORY: 'CURRENT',
      LATEST_OBSERVATION_DATE: '2026-03-31',
      OLDEST_OBSERVATION_DATE: '2024-04-01',
      WARNING: null
    },
    GOVERNMENT_SCHEMES: {
      MAX_CURRENT_DAYS: 365 * 2,    // Active guidelines for 2024-2026
      CATEGORY: 'CURRENT',
      LATEST_OBSERVATION_DATE: '2026-03-31',
      OLDEST_OBSERVATION_DATE: '2024-04-01',
      WARNING: null
    }
  },

  /**
   * Helper to determine data freshness status
   */
  getDataFreshness(datasetKey) {
    const key = datasetKey.toUpperCase();
    const config = this.THRESHOLDS[key] || {
      CATEGORY: 'HISTORICAL_REFERENCE',
      LATEST_OBSERVATION_DATE: '2020-01-01',
      WARNING: 'Historical data reference used for calculations.'
    };
    return {
      status: config.CATEGORY.toLowerCase(),
      dataStatus: config.CATEGORY,
      latestObservationDate: config.LATEST_OBSERVATION_DATE,
      warning: config.WARNING
    };
  }
};

module.exports = FRESHNESS_POLICY;
