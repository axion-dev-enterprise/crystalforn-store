import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get() async health() {
    try { await this.db.query('SELECT 1'); return { status: 'ok', database: 'connected' }; }
    catch { throw new ServiceUnavailableException({ status: 'unavailable', database: 'disconnected' }); }
  }
}
