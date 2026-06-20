import type { PaginatedResponse } from '@shared/Types/Api';
import type { AuditLogEntry, ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import type {
  AssignExceptionInput,
  AuditLogFilter,
  ExceptionListFilter,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';

/** Application port for the Audit Log (read-only) + Exception Queue (lifecycle) surface. */
export interface IComplianceRepository {
  // Audit Log — read-only (immutable; no write endpoints exist)
  listAuditLogs(filter?: AuditLogFilter): Promise<PaginatedResponse<AuditLogEntry>>;
  getAuditLog(id: string): Promise<AuditLogEntry>;

  // Exception Queue — read + lifecycle transitions
  listExceptions(filter?: ExceptionListFilter): Promise<PaginatedResponse<ExceptionCase>>;
  getException(id: string): Promise<ExceptionCase>;
  logException(id: string, input: LogExceptionInput): Promise<ExceptionCase>;
  assignException(id: string, input: AssignExceptionInput): Promise<ExceptionCase>;
  submitException(id: string, input: SubmitExceptionInput): Promise<ExceptionCase>;
  resolveException(id: string, input: ResolveExceptionInput): Promise<ExceptionCase>;
  closeException(id: string): Promise<ExceptionCase>;
}
