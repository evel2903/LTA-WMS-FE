import type { PutawayTaskStatus } from '@modules/Putaway/Domain/Types/PutawayTask';

export interface PutawayTaskDto {
  Id: string;
  TaskCode: string;
  TaskStatus: PutawayTaskStatus;
  InboundPutawayReleaseId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  InboundLpnId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  LpnCode: string | null;
  SsccCode: string | null;
  InventoryStatusCode: string;
  SourceLocationId: string | null;
  SourceLocationCode: string | null;
  TargetLocationId: string;
  TargetLocationCode: string;
  TargetLocationProfileId: string | null;
  Priority: number;
  WorkPoolCode: string | null;
  AssignedUserId: string | null;
  ConstraintJson: Record<string, unknown> | null;
  EligibilityDecisionJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  MobileTaskId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ReleasedAt: string;
  ReleasedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PagedPutawayTaskDto {
  Items: PutawayTaskDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface ReleasePutawayTaskRequestDto {
  InboundPutawayReleaseId: string;
  SourceLocationId?: string | null;
  SourceLocationCode?: string | null;
  TargetLocationId?: string | null;
  Priority?: number;
  WorkPoolCode?: string | null;
  AssignedUserId?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}
