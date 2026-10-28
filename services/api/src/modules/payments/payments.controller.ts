import { Controller, Get, Header, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { SessionGuard } from '../auth/session.guard';
import type { StoreRequest } from '../auth/session.guard';
import { Get as HttpGet } from '@nestjs/common';
import { Param } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { requireMarketplaceCompliance } from '../legal/commerce-release-status';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly db: DatabaseService) {}

  @Post('webhooks/mercadopago') async mercadoPago(
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Query('data.id') dataId: string,
    @Query('type') type: string,
    @Req() request: Request,
  ) {
    requireMarketplaceCompliance();
    const body = request.body as { id?: string | number };
    return this.payments.handleMercadoPagoWebhook({ signature, requestId, dataId, eventId: body?.id == null ? dataId : String(body.id), type });
  }

  @Post('webhooks/pushinpay') async pushinPay(
    @Headers('x-pushinpay-secret') secret: string,
    @Req() request: Request,
  ) {
    requireMarketplaceCompliance();
    const body = request.body as { id?: string; value?: number | string; status?: string };
    return this.payments.handlePushinPayWebhook({ secret, id: body?.id, value: body?.value, status: body?.status });
  }

  @HttpGet('payments/orders/:id') @Header('Cache-Control', 'private, no-store') @UseGuards(SessionGuard) async status(@Param('id') id: string, @Req() request: StoreRequest) {
    const result = await this.db.query(
      `SELECT o.id,o.status AS order_status,o.total_cents,p.status AS payment_status,p.pix_copy_paste,p.pix_qr_base64,p.expires_at
       FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=$1 AND o.user_id=$2`, [id, request.storeUser!.id]);
    return result.rows[0] ?? { status: 'not_found' };
  }
}
