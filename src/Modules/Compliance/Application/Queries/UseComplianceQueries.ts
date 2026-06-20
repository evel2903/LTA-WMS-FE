import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { complianceQueryKeys } from '@modules/Compliance/Application/Queries/ComplianceQueryKeys';
import type {
  AuditLogFilter,
  ExceptionListFilter,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import { complianceRepository } from '@modules/Compliance/Infrastructure/Repositories/ComplianceRepositoryInstance';

export function useAuditLogs(filter: AuditLogFilter = {}) {
  return useQuery({
    queryKey: complianceQueryKeys.auditLogs(filter),
    queryFn: () => complianceRepository.listAuditLogs(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: complianceQueryKeys.auditLogDetail(id ?? ''),
    queryFn: () => complianceRepository.getAuditLog(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useExceptions(filter: ExceptionListFilter = {}) {
  return useQuery({
    queryKey: complianceQueryKeys.exceptions(filter),
    queryFn: () => complianceRepository.listExceptions(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useExceptionDetail(id: string | null) {
  return useQuery({
    queryKey: complianceQueryKeys.exceptionDetail(id ?? ''),
    queryFn: () => complianceRepository.getException(id ?? ''),
    enabled: Boolean(id),
  });
}
