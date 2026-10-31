import { BadRequestException, Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogQueryDto } from './catalog.dto';
import { CatalogService } from './catalog.service';
import { PUBLISHED_CATALOG_MODE, requireCatalogReadEnabled } from '../legal/commerce-release-status';

type RequestAddress = { ip?: string; socket?: { remoteAddress?: string } };

@Controller('catalog')
export class CatalogController {
  private readonly visualRequestWindows = new Map<string, { startedAt: number; count: number }>();
  constructor(private readonly catalog: CatalogService) {}
  private enforceVisualReadLimit(request: RequestAddress, route: string, limit: number): void {
    const key = `${request.ip || request.socket?.remoteAddress || 'unknown'}:${route}`;
    const now = Date.now();
    const current = this.visualRequestWindows.get(key);
    const window = !current || now - current.startedAt >= 60_000 ? { startedAt: now, count: 0 } : current;
    window.count += 1;
    this.visualRequestWindows.set(key, window);
    if (this.visualRequestWindows.size > 10_000) {
      for (const [address, bucket] of this.visualRequestWindows) if (now - bucket.startedAt >= 60_000 || this.visualRequestWindows.size > 8_000) this.visualRequestWindows.delete(address);
    }
    if (window.count > limit) throw new HttpException('Muitas consultas de imagem. Tente novamente em instantes.', HttpStatus.TOO_MANY_REQUESTS);
  }
  @Get('roblox-avatars') robloxAvatars(@Req() request: RequestAddress, @Query('userIds') userIds = '') {
    requireCatalogReadEnabled();
    this.enforceVisualReadLimit(request, 'roblox-avatar', 30);
    return this.catalog.robloxAvatars(userIds.split(',').slice(0, 24));
  }
  @Get() list(@Query() query: CatalogQueryDto) {
    if (PUBLISHED_CATALOG_MODE === 'demo') {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0, demoOnly: true, message: 'A Crystalforn está em prévia visual, sem anúncios reais.' };
    }
    requireCatalogReadEnabled();
    return this.catalog.list(query.game, query.page, query.pageSize, {
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minDaysOffline: query.minDaysOffline,
      skinName: query.skinName,
      steamGame: query.steamGame,
      rank: query.rank,
      minLevel: query.minLevel,
    }, query.sort).then((catalog) => ({ ...catalog, demoOnly: false, catalogMode: PUBLISHED_CATALOG_MODE }));
  }
  @Get(':id/inventory-image') async inventoryImage(@Req() request: RequestAddress, @Param('id') id: string, @Query('type') type = 'skins') {
    requireCatalogReadEnabled();
    this.enforceVisualReadLimit(request, 'inventory-image', 30);
    return this.catalog.inventoryImage(id, type);
  }
  @Get(':id/inventory-image/:type/:width') async inventoryImageVariant(@Req() request: RequestAddress, @Param('id') id: string, @Param('type') type: string, @Param('width') rawWidth: string, @Res({ passthrough: true }) response: Response) {
    requireCatalogReadEnabled();
    this.enforceVisualReadLimit(request, 'inventory-image-variant', 30);
    const width = Number(rawWidth);
    if (!Number.isInteger(width) || ![320, 640, 960].includes(width)) throw new BadRequestException('Largura de prévia inválida.');
    const image = await this.catalog.inventoryImageVariant(id, type, width);
    response.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600', 'X-Content-Type-Options': 'nosniff' });
    return image;
  }
  @Get(':id') async detail(@Param('id') id: string) {
    requireCatalogReadEnabled();
    const product = await this.catalog.detail(id);
    if (!product) throw new NotFoundException('Produto indisponível.');
    return product;
  }
}
