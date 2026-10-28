import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from '../../common/auth.types';

export type StoreRequest = Request & { storeUser?: AuthenticatedUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StoreRequest>();
    const user = await this.auth.userFromCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException('Entre na sua conta para continuar.');
    request.storeUser = user;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StoreRequest>();
    if (!request.storeUser) throw new UnauthorizedException('Entre na sua conta para continuar.');
    if (request.storeUser.role !== 'admin') throw new ForbiddenException('Acesso restrito à administração.');
    return true;
  }
}
