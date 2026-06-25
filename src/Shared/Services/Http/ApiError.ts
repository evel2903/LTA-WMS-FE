import type { ApiErrorBody, ApiErrorCode } from '@shared/Types/Api';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'UNKNOWN',
};

/**
 * Framework-agnostic error type. The Axios interceptor normalises every
 * failure into an `ApiError` (reading the backend's `{ Success:false, Errors }`
 * envelope) so the rest of the app — including the Domain layer, which must not
 * know about Axios — deals with a single shape.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(params: { status: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Build from the backend error envelope (or fall back by HTTP status). */
  static fromBody(status: number, body?: Partial<ApiErrorBody>): ApiError {
    const first = body?.Errors?.[0];
    const message = first?.Message?.trim();
    return new ApiError({
      status,
      code: first?.Code ?? STATUS_TO_CODE[status] ?? 'UNKNOWN',
      message: message || 'Đã xảy ra lỗi không mong muốn.',
      details: first?.Details,
    });
  }
}
