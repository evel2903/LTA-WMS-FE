import type { PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';

export interface PartnerDto {
  Id: string;
  PartnerCode: string;
  PartnerName: string;
  PartnerType: PartnerType;
  Status: PartnerStatus;
  SourceSystem: string;
  ExternalReference: string;
  ReferenceText: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PagedPartnerDto {
  Items?: PartnerDto[];
  Meta?: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface CreatePartnerRequestDto {
  PartnerCode: string;
  PartnerName: string;
  PartnerType: PartnerType;
  Status: PartnerStatus;
  SourceSystem: string;
  ExternalReference: string;
  ReferenceText?: string;
}

export type UpdatePartnerRequestDto = Partial<Omit<CreatePartnerRequestDto, 'PartnerType'>>;

export interface DeactivatePartnerRequestDto {
  ReasonCode: string;
}
