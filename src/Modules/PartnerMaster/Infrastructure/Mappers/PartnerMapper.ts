import type { PaginatedResponse } from '@shared/Types/Api';
import type { Partner } from '@modules/PartnerMaster/Domain/Types/Partner';
import type {
  CreatePartnerInput,
  DeactivatePartnerInput,
  UpdatePartnerInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';
import type {
  CreatePartnerRequestDto,
  DeactivatePartnerRequestDto,
  PagedPartnerDto,
  PartnerDto,
  UpdatePartnerRequestDto,
} from '@modules/PartnerMaster/Infrastructure/Dtos/PartnerDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as Partial<T>;
}

export const PartnerMapper = {
  toPartner(dto: PartnerDto): Partner {
    return {
      id: dto.Id,
      partnerCode: dto.PartnerCode,
      partnerName: dto.PartnerName,
      partnerType: dto.PartnerType,
      status: dto.Status,
      sourceSystem: dto.SourceSystem,
      externalReference: dto.ExternalReference,
      referenceText: dto.ReferenceText,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toPaged(dto: PagedPartnerDto): PaginatedResponse<Partner> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => PartnerMapper.toPartner(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toCreateRequest(input: CreatePartnerInput): CreatePartnerRequestDto {
    return removeEmpty({
      PartnerCode: input.partnerCode,
      PartnerName: input.partnerName,
      PartnerType: input.partnerType,
      Status: input.status,
      SourceSystem: input.sourceSystem,
      ExternalReference: input.externalReference,
      ReferenceText: input.referenceText,
    }) as CreatePartnerRequestDto;
  },

  toUpdateRequest(input: UpdatePartnerInput): UpdatePartnerRequestDto {
    return removeEmpty({
      PartnerCode: input.partnerCode,
      PartnerName: input.partnerName,
      PartnerType: input.partnerType,
      Status: input.status,
      SourceSystem: input.sourceSystem,
      ExternalReference: input.externalReference,
      ReferenceText: input.referenceText,
    }) as UpdatePartnerRequestDto;
  },

  toDeactivateRequest(input: DeactivatePartnerInput): DeactivatePartnerRequestDto {
    return { ReasonCode: input.reasonCode };
  },
};
