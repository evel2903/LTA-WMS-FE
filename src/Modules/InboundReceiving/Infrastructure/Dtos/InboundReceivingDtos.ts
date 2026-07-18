import type {
  ControlExceptionSeverity,
  ExceptionState,
  InboundDiscrepancyStatus,
  InboundDiscrepancyToleranceDecision,
  InboundDiscrepancyType,
  QcDispositionCode,
  QcResultStatus,
  QcTaskStatus,
  ReceiptLineDiscrepancySignal,
  ReceiptLineStatus,
  ReceivingSessionStatus,
} from '@modules/InboundReceiving/Domain/Types/Receipt';

export interface ValidateReceivingReadinessRequestDto {
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingReadinessDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: 'Allowed' | 'Blocked' | 'ApprovalRequired' | 'OverrideAccepted';
  GateInRequired: boolean;
  GateInRecorded: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  RuleCode?: string | null;
  InboundPlanId?: string;
  BusinessReference?: string;
}

export interface StartReceivingSessionRequestDto {
  SessionKey?: string | null;
  DeviceCode?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingSessionDto {
  Id: string;
  InboundPlanId: string;
  ReceiptId: string;
  ReceiptNumber: string;
  SessionKey: string;
  DeviceCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  Status: ReceivingSessionStatus;
  StartedAt: string;
  ClosedAt: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  StartedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReceiptLineScanEvidenceDto {
  RawValue?: string | null;
  ParsedValue?: Record<string, unknown> | null;
  ScanEventId?: string | null;
  ScanType?: string | null;
  ScanResult?: string | null;
  ResolvedSkuId?: string | null;
  ResolvedUomId?: string | null;
  ResolvedPackId?: string | null;
  LotNumber?: string | null;
  ExpiryDate?: string | null;
  SerialNumber?: string | null;
  Lpn?: string | null;
}

export interface ConfirmReceiptLineRequestDto {
  InboundPlanLineId: string;
  ActualQuantity: number;
  SkuId?: string | null;
  UomId?: string | null;
  ManualConfirm?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  LotNumber?: string | null;
  ExpiryDate?: string | null;
  SerialNumber?: string | null;
  IdempotencyKey: string;
  ScanEvidence?: ReceiptLineScanEvidenceDto | null;
}

export interface ReceiptLineDto {
  Id: string;
  ReceiptId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number;
  ActualQuantity: number;
  Status: ReceiptLineStatus;
  ManualConfirm: boolean;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  ScanEvidenceJson: Record<string, unknown> | null;
  DiscrepancySignals: ReceiptLineDiscrepancySignal[];
  LotNumber: string | null;
  ExpiryDate: string | null;
  SerialNumber: string | null;
  IdempotencyKey: string;
  ReceivedAt: string;
  ReceivedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ConfirmInboundLpnRequestDto {
  LpnCode: string;
  SsccCode?: string | null;
  Quantity?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface InboundLpnDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  LpnCode: string;
  SsccCode: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ConfirmedAt: string;
  ConfirmedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ReleaseInboundToPutawayRequestDto {
  CurrentLocationId?: string | null;
  CurrentLocationCode?: string | null;
  RequireLpn?: boolean;
  AttemptLabelOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface InboundPutawayReleaseDto {
  Id: string;
  InboundLpnId: string | null;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
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
  CurrentLocationId: string | null;
  CurrentLocationCode: string | null;
  WarehouseProfileId: string | null;
  LabelDecision: string | null;
  LabelReason: string | null;
  MatchedPrintJobId: string | null;
  ConstraintJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  CoreFlowMilestoneId: string | null;
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

export interface CaptureInboundDiscrepancyRequestDto {
  ReceiptLineId: string;
  DiscrepancyType: InboundDiscrepancyType;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  EvidenceJson?: Record<string, unknown> | null;
  IdempotencyKey: string;
}

export interface InboundDiscrepancyDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  DiscrepancyType: InboundDiscrepancyType;
  Status: InboundDiscrepancyStatus;
  ToleranceDecision: InboundDiscrepancyToleranceDecision;
  ExpectedQuantity: number | null;
  ActualQuantity: number | null;
  ReasonCode: string;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  EvidenceJson: Record<string, unknown> | null;
  ExceptionCaseId: string;
  ExceptionState: ExceptionState;
  Severity: ControlExceptionSeverity;
  IdempotencyKey: string;
  RecordedAt: string;
  RecordedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface EvaluateQcTaskRequestDto {
  ReceiptLineId: string;
  IdempotencyKey: string;
  ForceRequired?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface QcTaskDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ActualQuantity: number;
  TaskStatus: QcTaskStatus;
  Required: boolean;
  TriggerReason: string;
  TriggerPolicyJson: Record<string, unknown> | null;
  InventoryStatusCode: string;
  TargetInventoryStatusCode: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  IsDuplicate: boolean;
  CreatedBy: string | null;
  UpdatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface RecordQcResultRequestDto {
  IdempotencyKey: string;
  ResultStatus: QcResultStatus;
  DispositionCode: QcDispositionCode;
  InspectedQuantity: number;
  AcceptedQuantity: number;
  RejectedQuantity: number;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  EvidenceJson?: Record<string, unknown> | null;
}

export interface QcResultDto {
  Id: string;
  QcTaskId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  ResultStatus: QcResultStatus;
  DispositionCode: QcDispositionCode;
  TaskStatus: QcTaskStatus;
  InspectedQuantity: number;
  AcceptedQuantity: number;
  RejectedQuantity: number;
  AcceptedInventoryStatusCode: string | null;
  RejectedInventoryStatusCode: string | null;
  TargetInventoryStatusCode: string;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  EvidenceJson: Record<string, unknown> | null;
  IdempotencyKey: string;
  RecordedAt: string;
  RecordedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface InboundOperationalStateDto {
  InboundPlanId: string;
  ReceivingSessions: ReceivingSessionDto[];
  ReceiptLines: ReceiptLineDto[];
  QcTasks: QcTaskDto[];
  QcResults: QcResultDto[];
  Lpns: InboundLpnDto[];
  Releases: InboundPutawayReleaseDto[];
  Discrepancies: InboundDiscrepancyDto[];
}
