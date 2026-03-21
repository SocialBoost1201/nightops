import { Request } from 'express';
import { AppErrorCode } from './error-codes';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  error: {
    code: AppErrorCode | string;
    message: string;
    field?: string;
    correlationId: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const getCorrelationId = (req: Request): string => {
  return String((req as any).correlationId || req.headers['x-correlation-id'] || 'unknown');
};
