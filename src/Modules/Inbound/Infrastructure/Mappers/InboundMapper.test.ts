import { describe, expect, it } from 'vitest';

import type {
  InboundPlanDto,
  PagedInboundPlanDto,
} from '@modules/Inbound/Infrastructure/Dtos/InboundDtos';
import { InboundMapper } from '@modules/Inbound/Infrastructure/Mappers/InboundMapper';

const inboundPlanDto: InboundPlanDto = {
  Id: 'inbound-plan-1',
  SourceSystem: 'ERP',
  SourceDocumentType: 'ASN',
  SourceDocumentNumber: 'ASN-10001',
  BusinessReference: 'ERP:ASN:ASN-10001',
  SupplierId: 'supplier-1',
  SupplierCode: 'SUP-A',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  WarehouseProfileId: 'profile-1',
  ExpectedArrivalAt: '2026-06-22T08:00:00.000Z',
  Status: 'Planned',
  GateInStatus: 'NotRecorded',
  GateInAt: null,
  GateReference: null,
  VehicleNumber: null,
  DriverName: null,
  EvidenceRefs: [],
  CoreFlowInstanceId: 'core-flow-1',
  IsDuplicate: false,
  Lines: [
    {
      Id: 'line-1',
      LineNumber: 1,
      SkuId: 'sku-1',
      SkuCode: 'SKU-A',
      UomId: 'uom-1',
      UomCode: 'EA',
      ExpectedQuantity: 12,
      ExternalLineReference: '10',
    },
  ],
  CreatedAt: '2026-06-22T08:00:00.000Z',
  UpdatedAt: '2026-06-22T08:00:00.000Z',
  CreatedBy: 'admin',
  UpdatedBy: null,
};

describe('InboundMapper', () => {
  it('maps PascalCase inbound plan DTOs into camelCase domain objects', () => {
    expect(InboundMapper.toInboundPlan(inboundPlanDto)).toMatchObject({
      id: 'inbound-plan-1',
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      businessReference: 'ERP:ASN:ASN-10001',
      supplierCode: 'SUP-A',
      ownerCode: 'OWN-A',
      warehouseCode: 'WT-01',
      status: 'Planned',
      gateInStatus: 'NotRecorded',
      lines: [expect.objectContaining({ lineNumber: 1, skuCode: 'SKU-A', expectedQuantity: 12 })],
    });
  });

  it('maps paged envelopes and tolerates null list payloads', () => {
    const page: PagedInboundPlanDto = {
      Items: [inboundPlanDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };

    expect(InboundMapper.toPaged(page)).toEqual({
      items: [expect.objectContaining({ id: 'inbound-plan-1' })],
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
    });
    expect(InboundMapper.toPaged(null as unknown as PagedInboundPlanDto)).toEqual({
      items: [],
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('builds PascalCase create, gate-in and readiness payloads', () => {
    expect(
      InboundMapper.toCreateRequest({
        sourceSystem: 'ERP',
        sourceDocumentType: 'ASN',
        sourceDocumentNumber: 'ASN-10001',
        supplierId: 'supplier-1',
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        warehouseProfileId: 'profile-1',
        expectedArrivalAt: '2026-06-22T08:00:00.000Z',
        lines: [{ lineNumber: 1, skuId: 'sku-1', uomId: 'uom-1', expectedQuantity: 12 }],
      }),
    ).toEqual({
      SourceSystem: 'ERP',
      SourceDocumentType: 'ASN',
      SourceDocumentNumber: 'ASN-10001',
      SupplierId: 'supplier-1',
      OwnerId: 'owner-1',
      WarehouseId: 'warehouse-1',
      WarehouseProfileId: 'profile-1',
      ExpectedArrivalAt: '2026-06-22T08:00:00.000Z',
      Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12 }],
    });

    expect(
      InboundMapper.toGateInRequest({
        gateInAt: '2026-06-22T09:00:00.000Z',
        gateReference: 'GATE-A-001',
        vehicleNumber: '51C-12345',
        evidenceRefs: ['photo://gate-a-001'],
      }),
    ).toEqual({
      GateInAt: '2026-06-22T09:00:00.000Z',
      GateReference: 'GATE-A-001',
      VehicleNumber: '51C-12345',
      EvidenceRefs: ['photo://gate-a-001'],
    });

    expect(
      InboundMapper.toReadinessRequest({ attemptOverride: true, reasonCode: 'RC-V1-HANDOFF' }),
    ).toEqual({
      AttemptOverride: true,
      ReasonCode: 'RC-V1-HANDOFF',
    });
  });
});
