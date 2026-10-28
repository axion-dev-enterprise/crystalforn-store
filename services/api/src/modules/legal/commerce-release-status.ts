import { ServiceUnavailableException } from '@nestjs/common';

export type StorePaymentProvider = 'mercadopago' | 'pushinpay';

// The current user-approved release is a visual demonstration only. This is a
// source-level release gate: deployment environment variables cannot enable sales.
export const PUBLISHED_COMMERCE_MODE = 'demo' as const;

// Keep these blank until the approved operating model and provider category are documented.
export const PUBLISHED_MARKETPLACE_COMPLIANCE_REFERENCE = '';
export const PUBLISHED_PAYMENT_CATEGORY_REFERENCES: Record<StorePaymentProvider, string> = {
  mercadopago: '',
  pushinpay: '',
};

function configuredReference(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function marketplaceApproved(): boolean {
  if (PUBLISHED_COMMERCE_MODE === 'demo') return false;
  const published = PUBLISHED_MARKETPLACE_COMPLIANCE_REFERENCE.trim();
  return Boolean(published && configuredReference('MARKETPLACE_COMPLIANCE_REFERENCE') === published);
}

function paymentProviderApproved(provider: StorePaymentProvider): boolean {
  if (PUBLISHED_COMMERCE_MODE === 'demo') return false;
  const published = PUBLISHED_PAYMENT_CATEGORY_REFERENCES[provider].trim();
  const variable = provider === 'mercadopago'
    ? 'MERCADOPAGO_CATEGORY_APPROVAL_REFERENCE'
    : 'PUSHINPAY_CATEGORY_APPROVAL_REFERENCE';
  return Boolean(published && configuredReference(variable) === published);
}

export function commerceReleaseStatus() {
  return {
    mode: PUBLISHED_COMMERCE_MODE,
    demoOnly: PUBLISHED_COMMERCE_MODE === 'demo',
    marketplaceEnabled: marketplaceApproved(),
    paymentProviders: {
      mercadopago: paymentProviderApproved('mercadopago'),
      pushinpay: paymentProviderApproved('pushinpay'),
    },
  };
}

export function requireMarketplaceCompliance(): void {
  if (PUBLISHED_COMMERCE_MODE === 'demo') {
    throw new ServiceUnavailableException('Crystalforn está em modo demonstração: catálogo e operações comerciais estão desativados.');
  }
  if (!marketplaceApproved()) {
    throw new ServiceUnavailableException('Checkout desativado até a aprovação documentada do modelo comercial.');
  }
}

export function requirePaymentCategoryApproval(provider: StorePaymentProvider): void {
  requireMarketplaceCompliance();
  if (!paymentProviderApproved(provider)) {
    throw new ServiceUnavailableException('Este meio de pagamento ainda não tem aprovação comercial documentada para a oferta.');
  }
}
