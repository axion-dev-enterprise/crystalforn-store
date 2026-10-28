import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard, SessionGuard, StoreRequest } from '../auth/session.guard';
import { AdminService } from './admin.service';
import { CancellationRequestReviewDto } from '../commerce/commerce.dto';
import { AdminOrdersQueryDto, CouponActiveDto, CouponDto, DeliveryDto, StoreSettingsDto } from './admin.dto';
import { CommerceService } from '../commerce/commerce.service';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly commerce: CommerceService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('settings') settings() { return this.admin.getSettings(); }
  @Put('settings') setSettings(@Body() input: StoreSettingsDto) { return this.admin.setSettings(input); }
  @Get('coupons') coupons() { return this.admin.listCoupons(); }
  @Post('coupons') createCoupon(@Body() input: CouponDto) { return this.admin.createCoupon(input); }
  @Patch('coupons/:code/active') setCouponActive(@Param('code') code: string, @Body() body: CouponActiveDto) { return this.admin.setCouponActive(code, body.active); }
  @Get('orders') orders(@Query() query: AdminOrdersQueryDto) { return this.admin.listOrders(query); }
  @Get('cancellation-requests') cancellationRequests() { return this.admin.listCancellationRequests(); }
  @Patch('cancellation-requests/:orderId') reviewCancellationRequest(@Param('orderId') orderId: string, @Body() input: CancellationRequestReviewDto, @Req() request: StoreRequest) {
    return this.admin.reviewCancellationRequest(orderId, input, request.storeUser!.id);
  }
  @Post('orders/:id/delivery') async deliver(@Param('id') id: string, @Body() body: DeliveryDto, @Req() request: StoreRequest) {
    return this.commerce.saveDelivery(id, body.credentials, request.storeUser!.id);
  }
}
