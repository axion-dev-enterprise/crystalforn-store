import { ServiceUnavailableException } from '@nestjs/common';
import { commerceReleaseStatus } from './commerce-release-status';

// Replace only after the owner approves the complete buyer-facing document.
export const PUBLISHED_PURCHASE_TERMS_VERSION = '';

export function purchaseTermsStatus() {
  const configuredVersion = process.env.PURCHASE_TERMS_VERSION?.trim() ?? '';
  const termsEnabled = process.env.PURCHASE_TERMS_APPROVED === 'true'
    && Boolean(PUBLISHED_PURCHASE_TERMS_VERSION)
    && configuredVersion === PUBLISHED_PURCHASE_TERMS_VERSION;
  const commerce = commerceReleaseStatus();
  return {
    enabled: termsEnabled && commerce.marketplaceEnabled,
    termsEnabled,
    catalogMode: commerce.catalogMode,
    catalogSyncEnabled: commerce.catalogSyncEnabled,
    marketplaceEnabled: commerce.marketplaceEnabled,
    paymentProviders: commerce.paymentProviders,
    version: termsEnabled ? PUBLISHED_PURCHASE_TERMS_VERSION : null,
  };
}

export function requirePurchaseTermsVersion(): string {
  const status = purchaseTermsStatus();
  if (!status.enabled || !status.version) {
    throw new ServiceUnavailableException('Checkout desativado até a publicação e aprovação dos Termos de Compra.');
  }
  return status.version;
}
