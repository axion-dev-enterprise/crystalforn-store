import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { OriginMiddleware } from './common/origin.middleware';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AdminGuard, SessionGuard } from './modules/auth/session.guard';
import { CatalogController } from './modules/catalog/catalog.controller';
import { CatalogService } from './modules/catalog/catalog.service';
import { AdminController } from './modules/admin/admin.controller';
import { AdminService } from './modules/admin/admin.service';
import { CommerceController } from './modules/commerce/commerce.controller';
import { CommerceService } from './modules/commerce/commerce.service';
import { PaymentsController } from './modules/payments/payments.controller';
import { PaymentsService } from './modules/payments/payments.service';
import { InternalCatalogController } from './modules/catalog/internal-catalog.controller';
import { HealthController } from './modules/health.controller';
import { TermsController } from './modules/legal/terms.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, AuthController, CatalogController, InternalCatalogController, AdminController, CommerceController, PaymentsController, TermsController],
  providers: [AuthService, SessionGuard, AdminGuard, CatalogService, AdminService, CommerceService, PaymentsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void { consumer.apply(OriginMiddleware).forRoutes('*'); }
}
