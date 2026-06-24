import { describe, expect, it } from 'vitest';

import { PackingMapper } from '@modules/Packing/Infrastructure/Mappers/PackingMapper';
import type {
  LabelBlockingValidationResultDto,
  PackageDto,
  ReadyForStagingResultDto,
} from '@modules/Packing/Infrastructure/Dtos/PackingDtos';

const packageDto: PackageDto = {
  Id: 'package-1',
  PackageCode: 'PKG-001',
  PackSessionId: 'session-1',
  PickTaskId: 'pick-task-1',
  OutboundOrderId: 'outbound-1',
  WarehouseProfileId: 'profile-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN',
  Status: 'Packed',
  CheckRequired: true,
  CheckResult: 'Passed',
  CartonType: 'CARTON-STD',
  Weight: 12.5,
  Length: 40,
  Width: 30,
  Height: 20,
  LabelBlockingDecision: 'Allowed',
  LabelPrintJobId: 'print-job-1',
  LabelPrintJobCode: 'PJ-001',
  ClosedAt: '2026-06-24T00:00:00.000Z',
  ClosedBy: 'user-1',
  ReadyForStagingAt: null,
  ReadyForStagingBy: null,
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
  Contents: [
    {
      Id: 'content-1',
      PackageId: 'package-1',
      PickTaskId: 'pick-task-1',
      OutboundOrderLineId: 'line-1',
      SourceBalanceId: 'balance-1',
      SourceDimensionId: 'dimension-1',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: 5,
      InventoryStatusCode: 'AVAILABLE',
      LotNumber: 'LOT-1',
      SerialNumber: null,
      ExpiryDate: null,
      CreatedAt: '2026-06-24T00:00:00.000Z',
    },
  ],
};

const labelValidationDto: LabelBlockingValidationResultDto = {
  Allowed: true,
  Blocked: false,
  Decision: 'Allowed',
  RequiredLabelType: 'PACKAGE',
  PolicyMode: 'Block',
  OverrideAllowed: false,
  OverrideAccepted: false,
  Reason: 'matched label print job',
  MatchedPrintJobId: 'print-job-1',
  MatchedPrintJobCode: 'PJ-001',
  ValidationDetails: { labelType: 'PACKAGE' },
};

describe('PackingMapper', () => {
  it('maps package DTO content, status and label fields to domain shape', () => {
    const pack = PackingMapper.toPackage(packageDto);

    expect(pack).toMatchObject({
      id: 'package-1',
      packageCode: 'PKG-001',
      status: 'Packed',
      checkResult: 'Passed',
      labelBlockingDecision: 'Allowed',
      labelPrintJobCode: 'PJ-001',
      contents: [
        {
          id: 'content-1',
          skuCode: 'SKU-1',
          quantity: 5,
          inventoryStatusCode: 'AVAILABLE',
        },
      ],
    });
  });

  it('maps ready-for-staging result and request payload without empty fields', () => {
    const resultDto: ReadyForStagingResultDto = {
      Package: { ...packageDto, Status: 'ReadyForStaging', ReadyForStagingAt: '2026-06-24T01:00:00.000Z' },
      LabelValidation: labelValidationDto,
      IsDuplicate: false,
    };

    expect(PackingMapper.toReadyResult(resultDto)).toMatchObject({
      package: { status: 'ReadyForStaging' },
      labelValidation: { allowed: true, matchedPrintJobCode: 'PJ-001' },
      isDuplicate: false,
    });
    expect(
      PackingMapper.toReadyForStagingRequest({
        attemptOverride: false,
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: '',
        evidenceRefs: [],
        labelType: 'PACKAGE',
        idempotencyKey: 'ready-1',
      }),
    ).toEqual({
      AttemptOverride: false,
      ReasonCode: 'RC-V1-DISCREPANCY',
      EvidenceRefs: [],
      LabelType: 'PACKAGE',
      IdempotencyKey: 'ready-1',
    });
  });
});
