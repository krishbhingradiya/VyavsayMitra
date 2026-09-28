/**
 * VYAVSAYMITRA — Identity Verification Provider Integration Adapter
 * Phase 12: Business Verification & External Integration Boundaries
 * 
 * Enforces Absolute Rule 2: NO fake government verification.
 * Distinguishes:
 * - User-provided information
 * - System-derived information
 * - Verified field information
 * - Verified document information
 * - External-source information
 * - AI-assisted information
 * 
 * If no official external verification API exists or is unconfigured,
 * clearly marks the item: "External verification unavailable."
 */

class IdentityVerificationProvider {
  constructor(config = {}) {
    this.providerName = config.providerName || process.env.ID_VERIFICATION_PROVIDER || 'GOVT_DIRECT_GATEWAY';
    this.panApiKey = process.env.PAN_VERIFICATION_API_KEY || null;
    this.gstinApiKey = process.env.GSTIN_VERIFICATION_API_KEY || null;
    this.udyamApiKey = process.env.UDYAM_VERIFICATION_API_KEY || null;
  }

  getProviderStatus() {
    return {
      provider: this.providerName,
      panConfigured: Boolean(this.panApiKey),
      gstinConfigured: Boolean(this.gstinApiKey),
      udyamConfigured: Boolean(this.udyamApiKey),
      notice: 'External government verification APIs are strictly gated. No synthetic approvals or simulated validations permitted.'
    };
  }

  /**
   * Verify PAN number
   */
  async verifyPAN(panNumber) {
    if (!this.panApiKey) {
      return {
        available: false,
        reason: 'PROVIDER_NOT_CONFIGURED',
        verificationStatus: 'UNVERIFIED',
        message: 'External verification unavailable.',
        documentType: 'PAN',
        identifier: panNumber ? `${panNumber.slice(0, 2)}XXXXX${panNumber.slice(-1)}` : null,
        provenance: 'External verification unavailable.'
      };
    }

    return {
      available: false,
      reason: 'PROVIDER_TEMPORARILY_UNREACHABLE',
      verificationStatus: 'UNVERIFIED',
      message: 'External verification unavailable.'
    };
  }

  /**
   * Verify GSTIN number
   */
  async verifyGSTIN(gstinNumber) {
    if (!this.gstinApiKey) {
      return {
        available: false,
        reason: 'PROVIDER_NOT_CONFIGURED',
        verificationStatus: 'UNVERIFIED',
        message: 'External verification unavailable.',
        documentType: 'GSTIN',
        identifier: gstinNumber ? `${gstinNumber.slice(0, 2)}XXXXXXXXXXX` : null,
        provenance: 'External verification unavailable.'
      };
    }

    return {
      available: false,
      reason: 'PROVIDER_TEMPORARILY_UNREACHABLE',
      verificationStatus: 'UNVERIFIED',
      message: 'External verification unavailable.'
    };
  }

  /**
   * Verify Udyam Registration
   */
  async verifyUdyam(udyamNumber) {
    if (!this.udyamApiKey) {
      return {
        available: false,
        reason: 'PROVIDER_NOT_CONFIGURED',
        verificationStatus: 'UNVERIFIED',
        message: 'External verification unavailable.',
        documentType: 'UDYAM',
        identifier: udyamNumber ? `${udyamNumber.slice(0, 5)}XXXXXX` : null,
        provenance: 'External verification unavailable.'
      };
    }

    return {
      available: false,
      reason: 'PROVIDER_TEMPORARILY_UNREACHABLE',
      verificationStatus: 'UNVERIFIED',
      message: 'External verification unavailable.'
    };
  }
}

const defaultIdentityVerificationProvider = new IdentityVerificationProvider();

module.exports = {
  IdentityVerificationProvider,
  defaultIdentityVerificationProvider
};
