import { BadRequestException, Body, Controller, Get, Header, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, StoreRequest } from '../auth/session.guard';
import { CommerceService } from './commerce.service';
import { CancellationRequestDto, CreateOrderDto, OrderHistoryQueryDto, WalletTopupDto } from './commerce.dto';
import { PaymentsService } from '../payments/payments.service';
import { requirePaymentCategoryApproval } from '../legal/commerce-release-status';

@Controller()
@UseGuards(SessionGuard)
export class CommerceController {
  constructor(private readonly commerce: CommerceService, private readonly payments: PaymentsService) {}
  @Get('wallet') @Header('Cache-Control', 'private, no-store') wallet(@Req() request: StoreRequest) { return this.commerce.wallet(request.storeUser!.id); }
  @Header('Cache-Control', 'private, no-store')
  @Get('orders') orders(@Req() request: StoreRequest, @Query() query: OrderHistoryQueryDto) {
    return this.commerce.orders(request.storeUser!.id, query.page, query.pageSize);
  }
  @Get('orders/:id/cancellation-request') @Header('Cache-Control', 'private, no-store') cancellationRequest(@Param('id') id: string, @Req() request: StoreRequest) { return this.commerce.cancellationRequestForCustomer(id, request.storeUser!.id); }
  @Header('Cache-Control', 'private, no-store')
  @Post('orders/:id/cancellation-request') cancellationRequestCreate(@Param('id') id: string, @Body() body: CancellationRequestDto, @Req() request: StoreRequest) {
    return this.commerce.createCancellationRequest(id, request.storeUser!.id, body.message ?? '');
  }
  @Get('orders/:id/delivery') @Header('Cache-Control', 'private, no-store') delivery(@Param('id') id: string, @Req() request: StoreRequest) { return this.commerce.deliveryForCustomer(id, request.storeUser!.id); }
  @Header('Cache-Control', 'private, no-store')
  @Post('checkout') async checkout(@Req() request: StoreRequest, @Body() body: CreateOrderDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) throw new BadRequestException('Cabeçalho Idempotency-Key obrigatório.');
    const gateway = body.gateway ?? 'mercadopago';
    if (body.paymentMethod === 'pix') {
      requirePaymentCategoryApproval(gateway);
      this.payments.assertProviderAvailable(gateway);
    }
    const created = await this.commerce.createOrder(request.storeUser!, body, idempotencyKey);
    if (created.order.payment_method === 'wallet') return { order: created.order };
    return { order: created.order, pix: await this.payments.createPix(gateway, created.order, created.email) };
  }
  @Header('Cache-Control', 'private, no-store')
  @Post('wallet/topups') async topup(@Req() request: StoreRequest, @Body() body: WalletTopupDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) throw new BadRequestException('Cabeçalho Idempotency-Key obrigatório.');
    requirePaymentCategoryApproval('mercadopago');
    this.payments.assertProviderAvailable('mercadopago');
    const created = await this.commerce.createWalletTopup(request.storeUser!, Number(body.amountCents), idempotencyKey);
    return { order: created.order, pix: await this.payments.createPix('mercadopago', created.order, created.email) };
  }
}
