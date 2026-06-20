import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  AuditLogFilter,
  ExceptionListFilter,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';

export const complianceQueryKeys = {
  all: [QUERY_NAMESPACES.COMPLIANCE] as const,
  auditLogs: (filter?: AuditLogFilter) => [...complianceQueryKeys.all, 'auditLogs', filter ?? {}] as const,
  auditLogDetail: (id: string) => [...complianceQueryKeys.all, 'auditLog', id] as const,
  exceptions: (filter?: ExceptionListFilter) =>
    [...complianceQueryKeys.all, 'exceptions', filter ?? {}] as const,
  exceptionDetail: (id: string) => [...complianceQueryKeys.all, 'exception', id] as const,
};
