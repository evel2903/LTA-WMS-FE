import { describe, expect, it } from 'vitest';

import { OutboundMapper } from '@modules/Outbound/Infrastructure/Mappers/OutboundMapper';
import type {
  AllocationDto,
  OutboundOrderDto,
} from '@modules/Outbound/Infrastructure/Dtos/OutboundDtos';

const dto: OutboundOrderDto = {
  Id: 'outbound-1',
  OrderNumber: 'OB-001',
  SourceSystem: 'ERP',
  SourceReference: 'SO-001',
  BusinessReference: 'ERP:OUTBOUND:SO-001',
  CustomerId: 'customer-1',
  CustomerSourceSystem: 'ERP',
  CustomerExternalReference: 'ERP-CUS-001',
  CustomerCode: 'CUS-001',
  ShipToReference: 'SHIP-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-01',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  Priority: 10,
  CutoffAt: null,
  DocumentStatus: 'Validated',
  ValidationErrors: [],
  CoreFlowInstanceId: 'core-flow-1',
  OutboxMessageId: 'outbox-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IsDuplicate: false,
  Lines: [
    {
      Id: 'line-1',
      LineNumber: 1,
      SkuId: 'sku-1',
      SkuCode: 'SKU-001',
      UomId: 'uom-1',
      UomCode: 'EA',
      OrderedQuantity: 12,
      ExternalLineReference: 'SO-001-1',
      ValidationErrors: [],
    },
  ],
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

const allocationDto: AllocationDto = {
  Id: 'allocation-1',
  AllocationNumber: 'AL-001',
  OutboundOrderId: 'outbound-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-01',
  Policy: 'PartialBackorder',
  Status: 'PartiallyAllocated',
  TotalOrderedQuantity: 12,
  TotalAllocatedQuantity: 8,
  TotalBackorderedQuantity: 4,
  ShortageReason: 'Insufficient eligible Available inventory in order warehouse',
  OutboxMessageId: 'outbox-allocation-1',
  ReasonCode: 'RC-V1-DISCREPANCY',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'Thiếu tồn',
  EvidenceRefs: ['shortage:1'],
  IsDuplicate: false,
  Lines: [
    {
      Id: 'allocation-line-1',
      OutboundOrderLineId: 'line-1',
      LineNumber: 1,
      SkuId: 'sku-1',
      SkuCode: 'SKU-001',
      UomId: 'uom-1',
      UomCode: 'EA',
      OrderedQuantity: 8,
      AllocatedQuantity: 8,
      BackorderedQuantity: 0,
      SourceBalanceId: 'balance-1',
      SourceDimensionId: 'dimension-1',
      SourceLocationId: 'location-1',
      InventoryStatusCode: 'AVAILABLE',
      LotNumber: 'LOT-1',
      SerialNumber: null,
      ExpiryDate: '2026-12-31',
      Status: 'Allocated',
      ShortageReason: null,
    },
  ],
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

describe('OutboundMapper', () => {
  it('maps outbound order DTO and paged metadata to domain response', () => {
    const order = OutboundMapper.toOrder(dto);
    const page = OutboundMapper.toPaged({
      Items: [dto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    });

    expect(order).toMatchObject({
      id: 'outbound-1',
      businessReference: 'ERP:OUTBOUND:SO-001',
      customerExternalReference: 'ERP-CUS-001',
      documentStatus: 'Validated',
      warehouseCode: 'WT-01',
    });
    expect(order.lines[0]).toMatchObject({ skuCode: 'SKU-001', orderedQuantity: 12 });
    expect(page).toMatchObject({ page: 1, pageSize: 50, totalItems: 1, totalPages: 1 });
    expect(page.items[0].id).toBe('outbound-1');
  });

  it('maps allocation DTOs, allocation pages and allocate payloads', () => {
    const allocation = OutboundMapper.toAllocation(allocationDto);
    const page = OutboundMapper.toPagedAllocations({
      Items: [allocationDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    });

    expect(allocation).toMatchObject({
      id: 'allocation-1',
      policy: 'PartialBackorder',
      status: 'PartiallyAllocated',
      totalAllocatedQuantity: 8,
      totalBackorderedQuantity: 4,
    });
    expect(allocation.lines[0]).toMatchObject({
      sourceBalanceId: 'balance-1',
      inventoryStatusCode: 'AVAILABLE',
    });
    expect(page.items[0].id).toBe('allocation-1');
    expect(
      OutboundMapper.toAllocateRequest({
        policy: 'PartialBackorder',
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: '',
        evidenceRefs: ['shortage:1'],
        idempotencyKey: 'allocate-1',
      }),
    ).toEqual({
      Policy: 'PartialBackorder',
      ReasonCode: 'RC-V1-DISCREPANCY',
      EvidenceRefs: ['shortage:1'],
      IdempotencyKey: 'allocate-1',
    });
  });

  it('maps import and reason payloads using BE contract casing and removes empty optional fields', () => {
    expect(
      OutboundMapper.toImportRequest({
        sourceSystem: 'ERP',
        sourceReference: 'SO-001',
        customerId: '',
        customerExternalReference: 'ERP-CUS-001',
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        reasonCode: '',
        idempotencyKey: 'import-1',
        lines: [
          {
            lineNumber: 1,
            skuId: 'sku-1',
            uomId: 'uom-1',
            orderedQuantity: 12,
            externalLineReference: '',
          },
        ],
      }),
    ).toEqual({
      SourceSystem: 'ERP',
      SourceReference: 'SO-001',
      CustomerExternalReference: 'ERP-CUS-001',
      OwnerId: 'owner-1',
      WarehouseId: 'warehouse-1',
      IdempotencyKey: 'import-1',
      Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', OrderedQuantity: 12 }],
    });

    expect(
      OutboundMapper.toReasonRequest({
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: 'Sai master data',
        evidenceRefs: ['validation:1'],
        idempotencyKey: 'hold-1',
      }),
    ).toEqual({
      ReasonCode: 'RC-V1-DISCREPANCY',
      ReasonNote: 'Sai master data',
      EvidenceRefs: ['validation:1'],
      IdempotencyKey: 'hold-1',
    });
  });
});
