import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(request.method) || request.path.startsWith('/api/v1/webhooks/') || request.path.startsWith('/api/v1/internal/')) {
      next();
      return;
    }
    const expected = process.env.APP_ORIGIN;
    const origin = request.get('origin');
    const centralCallback = request.method === 'POST' && request.path === '/api/v1/auth/central/callback';
    if (centralCallback) {
      let authCenterOrigin = '';
      try {
        const center = new URL(process.env.STORE_AUTH_CENTER_URL || '');
        if (center.protocol === 'https:' && !center.username && !center.password && !center.search && !center.hash) authCenterOrigin = center.origin;
      } catch { authCenterOrigin = ''; }
      if (request.is('application/x-www-form-urlencoded') !== 'application/x-www-form-urlencoded'
        || !origin || origin !== authCenterOrigin) throw new ForbiddenException('Origem do retorno central inválida.');
      next();
      return;
    }
    if (!expected || !origin || origin !== expected) throw new ForbiddenException('Origem da solicitação inválida.');
    next();
  }
}
