/**
 * Cross-cutting API contract types. The backend uses a PascalCase envelope for
 * every endpoint (`{ Success, Data }` on success, `{ Success, Errors }` on
 * failure). Module-specific payload shapes live under each module's
 * Infrastructure/Dtos folder.
 */

/** Standard success envelope. */
export interface ApiResponse<TData> {
  Success: true;
  Data: TData;
}

/** A single normalised backend error. */
export interface ApiErrorItem {
  Code: ApiErrorCode;
  Message: string;
  Details?: unknown;
}

/** Error envelope returned on 4xx/5xx. */
export interface ApiErrorBody {
  Success: false;
  Errors: ApiErrorItem[];
}

/** Error codes the backend may return (see Auth-Integration-FE.md §2). */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'UNKNOWN'
  | 'NETWORK_ERROR';

/** Cursor/offset paginated list envelope (for future WMS list endpoints). */
export interface PaginatedResponse<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Common query params for list endpoints. */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}
