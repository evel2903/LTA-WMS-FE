import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  CycleCountAdjustmentResult,
  CycleCountMutationResult,
  CycleCountWork,
} from '@modules/CycleCount/Domain/Types/CycleCountWork';
import type {
  CreateCycleCountWorkInput,
  CycleCountReasonedInput,
  CycleCountWorkListFilter,
  PostCycleCountAdjustmentInput,
  SubmitCycleCountWorkInput,
} from '@modules/CycleCount/Domain/Types/CycleCountQuery';

export interface ICycleCountRepository {
  list(filter?: CycleCountWorkListFilter): Promise<PaginatedResponse<CycleCountWork>>;
  getById(id: string): Promise<CycleCountMutationResult>;
  create(input: CreateCycleCountWorkInput): Promise<CycleCountMutationResult>;
  submit(id: string, input: SubmitCycleCountWorkInput): Promise<CycleCountMutationResult>;
  recount(id: string, input: CycleCountReasonedInput): Promise<CycleCountMutationResult>;
  postAdjustment(id: string, input: PostCycleCountAdjustmentInput): Promise<CycleCountAdjustmentResult>;
  unlock(id: string, input: CycleCountReasonedInput): Promise<CycleCountMutationResult>;
}
