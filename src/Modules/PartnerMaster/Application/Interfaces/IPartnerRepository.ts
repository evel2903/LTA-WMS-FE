import type { PaginatedResponse } from '@shared/Types/Api';
import type { Partner } from '@modules/PartnerMaster/Domain/Types/Partner';
import type {
  CreatePartnerInput,
  DeactivatePartnerInput,
  PartnerListFilter,
  ResolvePartnerByReferenceInput,
  UpdatePartnerInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';

export interface IPartnerRepository {
  list(filter?: PartnerListFilter): Promise<PaginatedResponse<Partner>>;
  getById(id: string): Promise<Partner>;
  resolveByReference(input: ResolvePartnerByReferenceInput): Promise<Partner>;
  create(input: CreatePartnerInput): Promise<Partner>;
  update(id: string, input: UpdatePartnerInput): Promise<Partner>;
  deactivate(id: string, input: DeactivatePartnerInput): Promise<Partner>;
}
