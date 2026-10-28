import { Body, Controller, Get, GoneException, Headers, Post, Query, Req, Res, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionGuard, StoreRequest } from './session.guard';
import { CredentialsDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('central/login') centralLogin(@Query('client') client: string, @Res() response: Response) {
    return response.redirect(302, this.auth.centralLoginUrl(client || 'crystalforn'));
  }

  @Post('central/callback') async centralCallback(@Body('code') code: string, @Req() request: Request, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    let appOrigin: URL;
    try { appOrigin = new URL(process.env.APP_ORIGIN || ''); }
    catch { throw new ServiceUnavailableException('APP_ORIGIN inválida para retorno de autenticação.'); }
    if (appOrigin.username || appOrigin.password || appOrigin.search || appOrigin.hash
      || (process.env.NODE_ENV === 'production' && appOrigin.protocol !== 'https:')) {
      throw new ServiceUnavailableException('APP_ORIGIN inválida para retorno de autenticação.');
    }
    if (request.get('host') !== appOrigin.host) throw new ServiceUnavailableException('Host do retorno de autenticação inválido.');
    await this.auth.consumeCentralCode(code, response);
    return response.redirect(303, `${appOrigin.origin}/cliente`);
  }

  @Post('admin/login') async adminLogin(@Body() credentials: CredentialsDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.auth.loginAdmin(credentials.email, credentials.password, request.ip || request.socket.remoteAddress || 'unknown', response);
  }

  @Post('register') register() { throw new GoneException('Cadastro local removido. Use o fluxo central da Crystalforn.'); }
  @Post('login') login() { throw new GoneException('Login local removido. Use o fluxo central da Crystalforn.'); }
  @Post('logout') async logout(@Headers('cookie') cookie: string, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(cookie, response);
    return { ok: true };
  }
  @Get('me') @UseGuards(SessionGuard) me(@Req() request: StoreRequest) { return request.storeUser; }
}
