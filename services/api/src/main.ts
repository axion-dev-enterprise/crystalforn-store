import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemDetailsFilter, writeProblemDetails } from './common/problem-details.filter';
import { integerEnv } from './common/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração obrigatória ausente: ${name}`);
  return value;
}

async function bootstrap(): Promise<void> {
  required('DATABASE_URL');
  required('APP_ORIGIN');
  const pepper = required('SESSION_PEPPER');
  const encryptionKey = required('DELIVERY_ENCRYPTION_KEY');
  if (!/^[a-f\d]{64}$/i.test(pepper) || !/^[a-f\d]{64}$/i.test(encryptionKey)) {
    throw new Error('SESSION_PEPPER e DELIVERY_ENCRYPTION_KEY devem conter 32 bytes em hexadecimal.');
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  const parserLogger = new Logger('RequestParser');
  app.use((error: unknown, request: Request, response: Response, next: NextFunction) => {
    if (response.headersSent) return next(error);
    const candidate = error && typeof error === 'object'
      ? Number((error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode)
      : Number.NaN;
    const status = Number.isInteger(candidate) && candidate >= 400 && candidate < 500 ? candidate : 500;
    const detail = status >= 500
      ? 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
      : status === 413 ? 'O corpo da requisição excede o limite permitido.' : 'O corpo da requisição é inválido.';
    const traceId = writeProblemDetails(response, status, detail, request.path);
    if (status >= 500) parserLogger.error(`request_parse_failed traceId=${traceId} status=${status}`);
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: required('APP_ORIGIN'), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(integerEnv('PORT', 4000, 1, 65_535), 'REDACTED_IP_ADDRESS');
}

void bootstrap();
