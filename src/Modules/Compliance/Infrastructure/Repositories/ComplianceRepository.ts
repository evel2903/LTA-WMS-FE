import type { HttpClient } from '@shared/Services/Http/ApiClient';
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
import type { IComplianceRepository } from '@modules/Compliance/Application/Interfaces/IComplianceRepository';
import { COMPLIANCE_ENDPOINTS } from '@modules/Compliance/Infrastructure/Api/ComplianceEndpoints';
import type {
  AuditLogDto,
  ExceptionCaseDto,
  PagedDto,
} from '@modules/Compliance/Infrastructure/Dtos/ComplianceDtos';
import { ComplianceMapper } from '@modules/Compliance/Infrastructure/Mappers/ComplianceMapper';

const DEFAULT_PAGE_SIZE = 20;

/** The single place that touches `httpClient` for the audit + exception surface. */
export class ComplianceRepository implements IComplianceRepository {
  constructor(private readonly http: HttpClient) {}

  async listAuditLogs(filter: AuditLogFilter = {}): Promise<PaginatedResponse<AuditLogEntry>> {
    const dto = await this.http.get<PagedDto<AuditLogDto>>(COMPLIANCE_ENDPOINTS.AUDIT_LOGS, {
      params: {
        Page: filter.page ?? 1,
        PageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
        ActorUserId: filter.actorUserId,
        Action: filter.action,
        ObjectType: filter.objectType,
        ObjectId: filter.objectId,
        ReasonCodeId: filter.reasonCodeId,
        From: filter.from,
        To: filter.to,
      },
    });
    return ComplianceMapper.toPaged(dto, (item) => ComplianceMapper.toAuditLog(item));
  }

  async getAuditLog(id: string): Promise<AuditLogEntry> {
    const dto = await this.http.get<AuditLogDto>(COMPLIANCE_ENDPOINTS.AUDIT_LOG_BY_ID(id));
    return ComplianceMapper.toAuditLog(dto);
  }

  async listExceptions(filter: ExceptionListFilter = {}): Promise<PaginatedResponse<ExceptionCase>> {
    const dto = await this.http.get<PagedDto<ExceptionCaseDto>>(COMPLIANCE_ENDPOINTS.EXCEPTIONS, {
      params: {
        Page: filter.page ?? 1,
        PageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
        State: filter.state,
        ExceptionType: filter.exceptionType,
        ReferenceType: filter.referenceType,
        ReferenceId: filter.referenceId,
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        AssignedToUserId: filter.assignedToUserId,
        Severity: filter.severity,
      },
    });
    return ComplianceMapper.toPaged(dto, (item) => ComplianceMapper.toException(item));
  }

  async getException(id: string): Promise<ExceptionCase> {
    const dto = await this.http.get<ExceptionCaseDto>(COMPLIANCE_ENDPOINTS.EXCEPTION_BY_ID(id));
    return ComplianceMapper.toException(dto);
  }

  async logException(id: string, input: LogExceptionInput): Promise<ExceptionCase> {
    const dto = await this.http.post<ExceptionCaseDto>(
      COMPLIANCE_ENDPOINTS.EXCEPTION_LOG(id),
      ComplianceMapper.toLogRequest(input),
    );
    return ComplianceMapper.toException(dto);
  }

  async assignException(id: string, input: AssignExceptionInput): Promise<ExceptionCase> {
    const dto = await this.http.post<ExceptionCaseDto>(
      COMPLIANCE_ENDPOINTS.EXCEPTION_ASSIGN(id),
      ComplianceMapper.toAssignRequest(input),
    );
    return ComplianceMapper.toException(dto);
  }

  async submitException(id: string, input: SubmitExceptionInput): Promise<ExceptionCase> {
    const dto = await this.http.post<ExceptionCaseDto>(
      COMPLIANCE_ENDPOINTS.EXCEPTION_SUBMIT(id),
      ComplianceMapper.toSubmitRequest(input),
    );
    return ComplianceMapper.toException(dto);
  }

  async resolveException(id: string, input: ResolveExceptionInput): Promise<ExceptionCase> {
    const dto = await this.http.post<ExceptionCaseDto>(
      COMPLIANCE_ENDPOINTS.EXCEPTION_RESOLVE(id),
      ComplianceMapper.toResolveRequest(input),
    );
    return ComplianceMapper.toException(dto);
  }

  async closeException(id: string): Promise<ExceptionCase> {
    const dto = await this.http.post<ExceptionCaseDto>(COMPLIANCE_ENDPOINTS.EXCEPTION_CLOSE(id), {});
    return ComplianceMapper.toException(dto);
  }
}
