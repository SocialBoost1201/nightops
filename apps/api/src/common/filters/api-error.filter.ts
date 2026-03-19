import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Doc-11 準拠のグローバル例外フィルター
 *
 * レスポンス形式:
 * {
 *   success: false,
 *   error: { code: string, message: string, detail?: string, correlationId?: string }
 * }
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiErrorFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const correlationId = request.headers['x-correlation-id'] as string | undefined;

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'SYS_001';
        let message = 'システムエラーが発生しました。しばらくしてから再試行してください';
        let detail: string | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse as Record<string, any>;

                // NestJS の ValidationPipe エラー
                if (resp.message && Array.isArray(resp.message)) {
                    code = 'VALID_001';
                    message = '入力必須項目が不足しています';
                    detail = resp.message.join('; ');
                }
                // カスタムエラー（Guards 等で throw される形式）
                else if (resp.error?.code) {
                    code = resp.error.code;
                    message = resp.error.message || message;
                }
                // その他の HttpException
                else if (typeof resp.message === 'string') {
                    message = resp.message;
                }
            }
        }

        // 500系はログ出力
        if (status >= 500) {
            this.logger.error(
                `[${code}] ${message}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        }

        response.status(status).json({
            success: false,
            error: {
                code,
                message,
                ...(detail ? { detail } : {}),
                ...(correlationId ? { correlationId } : {}),
            },
        });
    }
}
