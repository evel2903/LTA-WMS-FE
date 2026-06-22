import type { PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';

interface PageFilter {
  page?: number;
  pageSize?: number;
}

export interface PartnerListFilter extends PageFilter {
  partnerType?: PartnerType;
  status?: PartnerStatus;
  partnerCode?: string;
  partnerName?: string;
  externalReference?: string;
}

export interface ResolvePartnerByReferenceInput {
  partnerType: PartnerType;
  sourceSystem: string;
  externalReference: string;
}

export interface CreatePartnerInput {
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  sourceSystem: string;
  externalReference: string;
  referenceText?: string | null;
}

export type UpdatePartnerInput = Partial<CreatePartnerInput>;

export interface DeactivatePartnerInput {
  reasonCode: string;
}
