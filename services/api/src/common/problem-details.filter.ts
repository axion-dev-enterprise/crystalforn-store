import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
};

const localizedTitles: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  405: 'Método não permitido',
  409: 'Conflito',
  413: 'Conteúdo muito grande',
  415: 'Tipo de conteúdo não suportado',
  422: 'Dados não processáveis',
  429: 'Muitas requisições',
  500: 'Erro interno',
  503: 'Serviço indisponível',
};

export function writeProblemDetails(response: Response, status: number, detail: string, instance: string, traceId = randomUUID()): string {
  const problem: ProblemDetails = {
    type: 'about:blank',
    title: localizedTitles[status] ?? 'Erro na requisição',
    status,
    detail,
    instance: instance || '/',
    traceId,
  };
  response.setHeader('X-Trace-Id', traceId);
  response.status(status).type('application/problem+json').json(problem);
  return traceId;
}

function getSafeDetail(exception: unknown, status: number): string {
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR || !(exception instanceof HttpException)) {
    return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
  }

  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object' || Array.isArray(response)) return exception.message;

  const body = response as Record<string, unknown>;
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.message)) {
    const messages = body.message.filter((value): value is string => typeof value === 'string');
    if (messages.length) return messages.join(' ');
  }
  return exception.message;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceId = randomUUID();
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(`request_failed traceId=${traceId} status=${status}`);
    const detail = getSafeDetail(exception, status);
    writeProblemDetails(response, status, detail, request.path, traceId);
  }
}
