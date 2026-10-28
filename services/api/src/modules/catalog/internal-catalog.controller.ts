import { Body, Controller, Get, Headers, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { CatalogService } from './catalog.service';
import { commerceReleaseStatus, requireMarketplaceCompliance } from '../legal/commerce-release-status';

function validSecret(supplied: string | undefined, expected: string | undefined): boolean {
  if (!supplied || !expected) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Controller('internal/catalog')
export class InternalCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  private authorize(authorization: string | undefined): void {
    const secret = process.env.SYNC_WORKER_SECRET;
    if (!secret) throw new ServiceUnavailableException('Worker de sincronização não configurado.');
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!validSecret(supplied, secret)) throw new UnauthorizedException('Worker não autorizado.');
  }
  @Get('sync-status') syncStatus(@Headers('authorization') authorization: string) {
    this.authorize(authorization);
    return commerceReleaseStatus();
  }
  @Post('items') async importItems(@Headers('authorization') authorization: string, @Body('items') items: unknown[]) {
    this.authorize(authorization);
    requireMarketplaceCompliance();
    if (!Array.isArray(items)) throw new UnauthorizedException('Lote do worker inválido.');
    return { imported: await this.catalog.importProviderItems(items) };
  }
}
