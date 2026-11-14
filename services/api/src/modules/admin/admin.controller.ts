import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard, SessionGuard, StoreRequest } from '../auth/session.guard';
import { AdminService } from './admin.service';
import { CancellationRequestReviewDto } from '../commerce/commerce.dto';
import { AdminCatalogQueryDto, AdminOrdersQueryDto, AdminPageQueryDto, CouponActiveDto, CouponDto, DeliveryDto, PricingPreviewQueryDto, StoreSettingsDto, VisibilityDto } from './admin.dto';
import { CommerceService } from '../commerce/commerce.service';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly commerce: CommerceService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('catalog') catalog(@Query() query: AdminCatalogQueryDto) { return this.admin.listCatalog(query); }
  @Get('catalog/sync-runs') catalogSyncRuns(@Query() query: AdminPageQueryDto) { return this.admin.listCatalogSyncRuns(query); }
  @Get('catalog/price-preview') pricePreview(@Query() query: PricingPreviewQueryDto) { return this.admin.pricePreview(query); }
  @Get('audit') audit(@Query() query: AdminPageQueryDto) { return this.admin.listAudit(query); }
  @Get('settings') settings() { return this.admin.getSettings(); }
  @Put('settings') setSettings(@Body() input: StoreSettingsDto, @Req() request: StoreRequest) { return this.admin.setSettings(input, request.storeUser!.id); }
  @Patch('catalog/items/:id/visibility') setCatalogItemVisibility(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: VisibilityDto, @Req() request: StoreRequest) {
    return this.admin.setCatalogItemVisibility(id, input.hidden, request.storeUser!.id);
  }
  @Patch('catalog/sellers/:sellerId/visibility') setSellerVisibility(@Param('sellerId') sellerId: string, @Body() input: VisibilityDto, @Req() request: StoreRequest) {
    return this.admin.setSellerVisibility(sellerId, input.hidden, request.storeUser!.id);
  }
  @Get('coupons') coupons() { return this.admin.listCoupons(); }
  @Post('coupons') createCoupon(@Body() input: CouponDto, @Req() request: StoreRequest) { return this.admin.createCoupon(input, request.storeUser!.id); }
  @Patch('coupons/:code/active') setCouponActive(@Param('code') code: string, @Body() body: CouponActiveDto, @Req() request: StoreRequest) { return this.admin.setCouponActive(code, body.active, request.storeUser!.id); }
  @Get('orders') orders(@Query() query: AdminOrdersQueryDto) { return this.admin.listOrders(query); }
  @Get('cancellation-requests') cancellationRequests() { return this.admin.listCancellationRequests(); }
  @Patch('cancellation-requests/:orderId') reviewCancellationRequest(@Param('orderId') orderId: string, @Body() input: CancellationRequestReviewDto, @Req() request: StoreRequest) {
    return this.admin.reviewCancellationRequest(orderId, input, request.storeUser!.id);
  }
  @Post('orders/:id/delivery') async deliver(@Param('id') id: string, @Body() body: DeliveryDto, @Req() request: StoreRequest) {
    return this.commerce.saveDelivery(id, body.credentials, request.storeUser!.id);
  }
}
