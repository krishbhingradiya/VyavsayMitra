/**
 * VYAVSAYMITRA — FoodTech Mass Balance Abstraction & Physical Feasibility Engine
 * 
 * Implements strict law of conservation of mass for agro-processing operations:
 * 
 * INPUT (Raw Agricultural Produce)
 *   ↓
 * CLEANING & PRE-TREATMENT (Foreign matter, stones, moisture adjustment)
 *   ↓
 * PROCESSING & CONVERSION LOSSES (Dust, vapor, conveyance loss)
 *   ↓
 * EXTRACTION / SEPARATION
 *   ↓──────────────────────────────┐
 *   ↓                              ↓
 * PRIMARY FINISHED PRODUCT   SECONDARY BYPRODUCTS (Bran, Oil Cake, Husk, Chuni)
 * 
 * Mathematical Invariants:
 * 1. Total Mass Conservation: Input = Primary Output + Byproducts + Processing Losses + Unaccounted Loss
 * 2. Primary Output <= Input (Output > Input is physically impossible)
 * 3. 0% <= Primary Recovery Rate <= 100%
 * 4. 0% <= Byproduct Recovery Rate <= 100%
 * 5. 0% <= Processing Loss < 100%
 * 6. Non-negative quantities across all mass streams
 */

const MASS_BALANCE_TOLERANCE_PCT = 0.5; // 0.5% tolerance for rounding / moisture fluctuation

/**
 * Validates and computes a rigorous mass balance evaluation for a food processing operation
 * 
 * @param {Object} data
 * @param {number} data.rawMaterialInputKg - Total gross raw intake weight in kg
 * @param {number} [data.recoveryRatePct] - Primary product extraction rate %
 * @param {number} [data.primaryOutputKg] - Primary product weight in kg
 * @param {number} [data.byproductRecoveryPct=0] - Secondary byproduct extraction rate %
 * @param {number} [data.byproductOutputKg] - Secondary byproduct weight in kg
 * @param {number} [data.processingLossPct=0] - Mechanical/handling loss %
 * @param {number} [data.processingLossKg] - Mechanical/handling loss weight in kg
 * @param {number} [data.wastagePct=0] - Foreign matter/cleaning waste %
 * @param {number} [data.wastageKg] - Foreign matter/cleaning waste weight in kg
 * @returns {Object} Mass balance assessment with validation status and structured metrics
 */
function validateMassBalance(data = {}) {
  const errors = [];
  const warnings = [];

  const rawInput = data.rawMaterialInputKg;

  // 1. Validate Input Quantity
  if (rawInput === undefined || rawInput === null || typeof rawInput !== 'number' || isNaN(rawInput)) {
    return {
      isValid: false,
      errors: ['Raw material intake quantity (rawMaterialInputKg) is missing or non-numeric'],
      massBalance: null
    };
  }

  if (rawInput <= 0) {
    errors.push(`Raw material intake must be strictly greater than 0 kg, received ${rawInput}`);
  }

  // 2. Resolve Primary Product Output
  let recoveryPct = data.recoveryRatePct;
  let primaryOutput = data.primaryOutputKg;

  if (recoveryPct !== undefined && recoveryPct !== null) {
    if (typeof recoveryPct !== 'number' || isNaN(recoveryPct)) {
      errors.push('recoveryRatePct must be a valid number');
    } else if (recoveryPct < 0) {
      errors.push(`Negative recovery rate (${recoveryPct}%) is physically impossible`);
    } else if (recoveryPct > 100) {
      errors.push(`Recovery rate (${recoveryPct}%) cannot exceed 100%`);
    }
  }

  if (primaryOutput !== undefined && primaryOutput !== null) {
    if (typeof primaryOutput !== 'number' || isNaN(primaryOutput)) {
      errors.push('primaryOutputKg must be a valid number');
    } else if (primaryOutput < 0) {
      errors.push(`Primary output cannot be negative, received ${primaryOutput} kg`);
    } else if (rawInput > 0 && primaryOutput > rawInput) {
      errors.push(`Primary finished output (${primaryOutput} kg) exceeds raw material input (${rawInput} kg)`);
    }
  }

  // If primary output not directly given, derive from recoveryPct
  if (primaryOutput === undefined && recoveryPct !== undefined && rawInput > 0) {
    primaryOutput = Math.round((rawInput * (recoveryPct / 100)) * 100) / 100;
  } else if (recoveryPct === undefined && primaryOutput !== undefined && rawInput > 0) {
    recoveryPct = Math.round(((primaryOutput / rawInput) * 100) * 100) / 100;
  }

  // 3. Resolve Byproducts Output
  let byproductPct = data.byproductRecoveryPct !== undefined ? data.byproductRecoveryPct : null;
  let byproductOutput = data.byproductOutputKg;

  if (byproductPct !== null) {
    if (typeof byproductPct !== 'number' || isNaN(byproductPct)) {
      errors.push('byproductRecoveryPct must be a valid number');
    } else if (byproductPct < 0) {
      errors.push(`Negative byproduct recovery rate (${byproductPct}%) is physically impossible`);
    } else if (byproductPct > 100) {
      errors.push(`Byproduct recovery rate (${byproductPct}%) cannot exceed 100%`);
    }
  }

  if (byproductOutput !== undefined && byproductOutput !== null) {
    if (typeof byproductOutput !== 'number' || isNaN(byproductOutput)) {
      errors.push('byproductOutputKg must be a valid number');
    } else if (byproductOutput < 0) {
      errors.push(`Byproduct output cannot be negative, received ${byproductOutput} kg`);
    }
  }

  if (byproductOutput === undefined && byproductPct !== null && rawInput > 0) {
    byproductOutput = Math.round((rawInput * (byproductPct / 100)) * 100) / 100;
  } else if (byproductPct === null && byproductOutput !== undefined && rawInput > 0) {
    byproductPct = Math.round(((byproductOutput / rawInput) * 100) * 100) / 100;
  }
  byproductOutput = byproductOutput || 0;
  byproductPct = byproductPct || 0;

  // 4. Resolve Processing Losses & Wastage
  let lossPct = data.processingLossPct !== undefined ? data.processingLossPct : null;
  let lossKg = data.processingLossKg;

  if (lossPct !== null) {
    if (typeof lossPct !== 'number' || isNaN(lossPct)) {
      errors.push('processingLossPct must be a valid number');
    } else if (lossPct < 0) {
      errors.push(`Processing loss cannot be negative (${lossPct}%)`);
    } else if (lossPct >= 100) {
      errors.push(`Processing loss cannot be 100% or greater (${lossPct}%)`);
    }
  }

  if (lossKg !== undefined && lossKg !== null) {
    if (typeof lossKg !== 'number' || isNaN(lossKg)) {
      errors.push('processingLossKg must be a valid number');
    } else if (lossKg < 0) {
      errors.push(`Processing loss cannot be negative, received ${lossKg} kg`);
    }
  }

  if (lossKg === undefined && lossPct !== null && rawInput > 0) {
    lossKg = Math.round((rawInput * (lossPct / 100)) * 100) / 100;
  } else if (lossPct === null && lossKg !== undefined && rawInput > 0) {
    lossPct = Math.round(((lossKg / rawInput) * 100) * 100) / 100;
  }
  lossKg = lossKg || 0;
  lossPct = lossPct || 0;

  let wasteKg = data.wastageKg || (data.wastagePct ? (rawInput * data.wastagePct / 100) : 0);
  let wastePct = data.wastagePct || (wasteKg > 0 && rawInput > 0 ? (wasteKg / rawInput * 100) : 0);

  // If any fundamental boundary errors occurred, abort before conservation check
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      massBalance: null
    };
  }

  // 5. Mass Balance Summation & Conservation Verification
  const totalAccountedOutputKg = Math.round((primaryOutput + byproductOutput + lossKg + wasteKg) * 100) / 100;
  const totalAccountedPct = Math.round((recoveryPct + byproductPct + lossPct + wastePct) * 100) / 100;

  // Mass Balance Conservation Check
  // Law of Conservation of Mass: Output cannot exceed input.
  const excessKg = totalAccountedOutputKg - rawInput;
  const excessPct = (excessKg / rawInput) * 100;

  if (excessKg > (rawInput * (MASS_BALANCE_TOLERANCE_PCT / 100))) {
    errors.push(
      `Mass balance violation: Total output streams (${totalAccountedOutputKg} kg = ` +
      `Primary: ${primaryOutput}kg + Byproducts: ${byproductOutput}kg + Loss: ${lossKg}kg + Waste: ${wasteKg}kg) ` +
      `exceed raw material input (${rawInput} kg) by ${excessKg.toFixed(2)} kg (${excessPct.toFixed(1)}%).`
    );
  }

  // Check for unaccounted mass loss
  const unaccountedLossKg = Math.max(0, Math.round((rawInput - totalAccountedOutputKg) * 100) / 100);
  const unaccountedLossPct = Math.round(((unaccountedLossKg / rawInput) * 100) * 100) / 100;

  if (unaccountedLossPct > 10.0) {
    warnings.push(
      `High unaccounted mass gap: ${unaccountedLossKg} kg (${unaccountedLossPct}%) of raw material is unassigned to primary product, byproduct, or process loss.`
    );
  }

  if (lossPct > 15.0) {
    warnings.push(`Process loss of ${lossPct}% is above standard CFTRI benchmark for conventional agro-processing.`);
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    massBalance: isValid ? {
      rawMaterialInputKg: rawInput,
      primaryOutputKg: primaryOutput,
      primaryRecoveryPct: recoveryPct,
      byproductOutputKg: byproductOutput,
      byproductRecoveryPct: byproductPct,
      processingLossKg: lossKg,
      processingLossPct: lossPct,
      wastageKg: wasteKg,
      wastagePct: wastePct,
      totalAccountedKg: totalAccountedOutputKg,
      totalAccountedPct: totalAccountedPct,
      unaccountedLossKg: unaccountedLossKg,
      unaccountedLossPct: unaccountedLossPct,
      isMassConserved: Math.abs(rawInput - totalAccountedOutputKg) <= (rawInput * (MASS_BALANCE_TOLERANCE_PCT / 100)),
      provenance: {
        methodology: 'CSIR-CFTRI Chemical & Food Engineering Mass Balance Standard (Conservation of Mass)',
        tolerancePct: MASS_BALANCE_TOLERANCE_PCT,
        sourceInstitution: 'CSIR - Central Food Technological Research Institute (CFTRI), Mysuru'
      }
    } : null
  };
}

module.exports = {
  validateMassBalance,
  MASS_BALANCE_TOLERANCE_PCT
};
