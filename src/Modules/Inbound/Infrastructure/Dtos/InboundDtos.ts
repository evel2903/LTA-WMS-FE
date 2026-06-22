import type {
  ControlExceptionSeverity,
  ExceptionState,
  InboundDiscrepancyStatus,
  InboundDiscrepancyToleranceDecision,
  InboundDiscrepancyType,
  InboundGateInStatus,
  InboundPlanDocumentStatus,
  ReceiptLineDiscrepancySignal,
  ReceiptLineStatus,
  ReceivingSessionStatus,
} from '@modules/Inbound/Domain/Types/InboundPlan';

export interface InboundPlanLineDto {
  Id: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number;
  ExternalLineReference: string | null;
}

export interface InboundPlanDto {
  Id: string;
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  BusinessReference: string;
  SupplierId: string;
  SupplierCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  WarehouseProfileId: string | null;
  ExpectedArrivalAt: string | null;
  Status: InboundPlanDocumentStatus;
  GateInStatus: InboundGateInStatus;
  GateInAt: string | null;
  GateReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  EvidenceRefs: string[];
  CoreFlowInstanceId: string | null;
  IsDuplicate: boolean;
  Lines: InboundPlanLineDto[];
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PagedInboundPlanDto {
  Items: InboundPlanDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface CreateInboundPlanLineRequestDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  ExpectedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface CreateInboundPlanRequestDto {
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: string | null;
  Lines: CreateInboundPlanLineRequestDto[];
}

export interface RecordGateInRequestDto {
  GateInAt: string;
  GateReference: string;
  VehicleNumber?: string | null;
  DriverName?: string | null;
  EvidenceRefs?: string[];
}

export interface ValidateReceivingReadinessRequestDto {
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingReadinessDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: 'Allowed' | 'Blocked' | 'OverrideAccepted';
  GateInRequired: boolean;
  GateInRecorded: boolean;
  OverrideAccepted: boolean;
  Reason: string;
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
  IdempotencyKey: string;
  ReceivedAt: string;
  ReceivedBy: string | null;
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
