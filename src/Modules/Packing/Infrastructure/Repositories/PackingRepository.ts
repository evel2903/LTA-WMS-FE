import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPackingRepository } from '@modules/Packing/Application/Interfaces/IPackingRepository';
import {
  PACKING_DEFAULT_PAGE_SIZE,
  PACKING_MAX_PAGE_SIZE,
} from '@modules/Packing/Domain/Constants/PackingConstants';
import type {
  PackSession,
  Package,
  ReadyForStagingResult,
} from '@modules/Packing/Domain/Types/Packing';
import type {
  ClosePackageInput,
  CreatePackageInput,
  PackageListFilter,
  ReadyForStagingInput,
  RecordPackCheckInput,
  StartPackSessionInput,
} from '@modules/Packing/Domain/Types/PackingQuery';
import { PACKING_ENDPOINTS } from '@modules/Packing/Infrastructure/Api/PackingEndpoints';
import type {
  PackSessionDto,
  PackageDto,
  PagedPackageDto,
  ReadyForStagingResultDto,
} from '@modules/Packing/Infrastructure/Dtos/PackingDtos';
import { PackingMapper } from '@modules/Packing/Infrastructure/Mappers/PackingMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return PACKING_DEFAULT_PAGE_SIZE;
  return Math.min(value, PACKING_MAX_PAGE_SIZE);
}

function pageNumber(value?: number): number {
  if (!value || value < 1) return 1;
  return value;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class PackingRepository implements IPackingRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: PackageListFilter = {}): Promise<PaginatedResponse<Package>> {
    const dto = await this.http.get<PagedPackageDto>(PACKING_ENDPOINTS.PACKAGES, {
      params: removeUndefined({
        Page: pageNumber(filter.page),
        PageSize: pageSize(filter.pageSize),
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        Status: filter.status,
        PickTaskId: filter.pickTaskId,
        OutboundOrderId: filter.outboundOrderId,
      }),
    });
    return PackingMapper.toPaged(dto);
  }

  async getById(id: string): Promise<Package> {
    const dto = await this.http.get<PackageDto>(PACKING_ENDPOINTS.PACKAGE_BY_ID(id));
    return PackingMapper.toPackage(dto);
  }

  async startSession(input: StartPackSessionInput): Promise<PackSession> {
    const dto = await this.http.post<PackSessionDto>(
      PACKING_ENDPOINTS.START_SESSION,
      PackingMapper.toStartSessionRequest(input),
    );
    return PackingMapper.toSession(dto);
  }

  async recordCheck(sessionId: string, input: RecordPackCheckInput): Promise<PackSession> {
    const dto = await this.http.post<PackSessionDto>(
      PACKING_ENDPOINTS.RECORD_CHECK(sessionId),
      PackingMapper.toRecordCheckRequest(input),
    );
    return PackingMapper.toSession(dto);
  }

  async createPackage(input: CreatePackageInput): Promise<Package> {
    const dto = await this.http.post<PackageDto>(
      PACKING_ENDPOINTS.PACKAGES,
      PackingMapper.toCreatePackageRequest(input),
    );
    return PackingMapper.toPackage(dto);
  }

  async closePackage(id: string, input: ClosePackageInput): Promise<Package> {
    const dto = await this.http.post<PackageDto>(
      PACKING_ENDPOINTS.CLOSE_PACKAGE(id),
      PackingMapper.toClosePackageRequest(input),
    );
    return PackingMapper.toPackage(dto);
  }

  async readyForStaging(
    id: string,
    input: ReadyForStagingInput,
  ): Promise<ReadyForStagingResult> {
    const dto = await this.http.post<ReadyForStagingResultDto>(
      PACKING_ENDPOINTS.READY_FOR_STAGING(id),
      PackingMapper.toReadyForStagingRequest(input),
    );
    return PackingMapper.toReadyResult(dto);
  }
}
