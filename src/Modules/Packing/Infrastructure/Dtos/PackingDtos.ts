import type {
  LabelBlockingDecision,
  PackageCheckResult,
  PackageStatus,
  PackSessionStatus,
} from '@modules/Packing/Domain/Types/Packing';

export interface PackSessionDto {
  Id: string;
  SessionNumber: string;
  PickTaskId: string;
  MobileTaskId: string | null;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: PackSessionStatus;
  CheckRequired: boolean;
  CheckResult: PackageCheckResult;
  CheckExceptionCaseId: string | null;
  StartedAt: string;
  StartedBy: string | null;
  CheckedAt: string | null;
  CheckedBy: string | null;
}

export interface PackageContentDto {
  Id: string;
  PackageId: string;
  PickTaskId: string;
  OutboundOrderLineId: string;
  SourceBalanceId: string;
  SourceDimensionId: string;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  InventoryStatusCode: string | null;
  LotNumber: string | null;
  SerialNumber: string | null;
  ExpiryDate: string | null;
  CreatedAt: string;
}

export interface PackageDto {
  Id: string;
  PackageCode: string;
  PackSessionId: string;
  PickTaskId: string;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: PackageStatus;
  CheckRequired: boolean;
  CheckResult: PackageCheckResult;
  CartonType: string;
  Weight: number | null;
  Length: number | null;
  Width: number | null;
  Height: number | null;
  LabelBlockingDecision: LabelBlockingDecision | null;
  LabelPrintJobId: string | null;
  LabelPrintJobCode: string | null;
  ClosedAt: string | null;
  ClosedBy: string | null;
  ReadyForStagingAt: string | null;
  ReadyForStagingBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Contents: PackageContentDto[];
}

export interface PageMetaDto {
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface PagedPackageDto {
  Items: PackageDto[];
  Meta?: PageMetaDto;
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
}

export interface StartPackSessionRequestDto {
  PickTaskId: string;
  MobileTaskId?: string;
  WarehouseProfileId: string;
  CheckRequired?: boolean;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface RecordPackCheckRequestDto {
  CheckResult: PackageCheckResult;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  ObservedQuantity?: number;
  ObservedSkuId?: string;
  ObservedSkuCode?: string;
  Weight?: number;
  IdempotencyKey: string;
}

export interface CreatePackageContentRequestDto {
  PickTaskId?: string;
  Quantity?: number;
}

export interface CreatePackageRequestDto {
  PackSessionId: string;
  CartonType: string;
  Weight?: number;
  Length?: number;
  Width?: number;
  Height?: number;
  Contents?: CreatePackageContentRequestDto[];
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ClosePackageRequestDto {
  CartonType?: string;
  Weight?: number;
  Length?: number;
  Width?: number;
  Height?: number;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ReadyForStagingRequestDto {
  AttemptOverride?: boolean;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  LabelType?: string;
  IdempotencyKey: string;
}

export interface LabelBlockingValidationResultDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: LabelBlockingDecision;
  RequiredLabelType: string | null;
  PolicyMode: string;
  OverrideAllowed: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  MatchedPrintJobId: string | null;
  MatchedPrintJobCode: string | null;
  ValidationDetails: Record<string, unknown>;
}

export interface ReadyForStagingResultDto {
  Package: PackageDto;
  LabelValidation: LabelBlockingValidationResultDto;
  IsDuplicate: boolean;
}
