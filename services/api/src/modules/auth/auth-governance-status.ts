import { ServiceUnavailableException } from '@nestjs/common';

// Customer registration and central OAuth use the configured identity service and fail closed
// until configured. Store-admin login is separate: Argon2id plus the local
// dashboard_users tenant and role checks in AuthService.loginAdmin/userFromCookie.
export const PUBLISHED_STORE_AUTHORIZATION_REFERENCE = 'auth-center-crystalforn-customer-v1';

export function requireApprovedStoreAuthentication(): void {
  const published = PUBLISHED_STORE_AUTHORIZATION_REFERENCE.trim();
  const configured = process.env.STORE_AUTHORIZATION_REFERENCE?.trim() ?? '';
  if (!published || configured !== published) {
    throw new ServiceUnavailableException('Autenticação da loja indisponível até a aprovação da arquitetura de identidade.');
  }
  if (!process.env.STORE_AUTH_CENTER_URL || !process.env.STORE_AUTH_CLIENT_SECRET) {
    throw new ServiceUnavailableException('Autenticação Crystalforn indisponível: integração central não configurada.');
  }
}
