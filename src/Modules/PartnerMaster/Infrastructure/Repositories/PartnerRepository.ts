import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import {
  PARTNER_DEFAULT_PAGE_SIZE,
  PARTNER_MAX_PAGE_SIZE,
} from '@modules/PartnerMaster/Domain/Constants/PartnerConstants';
import type { Partner } from '@modules/PartnerMaster/Domain/Types/Partner';
import type {
  CreatePartnerInput,
  DeactivatePartnerInput,
  PartnerListFilter,
  ResolvePartnerByReferenceInput,
  UpdatePartnerInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';
import { PARTNER_ENDPOINTS } from '@modules/PartnerMaster/Infrastructure/Api/PartnerEndpoints';
import type { PagedPartnerDto, PartnerDto } from '@modules/PartnerMaster/Infrastructure/Dtos/PartnerDtos';
import { PartnerMapper } from '@modules/PartnerMaster/Infrastructure/Mappers/PartnerMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return PARTNER_DEFAULT_PAGE_SIZE;
  return Math.min(value, PARTNER_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class PartnerRepository implements IPartnerRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: PartnerListFilter = {}): Promise<PaginatedResponse<Partner>> {
    const dto = await this.http.get<PagedPartnerDto>(PARTNER_ENDPOINTS.PARTNERS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        PartnerType: filter.partnerType,
        Status: filter.status,
        PartnerCode: filter.partnerCode,
        PartnerName: filter.partnerName,
        ExternalReference: filter.externalReference,
      }),
    });
    return PartnerMapper.toPaged(dto);
  }

  async getById(id: string): Promise<Partner> {
    const dto = await this.http.get<PartnerDto>(PARTNER_ENDPOINTS.PARTNER_BY_ID(id));
    return PartnerMapper.toPartner(dto);
  }

  async resolveByReference(input: ResolvePartnerByReferenceInput): Promise<Partner> {
    const dto = await this.http.get<PartnerDto>(PARTNER_ENDPOINTS.RESOLVE, {
      params: {
        PartnerType: input.partnerType,
        SourceSystem: input.sourceSystem,
        ExternalReference: input.externalReference,
      },
    });
    return PartnerMapper.toPartner(dto);
  }

  async create(input: CreatePartnerInput): Promise<Partner> {
    const dto = await this.http.post<PartnerDto>(
      PARTNER_ENDPOINTS.PARTNERS,
      PartnerMapper.toCreateRequest(input),
    );
    return PartnerMapper.toPartner(dto);
  }

  async update(id: string, input: UpdatePartnerInput): Promise<Partner> {
    const dto = await this.http.patch<PartnerDto>(
      PARTNER_ENDPOINTS.PARTNER_BY_ID(id),
      PartnerMapper.toUpdateRequest(input),
    );
    return PartnerMapper.toPartner(dto);
  }

  async deactivate(id: string, input: DeactivatePartnerInput): Promise<Partner> {
    const dto = await this.http.patch<PartnerDto>(
      PARTNER_ENDPOINTS.DEACTIVATE(id),
      PartnerMapper.toDeactivateRequest(input),
    );
    return PartnerMapper.toPartner(dto);
  }
}
