/**
 * VYAVSAYMITRA — Current Market Data Service
 * 
 * Dedicated service for retrieving and validating CURRENT verified market prices.
 * Strictly adheres to the source priority hierarchy:
 * 1. Official Government of India APIs (data.gov.in / AGMARKNET REST feeds)
 * 2. Verified Structured Market Data Store (verified_current_mandi_prices.json)
 * 3. Grounded Gemini Google Search Fallback (strictly domain-whitelisted and validated)
 * 
 * CORE GOVERNANCE RULES:
 * - Never blindly scrape arbitrary blogs or untrusted SEO websites.
 * - Never average conflicting verified sources; flag source_conflict explicitly.
 * - Never treat historical 2014-2016 data as current data.
 * - Prefer MODAL PRICE for Mandi wholesale benchmarks.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const FRESHNESS_POLICY = require('../../config/freshnessPolicy');

const DATA_VALIDATED_DIR = path.resolve(__dirname, '../../../data/validated');
const VERIFIED_PRICES_PATH = path.join(DATA_VALIDATED_DIR, 'verified_current_mandi_prices.json');

// Domain whitelist for verified government and authoritative APMC sources
const AUTHORITATIVE_DOMAIN_WHITELIST = [
  'agmarknet.gov.in',
  'data.gov.in',
  'cacp.dacnet.nic.in',
  'farmer.gov.in',
  'msamb.com',
  'gsamb.gov.in',
  'upmandiparishad.upsdc.gov.in',
  'mandiboard.nic.in',
  'gov.in',
  'nic.in'
];

// In-memory cache for verified current market observations
let cachedCurrentPrices = null;

/**
 * Initializes and caches verified current market prices from disk
 */
function initCurrentMarketData() {
  try {
    if (fs.existsSync(VERIFIED_PRICES_PATH)) {
      const raw = fs.readFileSync(VERIFIED_PRICES_PATH, 'utf-8');
      cachedCurrentPrices = JSON.parse(raw);
    } else {
      cachedCurrentPrices = [];
    }
  } catch (err) {
    console.error('[CURRENT MARKET SERVICE] Failed to load verified current prices:', err.message);
    cachedCurrentPrices = [];
  }
}

/**
 * Validates a live market observation according to the 10-step validation criteria
 * 
 * @param {Object} obs - Observation record
 * @returns {{ isValid: boolean, error?: string, sanitized?: Object }}
 */
function validateObservation(obs) {
  if (!obs || typeof obs !== 'object') {
    return { isValid: false, error: 'Observation must be a non-null object' };
  }

  // 1. Verify commodity
  if (!obs.commodity || typeof obs.commodity !== 'string' || !obs.commodity.trim()) {
    return { isValid: false, error: 'Missing or empty commodity name' };
  }

  // 2. Verify variety/grade
  const variety = obs.variety ? String(obs.variety).trim() : 'Common';

  // 3. Verify market
  if (!obs.market || typeof obs.market !== 'string' || !obs.market.trim()) {
    return { isValid: false, error: 'Missing or empty market name' };
  }

  // 4. Verify district/state
  if (!obs.state || typeof obs.state !== 'string' || !obs.state.trim()) {
    return { isValid: false, error: 'Missing or empty state name' };
  }
  const district = obs.district ? String(obs.district).trim() : 'Local';

  // 5. Verify unit
  const validUnits = ['INR/quintal', 'quintal', 'INR/kg', 'kg', 'INR/tonne', 'tonne'];
  const rawUnit = (obs.unit || 'INR/quintal').trim();
  if (!validUnits.includes(rawUnit)) {
    return { isValid: false, error: `Invalid or unrecognized unit: ${rawUnit}` };
  }

  // 6. Verify currency
  const currency = (obs.currency || 'INR').trim().toUpperCase();
  if (currency !== 'INR') {
    return { isValid: false, error: `Unsupported currency: ${currency}. System expects INR.` };
  }

  // Price validation (prefer modalPrice, fallback to price)
  const modalPrice = typeof obs.modalPrice === 'number' ? obs.modalPrice : (typeof obs.price === 'number' ? obs.price : parseFloat(obs.modalPrice || obs.price));
  if (isNaN(modalPrice) || modalPrice <= 0) {
    return { isValid: false, error: `Invalid non-positive modal price: ${modalPrice}` };
  }

  const minPrice = typeof obs.minPrice === 'number' ? obs.minPrice : (parseFloat(obs.minPrice) || modalPrice);
  const maxPrice = typeof obs.maxPrice === 'number' ? obs.maxPrice : (parseFloat(obs.maxPrice) || modalPrice);

  if (minPrice > maxPrice) {
    return { isValid: false, error: `Malformed price range: minPrice (${minPrice}) > maxPrice (${maxPrice})` };
  }

  // 7. Verify observation date
  if (!obs.observationDate || isNaN(Date.parse(obs.observationDate))) {
    return { isValid: false, error: `Invalid or unparseable observationDate: ${obs.observationDate}` };
  }
  const obsDateObj = new Date(obs.observationDate);
  const now = new Date();
  if (obsDateObj > new Date(now.getTime() + 86400000 * 2)) {
    return { isValid: false, error: `Observation date is in the future: ${obs.observationDate}` };
  }

  // 8. Verify source
  if (!obs.source || typeof obs.source !== 'string' || !obs.source.trim()) {
    return { isValid: false, error: 'Missing or empty source reference' };
  }

  // Source domain verification if URL is present
  if (obs.sourceUrl) {
    try {
      const parsedUrl = new URL(obs.sourceUrl);
      const isAllowedDomain = AUTHORITATIVE_DOMAIN_WHITELIST.some(d => parsedUrl.hostname.endsWith(d));
      if (!isAllowedDomain) {
        return { isValid: false, error: `Source URL domain '${parsedUrl.hostname}' is not in the authoritative domain whitelist` };
      }
    } catch {
      return { isValid: false, error: `Malformed source URL: ${obs.sourceUrl}` };
    }
  }

  // 9. Check freshness policy
  const daysOld = Math.floor((now - obsDateObj) / (1000 * 60 * 60 * 24));
  let computedDataStatus = 'current';
  if (daysOld > FRESHNESS_POLICY.THRESHOLDS.MARKET_PRICES.MAX_CURRENT_DAYS) {
    computedDataStatus = daysOld <= FRESHNESS_POLICY.THRESHOLDS.MARKET_PRICES.MAX_RECENT_DAYS ? 'recent' : 'stale';
  }

  // 10. Standardized sanitized observation
  const sanitized = {
    commodity: obs.commodity.trim(),
    variety,
    market: obs.market.trim(),
    district,
    state: obs.state.trim(),
    price: modalPrice,
    minPrice,
    maxPrice,
    modalPrice,
    unit: rawUnit.startsWith('INR/') ? rawUnit : `INR/${rawUnit}`,
    currency: 'INR',
    observationDate: obs.observationDate,
    retrievedAt: obs.retrievedAt || new Date().toISOString(),
    source: obs.source.trim(),
    sourceType: obs.sourceType || 'government_api',
    sourceUrl: obs.sourceUrl || 'https://agmarknet.gov.in',
    dataStatus: computedDataStatus
  };

  return { isValid: true, sanitized };
}

/**
 * Checks if two verified observations conflict (same market & commodity but diverging prices > 15%)
 */
function checkForSourceConflict(observations) {
  if (!observations || observations.length <= 1) return null;

  const prices = observations.map(o => o.modalPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spreadPct = ((max - min) / min) * 100;

  if (spreadPct > 15) {
    return {
      status: 'source_conflict',
      sources: observations.map(o => ({
        source: o.source,
        sourceUrl: o.sourceUrl,
        modalPrice: o.modalPrice,
        observationDate: o.observationDate
      })),
      warning: `Verified sources report diverging values for ${observations[0].commodity} in ${observations[0].market} (${spreadPct.toFixed(1)}% spread). Blind averaging is prohibited.`
    };
  }
  return null;
}

/**
 * Retrieves current verified market data using the priority hierarchy
 * 
 * @param {string} commodity - Commodity name (e.g. Wheat)
 * @param {string} state - State name (e.g. Maharashtra)
 * @param {string} [district=''] - District name (e.g. Pune)
 * @param {Object} [options={}] - Query options
 * @returns {Promise<Object|null>} Verified observation or source_conflict or null
 */
async function getCurrentMarketPrice(commodity, state = '', district = '', options = {}) {
  if (!cachedCurrentPrices) {
    initCurrentMarketData();
  }

  const rawComm = (commodity || '').toLowerCase().trim();
  const rawState = (state || '').toLowerCase().trim();
  const rawDist = (district || '').toLowerCase().trim();

  if (!rawComm) return null;

  // Commodity matching aliases
  const COMMODITY_ALIASES = {
    'wheat': ['wheat', 'wheat(husked)', 'lokwan', 'sharbati'],
    'rice': ['rice', 'paddy', 'paddy(dhan)', 'dhan'],
    'paddy': ['rice', 'paddy', 'paddy(dhan)', 'dhan'],
    'cotton': ['cotton', 'kapas'],
    'soyabean': ['soyabean', 'soya', 'soybean'],
    'soybean': ['soyabean', 'soya', 'soybean'],
    'gram': ['gram', 'chana', 'bengal gram', 'bengal gram(gram)'],
    'chana': ['gram', 'chana', 'bengal gram', 'bengal gram(gram)'],
    'tur': ['pigeon pea (tur)', 'pigeon pea', 'tur', 'arhar', 'arhar (tur/red gram)'],
    'arhar': ['pigeon pea (tur)', 'pigeon pea', 'tur', 'arhar', 'arhar (tur/red gram)'],
    'pigeon pea': ['pigeon pea (tur)', 'pigeon pea', 'tur', 'arhar'],
    'maize': ['maize', 'makka', 'corn'],
    'bajra': ['bajri', 'bajra', 'pearl millet'],
    'bajri': ['bajri', 'bajra', 'pearl millet'],
    'jowar': ['sorgum(jawar)', 'jowar', 'sorghum', 'sorgum'],
    'sorghum': ['sorgum(jawar)', 'jowar', 'sorghum', 'sorgum'],
    'mustard': ['mustard', 'sarson', 'rape/mustard'],
    'onion': ['onion', 'pyaz', 'kanda'],
    'tomato': ['tomato', 'tamatar'],
    'potato': ['potato', 'aloo'],
    'groundnut': ['groundnut', 'peanut', 'mungphali']
  };

  function matchesCommodity(cName) {
    const norm = (cName || '').toLowerCase().trim();
    if (norm === rawComm || norm.includes(rawComm) || rawComm.includes(norm)) return true;
    for (const [, aliases] of Object.entries(COMMODITY_ALIASES)) {
      if (aliases.some(a => rawComm === a || rawComm.includes(a))) {
        if (aliases.some(a => norm === a || norm.includes(a))) {
          return true;
        }
      }
    }
    return false;
  }

  // Priority 1: Check if live Government API feed is requested & configured
  if (process.env.DATAGOV_API_KEY && options.useLiveApi !== false) {
    try {
      const liveGovRecord = await fetchFromGovernmentApi(commodity, state, district);
      if (liveGovRecord) {
        const val = validateObservation(liveGovRecord);
        if (val.isValid) return val.sanitized;
      }
    } catch (err) {
      console.warn('[CURRENT MARKET SERVICE] Government API lookup failed, falling back to verified repository:', err.message);
    }
  }

  // Priority 2: Structured Verified Current Data Store
  const candidates = cachedCurrentPrices.filter(item => matchesCommodity(item.commodity));

  if (candidates.length > 0) {
    // 1. Exact District & Market Match
    if (rawDist) {
      const exactDistrict = candidates.filter(c => 
        (c.district || '').toLowerCase().trim() === rawDist &&
        (!rawState || (c.state || '').toLowerCase().trim() === rawState)
      );
      if (exactDistrict.length > 0) {
        // Check for conflicting multiple sources
        const conflict = checkForSourceConflict(exactDistrict);
        if (conflict) return conflict;

        const val = validateObservation(exactDistrict[0]);
        if (val.isValid) return val.sanitized;
      }
    }

    // 2. State-level Match
    if (rawState) {
      const stateMatches = candidates.filter(c => 
        (c.state || '').toLowerCase().trim() === rawState
      );
      if (stateMatches.length > 0) {
        const conflict = checkForSourceConflict(stateMatches);
        if (conflict) return conflict;

        const val = validateObservation(stateMatches[0]);
        if (val.isValid) return val.sanitized;
      }
    }

    // 3. National Benchmark Match
    const nationalMatch = candidates.find(c => (c.state || '').toLowerCase().trim() === 'national');
    if (nationalMatch) {
      const val = validateObservation(nationalMatch);
      if (val.isValid) return val.sanitized;
    }

    // Return best available verified candidate
    const val = validateObservation(candidates[0]);
    if (val.isValid) return val.sanitized;
  }

  // Priority 3: Gemini Grounded Search Fallback (Only if API key is present and explicitly enabled)
  if (process.env.GEMINI_API_KEY && options.allowSearchFallback) {
    try {
      const searchRecord = await fetchFromGeminiSearch(commodity, state, district);
      if (searchRecord) {
        const val = validateObservation(searchRecord);
        if (val.isValid) return val.sanitized;
      }
    } catch (err) {
      console.warn('[CURRENT MARKET SERVICE] Grounded search fallback failed:', err.message);
    }
  }

  // No current verified data found
  return null;
}

/**
 * Mockable / Connectable Live Government of India API fetcher
 */
async function fetchFromGovernmentApi(commodity, state, district) {
  // Can be configured with official data.gov.in API key
  const apiKey = process.env.DATAGOV_API_KEY;
  if (!apiKey) return null;

  return new Promise((resolve) => {
    // Construct query parameters for data.gov.in mandi endpoint
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[commodity]=${encodeURIComponent(commodity)}&filters[state]=${encodeURIComponent(state)}`;

    https.get(url, { timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const records = json.records || [];
          if (records.length > 0) {
            // Prioritize exact district match if available
            let r = records[0];
            if (district) {
              const dMatch = records.find(item => 
                (item.district || '').toLowerCase().trim() === district.toLowerCase().trim()
              );
              if (dMatch) r = dMatch;
            }

            const parsedModal = parseFloat(r.modal_price);
            const parsedMin = parseFloat(r.min_price);
            const parsedMax = parseFloat(r.max_price);

            if (isNaN(parsedModal) || parsedModal <= 0) {
              resolve(null);
              return;
            }

            let obsDate = new Date().toISOString().split('T')[0];
            if (r.arrival_date && r.arrival_date.includes('/')) {
              const parts = r.arrival_date.split('/');
              if (parts.length === 3) {
                obsDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }

            resolve({
              commodity: r.commodity || commodity,
              variety: r.variety || 'Common',
              market: r.market ? r.market.trim() : `${district} APMC`,
              district: r.district ? r.district.trim() : district,
              state: r.state ? r.state.trim() : state,
              price: parsedModal,
              minPrice: !isNaN(parsedMin) && parsedMin > 0 ? parsedMin : parsedModal,
              maxPrice: !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : parsedModal,
              modalPrice: parsedModal,
              unit: 'INR/quintal',
              currency: 'INR',
              observationDate: obsDate,
              sourceDate: obsDate,
              retrievedAt: new Date().toISOString(),
              source: 'data.gov.in / AGMARKNET',
              sourceType: 'government_api',
              sourceUrl: 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
              datasetVersion: '9ef84268-d588-465a-a308-a864a43d0070'
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Gemini Google Search Grounding Client (Only authoritative domains accepted)
 */
async function fetchFromGeminiSearch(_commodity, _state, _district) {
  // If Gemini API is available, calls Gemini model with Google Search grounding
  // Then validates against authoritative whitelist
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiKey) return null;

  // Placeholder for direct live call with strict domain filtering
  return null;
}

/**
 * Appends a verified observation to the repository (for administrative / sync pipelines)
 */
function recordVerifiedObservation(obs) {
  const val = validateObservation(obs);
  if (!val.isValid) {
    throw new Error(`Cannot record invalid observation: ${val.error}`);
  }

  if (!cachedCurrentPrices) initCurrentMarketData();

  // Deduplicate / replace existing same market + commodity + date
  const index = cachedCurrentPrices.findIndex(c => 
    c.commodity.toLowerCase() === val.sanitized.commodity.toLowerCase() &&
    c.market.toLowerCase() === val.sanitized.market.toLowerCase() &&
    c.observationDate === val.sanitized.observationDate
  );

  if (index >= 0) {
    cachedCurrentPrices[index] = val.sanitized;
  } else {
    cachedCurrentPrices.push(val.sanitized);
  }

  fs.writeFileSync(VERIFIED_PRICES_PATH, JSON.stringify(cachedCurrentPrices, null, 2), 'utf-8');
  return val.sanitized;
}

/**
 * Safely verifies live Government of India market data connectivity without exposing keys
 * 
 * @param {string} [commodity='Wheat']
 * @param {string} [state='Maharashtra']
 * @param {string} [district='Pune']
 * @returns {Promise<Object>} Verification status report
 */
async function verifyLiveGovernmentApiConnection(commodity = 'Wheat', state = 'Maharashtra', district = 'Pune') {
  const apiKey = process.env.DATAGOV_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      status: 'NOT_WORKING',
      reason: 'MISSING_KEY',
      message: 'DATAGOV_API_KEY is not configured in .env. Obtain a free API key at https://data.gov.in'
    };
  }

  return new Promise((resolve) => {
    // Official data.gov.in daily mandi price endpoint
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey.trim()}&format=json&filters[commodity]=${encodeURIComponent(commodity)}&filters[state]=${encodeURIComponent(state)}&limit=1`;

    https.get(url, { timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const records = json.records || [];
            if (records.length > 0) {
              const r = records[0];
              let obsDate = new Date().toISOString().split('T')[0];
              if (r.arrival_date && r.arrival_date.includes('/')) {
                const parts = r.arrival_date.split('/');
                if (parts.length === 3) {
                  obsDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
              resolve({
                status: 'WORKING',
                httpStatus: 200,
                source: 'data.gov.in / AGMARKNET',
                sourceUrl: 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
                endpoint: 'api.data.gov.in',
                commodity: r.commodity || commodity,
                market: (r.market || `${district} APMC`).trim(),
                district: r.district || district,
                state: r.state || state,
                observationDate: obsDate,
                modalPrice: parseFloat(r.modal_price) || 0,
                minPrice: parseFloat(r.min_price) || 0,
                maxPrice: parseFloat(r.max_price) || 0,
                priceType: 'modal',
                unit: 'INR/quintal',
                dataStatus: 'current',
                rawCount: records.length
              });
            } else {
              resolve({
                status: 'WORKING',
                httpStatus: 200,
                source: 'data.gov.in Current Daily Mandi Price Resource',
                endpoint: 'api.data.gov.in',
                commodity,
                market: `${district} APMC`,
                observationDate: new Date().toISOString().split('T')[0],
                priceType: 'modal',
                unit: 'INR/quintal',
                dataStatus: 'current',
                message: 'Endpoint responded successfully (zero records returned for exact filter)'
              });
            }
          } catch (e) {
            resolve({
              status: 'NOT_WORKING',
              reason: 'ENDPOINT_ERROR',
              httpStatus: 200,
              message: `Failed to parse data.gov.in JSON response: ${e.message}`
            });
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({
            status: 'NOT_WORKING',
            reason: 'UNAUTHORIZED',
            httpStatus: res.statusCode,
            message: 'data.gov.in rejected API key (invalid or inactive credentials)'
          });
        } else {
          resolve({
            status: 'NOT_WORKING',
            reason: 'ENDPOINT_ERROR',
            httpStatus: res.statusCode,
            message: `data.gov.in returned HTTP ${res.statusCode}`
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        status: 'NOT_WORKING',
        reason: 'NETWORK_ERROR',
        message: err.message
      });
    });
  });
}

// Auto-initialize on module load
initCurrentMarketData();

module.exports = {
  getCurrentMarketPrice,
  validateObservation,
  checkForSourceConflict,
  recordVerifiedObservation,
  verifyLiveGovernmentApiConnection,
  AUTHORITATIVE_DOMAIN_WHITELIST,
  initCurrentMarketData
};

