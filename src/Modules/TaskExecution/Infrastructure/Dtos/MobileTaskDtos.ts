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

export interface ClaimMobileTaskRequestDto {
  DeviceCode?: string;
  SessionId?: string;
}

export type ReleaseMobileTaskRequestDto = Record<string, never>;
