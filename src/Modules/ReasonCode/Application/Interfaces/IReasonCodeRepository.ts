import type { PaginatedResponse } from '@shared/Types/Api';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import type {
  CreateReasonCodeInput,
  ReasonCodeFilter,
  UpdateReasonCodeInput,
} from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';

/** Application port for the reason-code catalog (C3). No delete — deactivate via PATCH status. */
export interface IReasonCodeRepository {
  list(filter?: ReasonCodeFilter): Promise<PaginatedResponse<ReasonCode>>;
  getById(id: string): Promise<ReasonCode>;
  create(input: CreateReasonCodeInput): Promise<ReasonCode>;
  update(id: string, input: UpdateReasonCodeInput): Promise<ReasonCode>;
}
