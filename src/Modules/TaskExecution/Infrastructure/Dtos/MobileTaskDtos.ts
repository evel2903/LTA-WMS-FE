export interface MobileTaskDto {
  Id: string;
  TaskCode: string;
  TaskType: 'Receive' | 'Qc' | 'Putaway' | 'Pick' | 'Pack' | 'Load';
  TaskStatus: 'Released' | 'Claimed' | 'InProgress' | 'Blocked' | 'Completed' | 'Cancelled';
  WarehouseId: string;
  WarehouseCode: string;
  OwnerId: string | null;
  OwnerCode: string | null;
  SourceDocumentType: string | null;
  SourceDocumentId: string | null;
  SourceDocumentCode: string | null;
  Priority: number;
  AssignedUserId: string | null;
  ClaimedAt: string | null;
  ReleasedAt: string | null;
  DueAt: string | null;
  DeviceCode: string | null;
  SessionId: string | null;
  TaskPayload: Record<string, unknown> | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PagedMobileTaskDto {
  Items: MobileTaskDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface MobileScanEventDto {
  Id: string;
  TaskId: string;
  TaskCode: string;
  WarehouseId: string;
  OwnerId: string | null;
  ScanType:
    | 'Document'
    | 'Location'
    | 'Item'
    | 'Quantity'
    | 'Lpn'
    | 'Package'
    | 'Load'
    | 'ManualEntry';
  RawValue: string;
  NormalizedValue: string | null;
  Result: 'Accepted' | 'Rejected' | 'ManualOverrideAccepted';
  ResolvedObjectType: string | null;
  ResolvedObjectId: string | null;
  ParsedValueJson: Record<string, unknown>;
  RejectionCode: string | null;
  RejectionMessage: string | null;
  ReasonCode: string | null;
  DeviceCode: string | null;
  SessionId: string | null;
  ActorUserId: string;
  CreatedAt: string;
}

export interface ClaimMobileTaskRequestDto {
  DeviceCode?: string;
  SessionId?: string;
}

export type ReleaseMobileTaskRequestDto = Record<string, never>;

export interface RecordMobileScanRequestDto {
  ScanType:
    | 'Document'
    | 'Location'
    | 'Item'
    | 'Quantity'
    | 'Lpn'
    | 'Package'
    | 'Load'
    | 'ManualEntry';
  RawValue: string;
  ManualEntry?: boolean;
  ReasonCode?: string;
  DeviceCode?: string;
  SessionId?: string;
}

export interface ConfirmPickTaskRequestDto {
  MobileTaskId?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  DeviceCode?: string;
  SessionId?: string;
  IdempotencyKey: string;
}

export interface PickTaskScanEvidenceDto {
  ScanType: 'Location' | 'Item' | 'Quantity' | 'Lot' | 'Serial' | 'ExpiryDate';
  ScanEventId: string | null;
  RawValue: string | null;
  ExpectedValue: string | number | null;
  ActualValue: string | number | null;
  Result: 'Accepted' | 'Rejected' | 'Missing';
  RejectionCode?: string | null;
}

export interface ConfirmPickTaskResultDto {
  PickTask: Record<string, unknown>;
  MobileTask: MobileTaskDto | null;
  InventoryControl: Record<string, unknown> | null;
  ScanEvidence: PickTaskScanEvidenceDto[];
  OutboxMessageId: string | null;
  IsDuplicate: boolean;
}
