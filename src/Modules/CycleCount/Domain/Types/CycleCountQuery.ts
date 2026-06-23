import type { CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

export interface CycleCountWorkListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  workStatus?: CycleCountWorkStatus;
}

export interface CreateCycleCountWorkInput {
  sourceBalanceId: string;
  quantity: number;
  toleranceQuantity?: number;
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface SubmitCycleCountWorkInput {
  countedQuantity: number;
  approvalRequestId?: string;
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface CycleCountReasonedInput {
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface PostCycleCountAdjustmentInput extends CycleCountReasonedInput {
  approvalRequestId?: string;
}
