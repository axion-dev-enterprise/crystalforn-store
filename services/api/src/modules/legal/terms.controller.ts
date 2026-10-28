import { Controller, Get } from '@nestjs/common';
import { purchaseTermsStatus } from './terms-status';

@Controller('legal')
export class TermsController {
  @Get('terms/status') status() { return purchaseTermsStatus(); }
}
