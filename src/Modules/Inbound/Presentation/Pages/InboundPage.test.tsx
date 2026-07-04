// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import type {
  InboundDiscrepancy,
  InboundLineImportPreview,
  InboundLpn,
  InboundOperationalState,
  InboundPlan,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  InboundPlanFilter,
  RecordQcResultInput,
  RecordGateInInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundRepository }));
vi.mock('@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance', () => ({
  get inboundRepository() {
    return repo.current;
  },
}));

const partnerRepo = vi.hoisted(() => ({
  current: null as unknown as { list: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepositoryInstance', () => ({
  get partnerRepository() {
    return partnerRepo.current;
  },
}));

const catalogRepo = vi.hoisted(() => ({
  current: null as unknown as {
    listOwners: ReturnType<typeof vi.fn>;
    listUoms: ReturnType<typeof vi.fn>;
    listSkus: ReturnType<typeof vi.fn>;
  },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return catalogRepo.current;
  },
}));

const masterDataRepo = vi.hoisted(() => ({
  current: null as unknown as { listWarehouses: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return masterDataRepo.current;
  },
}));

const warehouseProfileRepo = vi.hoisted(() => ({
  current: null as unknown as { listProfiles: ReturnType<typeof vi.fn> },
}));
vi.mock(
  '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance',
  () => ({
    get warehouseProfileRepository() {
      return warehouseProfileRepo.current;
    },
  }),
);

// Reason-code dropdowns (IFB-04): mock the options hook so panels render selectable codes.
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [
      { value: 'RC-V1-HANDOFF', label: 'RC-V1-HANDOFF — Bàn giao' },
      { value: 'RC-V1-DISCREPANCY', label: 'RC-V1-DISCREPANCY — Sai lệch' },
      { value: 'RC-V1-MANUAL-SCAN', label: 'RC-V1-MANUAL-SCAN — Nhập tay' },
      { value: 'RC-V1-LABEL-OVERRIDE', label: 'RC-V1-LABEL-OVERRIDE — Ghi đè nhãn' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { InboundDetailPage } from '@modules/Inbound/Presentation/Pages/InboundDetailPage';
import { InboundCreatePage } from '@modules/Inbound/Presentation/Pages/InboundCreatePage';
import { InboundPage as InboundListPage } from '@modules/Inbound/Presentation/Pages/InboundPage';

vi.setConfig({ testTimeout: 15_000 });

const DEFAULT_RAW_SCAN = '01012345678901281726010110LOT-A';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function setLookupRepositories() {
  partnerRepo.current = {
    list: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'supplier-1',
            partnerCode: 'SUP-A',
            partnerName: 'Nhà cung cấp A',
            partnerType: 'Supplier',
            status: 'Active',
            sourceSystem: 'ERP',
            externalReference: 'SUP-A',
            referenceText: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  catalogRepo.current = {
    listOwners: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'owner-1',
            ownerCode: 'OWN-A',
            ownerName: 'Chủ hàng A',
            status: 'Active',
            billingPolicy: {},
            visibilityScope: {},
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
    listUoms: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'uom-1',
            uomCode: 'EA',
            uomName: 'Lon',
            uomType: 'Each',
            decimalPrecision: 0,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
          {
            id: 'uom-2',
            uomCode: 'CASE',
            uomName: 'Thùng',
            uomType: 'Case',
            decimalPrecision: 0,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
    listSkus: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'sku-1',
            skuCode: 'SKU-A',
            skuName: 'Coca-Cola lon 330ml',
            defaultOwnerId: 'owner-1',
            itemClass: 'BEVERAGE',
            itemStatus: 'Active',
            baseUomId: 'uom-1',
            inventoryUomId: 'uom-1',
            lotControlled: true,
            expiryControlled: true,
            serialControlled: false,
            ownerControlled: true,
            lpnControlled: true,
            temperatureControlled: false,
            dgControlled: false,
            customsControlled: false,
            qcRequired: true,
            bondedFlag: false,
            temperatureClass: null,
            dgClass: null,
            shelfLifeDays: 365,
            minRemainingShelfLifeDays: 30,
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
          {
            id: 'sku-2',
            skuCode: 'SKU-B',
            skuName: 'Coca-Cola thùng 24 lon',
            defaultOwnerId: 'owner-1',
            itemClass: 'BEVERAGE',
            itemStatus: 'Active',
            baseUomId: 'uom-2',
            inventoryUomId: 'uom-2',
            lotControlled: true,
            expiryControlled: true,
            serialControlled: false,
            ownerControlled: true,
            lpnControlled: true,
            temperatureControlled: false,
            dgControlled: false,
            customsControlled: false,
            qcRequired: true,
            bondedFlag: false,
            temperatureClass: null,
            dgClass: null,
            shelfLifeDays: 365,
            minRemainingShelfLifeDays: 30,
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  masterDataRepo.current = {
    listWarehouses: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'warehouse-1',
            siteId: 'site-1',
            warehouseCode: 'WT-01',
            warehouseName: 'Kho HCM',
            warehouseTypeCode: 'AMBIENT',
            status: 'Active',
            timezone: 'Asia/Ho_Chi_Minh',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  warehouseProfileRepo.current = {
    listProfiles: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'profile-1',
            profileCode: 'PROFILE-A',
            profileName: 'Hồ sơ kho A',
            warehouseTypeCode: 'AMBIENT',
            version: 1,
            status: 'ACTIVE',
            scopeKey: 'profile-a',
            effectiveFrom: '2026-06-22T08:00:00.000Z',
            effectiveTo: null,
            warehouseId: 'warehouse-1',
            zoneId: null,
            locationType: null,
            ownerId: null,
            skuId: null,
            itemClass: null,
            orderType: null,
            customerId: null,
            supplierId: null,
            capabilityFlags: {},
            strategyPolicy: {},
            thresholdPolicy: {},
            approvalPolicy: {},
            labelDevicePolicy: {},
            integrationPolicy: {},
            auditPolicy: {},
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
}

function makePlan(overrides: Partial<InboundPlan> = {}): InboundPlan {
  return {
    id: 'inbound-plan-1',
    sourceSystem: 'ERP',
    sourceDocumentType: 'ASN',
    sourceDocumentNumber: 'ASN-10001',
    businessReference: 'ERP:ASN:ASN-10001',
    supplierId: 'supplier-1',
    supplierCode: 'SUP-A',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    warehouseProfileId: 'profile-1',
    expectedArrivalAt: '2026-06-22T08:00:00.000Z',
    status: 'Planned',
    gateInStatus: 'NotRecorded',
    gateInAt: null,
    gateReference: null,
    vehicleNumber: null,
    driverName: null,
    evidenceRefs: [],
    coreFlowInstanceId: 'core-flow-1',
    isDuplicate: false,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        expectedQuantity: 12,
        externalLineReference: '10',
      },
    ],
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

class FakeRepository implements Partial<IInboundRepository> {
  public items: InboundPlan[];
  public readiness: ReceivingReadiness = {
    allowed: false,
    blocked: true,
    decision: 'Blocked',
    gateInRequired: true,
    gateInRecorded: false,
    overrideAccepted: false,
    reason: 'Cần ghi nhận vào cổng trước khi tiếp nhận.',
  };

  constructor(initial: InboundPlan[] = []) {
    this.items = initial;
  }

  list = vi.fn((filter?: InboundPlanFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.sourceSystem && item.sourceSystem !== filter.sourceSystem) return false;
          if (
            filter?.sourceDocumentNumber &&
            !item.sourceDocumentNumber.includes(filter.sourceDocumentNumber)
          )
            return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) => {
    const item = this.items.find((plan) => plan.id === id);
    return item
      ? Promise.resolve(item)
      : Promise.reject(
          new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
        );
  });

  // IRM-02: persisted operational-state read model. Defaults to empty (so mutation-driven
  // tests behave as before via fallback); set `operationalState` to simulate reload rehydrate.
  public operationalState: InboundOperationalState | null = null;

  getOperationalState = vi.fn(
    (id: string): Promise<InboundOperationalState> =>
      Promise.resolve(
        this.operationalState ?? {
          inboundPlanId: id,
          receivingSessions: [],
          receiptLines: [],
          qcTasks: [],
          qcResults: [],
          lpns: [],
          releases: [],
        },
      ),
  );

  create = vi.fn((input: CreateInboundPlanInput) => {
    const created = makePlan({
      id: `inbound-plan-${this.items.length + 1}`,
      sourceSystem: input.sourceSystem,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentNumber: input.sourceDocumentNumber,
      supplierId: input.supplierId,
      ownerId: input.ownerId,
      warehouseId: input.warehouseId,
      warehouseProfileId: input.warehouseProfileId,
      expectedArrivalAt: input.expectedArrivalAt ?? null,
      lines: input.lines.map((line, index) => ({
        id: `line-${index + 1}`,
        lineNumber: line.lineNumber,
        skuId: line.skuId,
        skuCode: line.skuId,
        uomId: line.uomId,
        uomCode: line.uomId,
        expectedQuantity: line.expectedQuantity,
        externalLineReference: line.externalLineReference ?? null,
      })),
    });
    this.items = [created, ...this.items];
    return Promise.resolve(created);
  });

  downloadLineImportTemplate = vi.fn((): Promise<Blob> => Promise.resolve(new Blob()));

  previewLineImport = vi.fn(
    (): Promise<InboundLineImportPreview> =>
      Promise.resolve({
        fileName: 'template.xlsx',
        rows: [],
        summary: { total: 0, valid: 0, invalid: 0 },
        headerError: null,
      }),
  );

  commitLineImport = vi.fn((_file: File, header: Omit<CreateInboundPlanInput, 'lines'>) =>
    this.create({ ...header, lines: [] }),
  );

  recordGateIn = vi.fn((id: string, input: RecordGateInInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = {
      ...this.items[index],
      gateInStatus: 'Recorded',
      gateInAt: input.gateInAt,
      gateReference: input.gateReference,
      vehicleNumber: input.vehicleNumber ?? null,
    };
    return Promise.resolve(this.items[index]);
  });

  validateReadiness = vi.fn((_id: string, input?: ValidateReceivingReadinessInput) =>
    Promise.resolve(
      input?.attemptOverride
        ? { ...this.readiness, allowed: true, blocked: false, overrideAccepted: true }
        : this.readiness,
    ),
  );

  startReceivingSession = vi.fn(
    (id: string, input?: StartReceivingSessionInput): Promise<ReceivingSession> => {
      const plan = this.items.find((item) => item.id === id) ?? this.items[0];
      return Promise.resolve({
        id: 'session-1',
        inboundPlanId: id,
        receiptId: 'receipt-1',
        receiptNumber: `${plan?.sourceDocumentNumber ?? 'ASN-10001'}-RCPT`,
        sessionKey: input?.sessionKey ?? 'dock-1',
        deviceCode: input?.deviceCode ?? null,
        ownerId: plan?.ownerId ?? 'owner-1',
        ownerCode: plan?.ownerCode ?? 'OWN-A',
        warehouseId: plan?.warehouseId ?? 'warehouse-1',
        warehouseCode: plan?.warehouseCode ?? 'WT-01',
        status: 'Open',
        startedAt: '2026-06-22T09:05:00.000Z',
        closedAt: null,
        isDuplicate: false,
        createdAt: '2026-06-22T09:05:00.000Z',
        updatedAt: '2026-06-22T09:05:00.000Z',
        startedBy: 'test-admin',
        updatedBy: null,
      });
    },
  );

  confirmReceiptLine = vi.fn(
    (_receiptId: string, input: ConfirmReceiptLineInput): Promise<ReceiptLine> =>
      Promise.resolve({
        id: 'receipt-line-1',
        receiptId: 'receipt-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: input.inboundPlanLineId,
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        expectedQuantity: 12,
        actualQuantity: input.actualQuantity,
        status: input.actualQuantity === 12 ? 'Received' : 'Discrepancy',
        manualConfirm: input.manualConfirm ?? false,
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        scanEvidenceJson: input.scanEvidence ? { RawValue: input.scanEvidence.rawValue } : null,
        discrepancySignals: input.actualQuantity === 12 ? [] : ['QuantityVariance'],
        idempotencyKey: input.idempotencyKey,
        receivedAt: '2026-06-22T09:10:00.000Z',
        receivedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:10:00.000Z',
        updatedAt: '2026-06-22T09:10:00.000Z',
      }),
  );

  confirmInboundLpn = vi.fn(
    (
      _receiptId: string,
      receiptLineId: string,
      input: ConfirmInboundLpnInput,
    ): Promise<InboundLpn> =>
      Promise.resolve({
        id: 'lpn-1',
        receiptId: 'receipt-1',
        receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        quantity: 12,
        lpnCode: input.lpnCode,
        ssccCode: input.ssccCode ?? null,
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        confirmedAt: '2026-06-22T09:16:00.000Z',
        confirmedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:16:00.000Z',
        updatedAt: '2026-06-22T09:16:00.000Z',
      }),
  );

  releaseInboundToPutaway = vi.fn(
    (
      _receiptId: string,
      receiptLineId: string,
      input: ReleaseInboundToPutawayInput,
    ): Promise<InboundPutawayRelease> =>
      Promise.resolve({
        id: 'release-1',
        inboundLpnId: 'lpn-1',
        receiptId: 'receipt-1',
        receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        quantity: 12,
        lpnCode: 'LPN-0001',
        ssccCode: '003456789012345678',
        inventoryStatusCode: 'READY_FOR_PUTAWAY',
        currentLocationId: input.currentLocationId ?? null,
        currentLocationCode: input.currentLocationCode ?? 'RECEIVING',
        warehouseProfileId: 'profile-1',
        labelDecision: 'NotRequired',
        labelReason: 'No label blocking rule required for this action.',
        matchedPrintJobId: null,
        constraintJson: { ReadinessSourceType: 'QcTask' },
        outboxMessageId: 'outbox-1',
        coreFlowMilestoneId: 'milestone-1',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        releasedAt: '2026-06-22T09:25:00.000Z',
        releasedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:25:00.000Z',
        updatedAt: '2026-06-22T09:25:00.000Z',
      }),
  );

  captureDiscrepancy = vi.fn(
    (_receiptId: string, input: CaptureInboundDiscrepancyInput): Promise<InboundDiscrepancy> =>
      Promise.resolve({
        id: 'discrepancy-1',
        receiptId: 'receipt-1',
        receiptLineId: input.receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        discrepancyType: input.discrepancyType,
        status: 'PendingApproval',
        toleranceDecision: 'OverTolerancePendingApproval',
        expectedQuantity: 12,
        actualQuantity: 14,
        reasonCode: input.reasonCode,
        reasonCodeId: 'reason-1',
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        evidenceJson: input.evidenceJson ?? null,
        exceptionCaseId: 'exception-1',
        exceptionState: 'DETECTED',
        severity: 'MEDIUM',
        idempotencyKey: input.idempotencyKey,
        isDuplicate: false,
        recordedAt: '2026-06-22T09:12:00.000Z',
        recordedBy: 'test-admin',
        createdAt: '2026-06-22T09:12:00.000Z',
        updatedAt: '2026-06-22T09:12:00.000Z',
      }),
  );

  evaluateQcTask = vi.fn(
    (_receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask> =>
      Promise.resolve({
        id: 'qc-task-1',
        receiptId: 'receipt-1',
        receiptLineId: input.receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        actualQuantity: 12,
        taskStatus: input.forceRequired ? 'PendingQc' : 'NotRequired',
        required: input.forceRequired === true,
        triggerReason: input.forceRequired ? 'Forced' : 'NotRequired',
        triggerPolicyJson: null,
        inventoryStatusCode: input.forceRequired ? 'PENDING_QC' : 'READY_FOR_PUTAWAY',
        targetInventoryStatusCode: input.forceRequired ? null : 'READY_FOR_PUTAWAY',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        isDuplicate: false,
        createdBy: 'test-admin',
        updatedBy: 'test-admin',
        createdAt: '2026-06-22T09:15:00.000Z',
        updatedAt: '2026-06-22T09:15:00.000Z',
      }),
  );

  recordQcResult = vi.fn(
    (_qcTaskId: string, input: RecordQcResultInput): Promise<QcResult> =>
      Promise.resolve({
        id: 'qc-result-1',
        qcTaskId: 'qc-task-1',
        receiptId: 'receipt-1',
        receiptLineId: 'receipt-line-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        resultStatus: input.resultStatus,
        dispositionCode: input.dispositionCode,
        taskStatus: input.resultStatus === 'Passed' ? 'Closed' : 'Dispositioned',
        inspectedQuantity: input.inspectedQuantity,
        acceptedQuantity: input.acceptedQuantity,
        rejectedQuantity: input.rejectedQuantity,
        acceptedInventoryStatusCode: input.acceptedQuantity > 0 ? 'READY_FOR_PUTAWAY' : null,
        rejectedInventoryStatusCode: input.rejectedQuantity > 0 ? 'QUARANTINE' : null,
        targetInventoryStatusCode: input.rejectedQuantity > 0 ? 'QUARANTINE' : 'READY_FOR_PUTAWAY',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        evidenceJson: input.evidenceJson ?? null,
        idempotencyKey: input.idempotencyKey,
        recordedAt: '2026-06-22T09:20:00.000Z',
        recordedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:20:00.000Z',
        updatedAt: '2026-06-22T09:20:00.000Z',
      }),
  );
}

function allowReceiving(fake: FakeRepository) {
  fake.readiness = {
    ...fake.readiness,
    allowed: true,
    blocked: false,
    decision: 'Allowed',
    gateInRecorded: true,
    overrideAccepted: false,
    reason: 'Điều kiện tiếp nhận đã sẵn sàng.',
  };
}

async function expectReadinessAllowed() {
  await waitFor(() => expect(screen.getByTestId('inbound-receiving-panel')).toBeTruthy());
  expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
}

async function openTechnicalDetails(actor: ReturnType<typeof userEvent.setup>, testId: string) {
  const details = screen.getByTestId(testId);
  if (!details.hasAttribute('open')) {
    const summary = details.querySelector('summary');
    if (!summary) {
      throw new Error(`Missing technical details summary for ${testId}`);
    }
    await actor.click(summary);
  }
  return details;
}

function renderPage(entry = '/inbound/inbound-plan-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound/new" element={<InboundCreatePage />} />
          <Route path="/inbound/:id" element={<InboundDetailPage />} />
          <Route path="/inbound/:id/discrepancy/:lineId" element={<InboundDetailPage />} />
          <Route path="/inbound/:id/:action" element={<InboundDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage(entry = '/inbound') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound" element={<InboundListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location-probe" hidden>
      {location.pathname}
    </span>
  );
}

afterEach(() => cleanup());

describe('InboundPage', () => {
  it('lists plans, shows line detail and validates receiving readiness state', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    const railForList = screen.getByTestId('inbound-line-rail');
    expect(within(railForList).getByText(/Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(screen.getByText(/Dự kiến đến: 2026-06-22T08:00:00.000Z/i)).toBeTruthy();
    expect(screen.getByText(/Dấu vết CoreFlow: core-flow-1/i)).toBeTruthy();
    expect(within(railForList).getByText(/Tham chiếu: 10/i)).toBeTruthy();
    expect(await screen.findByTestId('inbound-operator-header')).toBeTruthy();
    // Line rail is the single unified line picker; focused console replaces the old aside.
    expect(screen.getByTestId('inbound-line-rail')).toBeTruthy();
    expect(screen.getByTestId('inbound-line-console')).toBeTruthy();
    expect(screen.queryByTestId('inbound-line-queue')).toBeNull();
    expect(screen.queryByTestId('inbound-next-action-panel')).toBeNull();
    // One authoritative step indicator in the console.
    expect(screen.getByTestId('inbound-console-step-indicator').textContent).toContain('Bước:');
    expect(screen.getByTestId('inbound-gate-in-panel')).toBeTruthy();
    expect(fake.validateReadiness).toHaveBeenCalledWith('inbound-plan-1', {
      attemptOverride: false,
    });
  });

  it('renders detail workflow stepper and marks deep-link actions active', async () => {
    const actionCases = [
      ['/inbound/inbound-plan-1/gate-in', 'gate-in'],
      ['/inbound/inbound-plan-1/receiving', 'receiving'],
      ['/inbound/inbound-plan-1/discrepancy/line-1', 'receiving'],
      ['/inbound/inbound-plan-1/qc', 'qc'],
      ['/inbound/inbound-plan-1/lpn', 'lpn'],
      ['/inbound/inbound-plan-1/release', 'release'],
    ] as const;

    for (const [entry, stepKey] of actionCases) {
      const fake = new FakeRepository([makePlan()]);
      repo.current = fake;
      const view = renderPage(entry);

      expect(await screen.findByRole('navigation', { name: 'Luồng xử lý nhập kho' })).toBeTruthy();
      expect(screen.queryByTestId('inbound-workflow-step-plan')).toBeNull();
      expect(screen.getByTestId('inbound-workflow-step-gate-in')).toBeTruthy();
      expect(screen.queryByTestId('inbound-workflow-step-readiness')).toBeNull();
      expect(screen.getByTestId('inbound-workflow-step-receiving')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-qc')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-lpn')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-release')).toBeTruthy();
      expect(
        within(screen.getByTestId(`inbound-workflow-step-${stepKey}`)).getByText(
          /Đang xử lý|Bị chặn/,
        ),
      ).toBeTruthy();
      // Single focused console with one authoritative step indicator.
      expect(screen.getAllByTestId('inbound-line-console')).toHaveLength(1);
      expect(screen.getAllByTestId('inbound-console-step-indicator')).toHaveLength(1);

      view.unmount();
    }
  });

  it('shows a distinct approval-required stepper state (not the generic Blocked lock) when readiness resolves ApprovalRequired, and surfaces ruleCode in technical details (IFB-05)', async () => {
    const fake = new FakeRepository([
      makePlan({ gateInStatus: 'Recorded', gateInAt: '2026-06-22T09:00:00.000Z' }),
    ]);
    fake.readiness = {
      ...fake.readiness,
      allowed: false,
      blocked: true,
      decision: 'ApprovalRequired',
      gateInRecorded: true,
      overrideAccepted: false,
      reason: 'Gate-in requires approval before receiving.',
      ruleCode: 'RULE-IN-GATE-01',
    };
    repo.current = fake;
    const actor = userEvent.setup();
    renderPage('/inbound/inbound-plan-1');

    expect(await screen.findByTestId('inbound-workflow-step-receiving')).toBeTruthy();
    expect(
      within(screen.getByTestId('inbound-workflow-step-receiving')).getByText('Cần phê duyệt'),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('inbound-workflow-step-receiving')).queryByText('Bị chặn'),
    ).toBeNull();
    // The override control stays available — ApprovalRequired is recoverable, not a dead end.
    expect(screen.getByTestId('inbound-readiness-panel')).toBeTruthy();
    // The panel's own status text must not read the same as a hard Blocked case.
    expect(screen.getByTestId('inbound-readiness-status').textContent).toContain(
      'Cần phê duyệt readiness',
    );
    // The console header title (a separate piece of on-screen copy) must agree with
    // the stepper instead of still saying the generic "đang bị chặn".
    expect(screen.getByTestId('inbound-console-step-action').textContent).toContain(
      'cần phê duyệt readiness',
    );
    expect(screen.getByTestId('inbound-console-step-action').textContent).not.toContain(
      'đang bị chặn',
    );

    const details = await openTechnicalDetails(actor, 'inbound-technical-details');
    expect(within(details).getByText('Cần phê duyệt')).toBeTruthy();
    expect(within(details).getByText('RULE-IN-GATE-01')).toBeTruthy();
  });

  it('shows inline, durable errors (not just the transient toast) for start-receiving-session and confirm-receipt-line failures, with the real backend message (IFB-06)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.startReceivingSession.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Receiving session already closed for this plan.',
      }),
    );
    repo.current = fake;
    renderPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(
      await screen.findByText('Receiving session already closed for this plan.'),
    ).toBeTruthy();

    // Retry succeeds so the flow can reach the confirm-receipt-line form.
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    fake.confirmReceiptLine.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Actual quantity must be greater than zero.',
      }),
    );
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );
    expect(await screen.findByText('Actual quantity must be greater than zero.')).toBeTruthy();
  });

  it('shows an inline error for a failed readiness override, with the real backend message (IFB-06)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    fake.validateReadiness.mockImplementation((_id, input) =>
      input?.attemptOverride
        ? Promise.reject(
            new ApiError({
              status: 403,
              code: 'FORBIDDEN',
              message: 'Reason code RC-V1-HANDOFF is not authorized for this action.',
            }),
          )
        : Promise.resolve(fake.readiness),
    );
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));

    expect(
      await screen.findByText('Reason code RC-V1-HANDOFF is not authorized for this action.'),
    ).toBeTruthy();
  });

  it('exposes non-active step descriptions via aria-describedby without changing the accessible name', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/gate-in');

    expect(await screen.findByRole('navigation', { name: 'Luồng xử lý nhập kho' })).toBeTruthy();

    // A non-active step (receiving is `blocked` on the /gate-in route) points
    // aria-describedby at an sr-only node carrying its description, while its
    // accessible name stays exactly `${label}: ${stateLabel}` (the description is
    // NOT folded into the name, so existing accessible-name queries stay valid).
    const receivingButton = screen.getByTestId('inbound-workflow-step-button-receiving');
    const describedBy = receivingButton.getAttribute('aria-describedby');
    expect(describedBy).toBe('inbound-workflow-step-desc-receiving');
    expect(receivingButton.getAttribute('aria-label')).toBe('Tiếp nhận: Bị chặn');
    const description = document.getElementById(describedBy as string);
    expect(description?.textContent).toBe('Cần vào cổng trước khi tiếp nhận.');

    // The active step (gate-in) shows its description as visible text below the stepper
    // and carries no aria-describedby (its description is not duplicated for AT).
    const gateInButton = screen.getByTestId('inbound-workflow-step-button-gate-in');
    expect(gateInButton.getAttribute('aria-describedby')).toBeNull();
    expect(screen.getByTestId('inbound-workflow-active-step-description').textContent).toContain(
      'Cần ghi nhận xe/hàng vào cổng.',
    );
  });

  it('renders the line rail as the single unified line picker with per-line stage chips', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    repo.current = fake;
    renderPage();

    const rail = await screen.findByTestId('inbound-line-rail');
    // Lists every plan line.
    expect(within(rail).getByText(/Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(within(rail).getByText(/Dòng 2 — SKU-B/i)).toBeTruthy();
    // Focused line (line-1) carries aria-current; non-focused lines honestly show "Chưa bắt đầu".
    expect(screen.getByTestId('inbound-line-rail-button-line-1').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      null,
    );
    expect(screen.getByTestId('inbound-line-stage-chip-line-2').textContent).toContain(
      'Chưa bắt đầu',
    );

    // Selecting a line drives the single setSelectedLineId mechanism. On desktop
    // the rail is always visible, so keyboard focus stays naturally on the clicked
    // rail line button (no focus-steal to the console); only a mobile collapse
    // moves focus, and then to the rail's own toggle.
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-workflow-progress-caption').textContent).toContain(
      'Dòng 2 — SKU-B',
    );
  });

  it('shows the blocked reason as a prominent single-source card inside the console', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/qc');

    const consoleEl = await screen.findByTestId('inbound-line-console');
    const blockedCard = within(consoleEl).getByTestId('inbound-action-blocked');
    // Single prominent blocked card, not muted fine print, not a popup.
    expect(blockedCard.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi QC');
    expect(screen.getAllByTestId('inbound-action-blocked')).toHaveLength(1);
    // The active panel is suppressed while blocked.
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    // The ribbon remains read-only: clicking a non-done step does not open a popup.
    expect(within(consoleEl).getByTestId('inbound-console-step-indicator').textContent).toContain(
      'Bước:',
    );
  });

  it('renders gate-in and readiness panels with visible disabled helpers', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/gate-in');

    const gateInStep = await screen.findByTestId('inbound-workflow-step-gate-in');
    const gateInPanel = screen.getByTestId('inbound-gate-in-panel');

    expect(within(gateInStep).getByText('Đang xử lý')).toBeTruthy();
    expect(within(gateInPanel).getByRole('button', { name: 'Ghi nhận vào cổng' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByTestId('inbound-gate-in-helper').textContent).toContain(
      'Nhập tham chiếu cổng',
    );
    expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('renders readiness as the blocked receiving action', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    const receivingStep = await screen.findByTestId('inbound-workflow-step-receiving');
    const readinessPanel = screen.getByTestId('inbound-readiness-panel');

    expect(within(receivingStep).getByText('Bị chặn')).toBeTruthy();
    expect(screen.getByTestId('inbound-readiness-status').textContent).toContain(
      'Cần ghi nhận vào cổng',
    );
    expect(screen.getByTestId('inbound-readiness-helper').textContent).toContain(
      'Vào cổng chưa được ghi nhận',
    );
    expect(
      within(readinessPanel).getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }),
    ).toHaveProperty('disabled', true);
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('renders one receiving action panel when readiness is allowed', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    const receivingStep = await screen.findByTestId('inbound-workflow-step-receiving');

    expect(within(receivingStep).getByText('Đang xử lý')).toBeTruthy();
    await expectReadinessAllowed();
    expect(screen.getByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.getByTestId('inbound-receipt-technical-details').hasAttribute('open')).toBe(
      false,
    );
    expect(screen.getAllByText('Tiếp nhận hàng').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('inbound-current-line').textContent).toContain('SKU-A');
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Quét mã hàng')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xác nhận nhận hàng' })).toBeTruthy();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
    expect(screen.getByTestId('inbound-receiving-start-helper').textContent).toContain(
      'Sẵn sàng bắt đầu phiên tiếp nhận',
    );
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Cần bắt đầu phiên tiếp nhận',
    );
  });

  it('orders the operator workflow for mobile and keeps Closed lifecycle from gating execution', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePlan({
        status: 'Closed',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;

    renderPage('/inbound/inbound-plan-1/receiving');

    const header = await screen.findByTestId('inbound-operator-header');
    // Lifecycle badge keeps the `Chứng từ:` prefix; never a bare `Đã đóng`.
    expect(within(header).getByText('Chứng từ: Đã đóng')).toBeTruthy();
    expect(within(header).queryByText('Đã đóng')).toBeNull();
    // The per-line cue lives in the ribbon band, NOT in the document header.
    expect(within(header).queryByText(/Bước hiện tại/i)).toBeNull();
    expect(within(header).queryByTestId('inbound-current-step-line-cue')).toBeNull();
    expect(screen.getByTestId('inbound-workflow-progress-caption').textContent).toContain(
      'Dòng 1 — SKU-A',
    );

    const toggle = within(header).getByTestId('inbound-operator-header-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await actor.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(header).getByTestId('inbound-operator-header-details')).toBeTruthy();

    await expectReadinessAllowed();
    // Closed lifecycle alone must NOT gate execution.
    const startReceivingButton = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Bắt đầu tiếp nhận',
    });
    expect(startReceivingButton.disabled).toBe(false);

    // Page-level DOM source order: band → ribbon → action grid → document info →
    // recent activity → technical details. The console-vs-rail vertical order is a
    // responsive concern asserted via order classes below (jsdom cannot measure it).
    const pageOrder = [
      'inbound-operator-header',
      'inbound-workflow-progress',
      'inbound-line-console',
      'inbound-line-rail',
      'inbound-document-info',
      'inbound-recent-activity',
      'inbound-technical-details',
    ].map((testId) =>
      Array.from(document.body.querySelectorAll('[data-testid]')).findIndex(
        (element) => element.getAttribute('data-testid') === testId,
      ),
    );
    expect(pageOrder.every((position) => position >= 0)).toBe(true);

    // Mobile (below xl): console pinned ABOVE the rail. Desktop (xl): rail LEFT,
    // console RIGHT. Encoded with Tailwind order utilities on the two grid slots.
    const consoleSlot = screen.getByTestId('inbound-line-console-slot');
    const railSlot = screen.getByTestId('inbound-line-rail-slot');
    expect(consoleSlot.className).toContain('order-1');
    expect(consoleSlot.className).toContain('xl:order-2');
    expect(railSlot.className).toContain('order-2');
    expect(railSlot.className).toContain('xl:order-1');
  });

  it('shows the per-line execution cue and progress note in the ribbon band', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    const cue = await screen.findByTestId('inbound-current-step-line-cue');
    expect(cue.textContent).toContain('Bước hiện tại — Dòng:');
    expect(cue.textContent).toContain('SKU-A');
    expect(screen.getByTestId('inbound-progress-note').textContent).toContain(
      'Tiến độ hiển thị theo dòng đang chọn.',
    );

    // The cue follows the focused line through the single selection mechanism.
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-current-step-line-cue').textContent).toContain('SKU-B');
  });

  it('keeps line selection reachable on mobile via the collapsible Dòng khác section', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    // The collapsible `Dòng khác ({count})` control exists with the line count and
    // is collapsed by default (the list is mobile-hidden until expanded).
    const toggle = await screen.findByTestId('inbound-line-rail-toggle');
    expect(toggle.textContent).toContain('Dòng khác (2)');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const list = screen.getByTestId('inbound-line-rail-list');
    expect(list.className).toContain('hidden');
    expect(list.className).toContain('xl:block');

    // Expanding reveals the rows; selecting a line re-collapses so the console
    // returns to the top of the action area.
    await actor.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('inbound-line-rail-list').className).not.toContain('hidden');

    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-line-rail-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('locks the task card and discrepancy overlay when the inbound document is Cancelled', async () => {
    const fake = new FakeRepository([
      makePlan({
        status: 'Cancelled',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;

    renderPage('/inbound/inbound-plan-1/discrepancy/line-1');

    expect(
      await screen.findByText('Chứng từ đã hủy. Không thể tiếp tục thao tác nhập kho.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('inbound-discrepancy-overlay')).toBeNull();
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(fake.startReceivingSession).not.toHaveBeenCalled();
    expect(fake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('shows a visually distinct terminal state for a Cancelled document, not the routine blocked state (IFB-07)', async () => {
    const fake = new FakeRepository([
      makePlan({
        status: 'Cancelled',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;

    renderPage('/inbound/inbound-plan-1');

    // The terminal banner uses its own destructive title/copy, not the generic
    // "routine block" title reused for a recoverable step.
    expect(await screen.findByText('Chứng từ đã hủy')).toBeTruthy();
    expect(screen.queryByText('Thao tác chưa sẵn sàng')).toBeNull();

    // Gate-in already happened before cancellation — its `done` state (a fact of
    // history) is preserved, not overwritten to `cancelled`.
    const gateInStep = await screen.findByTestId('inbound-workflow-step-gate-in');
    expect(gateInStep.textContent).toContain('Hoàn tất');

    // Every step that had NOT cleared before cancellation reads as `cancelled`,
    // never the routine amber `blocked` state a live, recoverable step would show.
    for (const key of ['receiving', 'qc', 'lpn', 'release']) {
      const step = screen.getByTestId(`inbound-workflow-step-${key}`);
      expect(step.textContent).toContain('Đã hủy');
      expect(step.textContent).not.toContain('Bị chặn');
    }
  });

  it('blocks QC deep-link until a receipt line is confirmed', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/qc');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi QC');
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('blocks LPN deep-link until the line is ready for putaway', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/lpn');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain(
      'Cần bắt đầu phiên tiếp nhận trước khi xác nhận LPN/SSCC',
    );
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('blocks release deep-link until putaway readiness and LPN requirement are satisfied', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/release');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi release');
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('resets actual quantity to expected quantity when operator selects another line', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    await expectReadinessAllowed();
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '12');

    await actor.click(screen.getByRole('button', { name: /Dòng 2 — SKU-B/i }));

    expect(screen.getByTestId('inbound-current-line').textContent).toContain('SKU-B');
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '24');
  });

  it('blocks receipt confirmation until raw scan or manual reason is provided', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Cần quét mã hàng',
    );
    expect(confirmButton).toHaveProperty('disabled', true);

    await actor.click(screen.getByLabelText('Xác nhận thủ công'));
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Xác nhận thủ công cần mã lý do',
    );
    await actor.selectOptions(screen.getByLabelText('Mã lý do tiếp nhận'), 'RC-V1-MANUAL-SCAN');
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
  });

  it('creates source document from the create-only page without operational actions', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    setLookupRepositories();
    renderPage('/inbound/new');

    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bắt đầu tiếp nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận hàng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Đánh giá QC' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Phát hành sang cất hàng' })).toBeNull();

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    expect(screen.queryByLabelText('ID nhà cung cấp')).toBeNull();
    expect(screen.queryByLabelText('ID chủ hàng')).toBeNull();
    expect(screen.queryByLabelText('ID kho')).toBeNull();
    expect(screen.queryByLabelText('ID hồ sơ kho')).toBeNull();
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.type(screen.getByLabelText('Thời gian đến dự kiến'), '2026-06-22T08:00');
    expect(screen.queryByLabelText('ID SKU')).toBeNull();
    expect(screen.queryByLabelText('ID đơn vị tính')).toBeNull();
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceSystem: 'ERP',
          sourceDocumentNumber: 'ASN-10001',
          supplierId: 'supplier-1',
          ownerId: 'owner-1',
          warehouseId: 'warehouse-1',
          warehouseProfileId: 'profile-1',
          lines: [expect.objectContaining({ skuId: 'sku-1', expectedQuantity: 12 })],
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    const createInput = fake.create.mock.calls[0][0];
    expect(createInput.expectedArrivalAt).toMatch(/^2026-06-22T/);
    expect(fake.recordGateIn).not.toHaveBeenCalled();
  });

  it('shows duplicate/idempotent source trace when backend returns duplicate flag', async () => {
    const actor = userEvent.setup();
    const existing = makePlan({ isDuplicate: true });
    const fake = new FakeRepository([existing]);
    fake.create.mockResolvedValueOnce(existing);
    repo.current = fake;
    setLookupRepositories();
    renderPage('/inbound/new');

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    expect(await screen.findByText(/Đã dùng lại kế hoạch nhập kho hiện có/i)).toBeTruthy();
  });

  it('creates source document with multiple lines and external line references', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    setLookupRepositories();
    renderPage('/inbound/new');

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.clear(screen.getByLabelText('Loại chứng từ nguồn'));
    await actor.type(screen.getByLabelText('Loại chứng từ nguồn'), 'PO');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'PO-10001');
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    await actor.type(screen.getByLabelText('Tham chiếu dòng ngoài'), '10');

    await actor.click(screen.getByRole('button', { name: 'Thêm dòng' }));
    const skuInputs = screen.getAllByLabelText('SKU');
    const uomInputs = screen.getAllByLabelText('Đơn vị tính');
    const qtyInputs = screen.getAllByLabelText('Số lượng dự kiến');
    const refInputs = screen.getAllByLabelText('Tham chiếu dòng ngoài');
    await actor.selectOptions(skuInputs[1], 'sku-2');
    await actor.selectOptions(uomInputs[1], 'uom-2');
    await actor.clear(qtyInputs[1]);
    await actor.type(qtyInputs[1], '8');
    await actor.type(refInputs[1], '20');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceDocumentType: 'PO',
          sourceDocumentNumber: 'PO-10001',
          lines: [
            expect.objectContaining({ lineNumber: 1, skuId: 'sku-1', externalLineReference: '10' }),
            expect.objectContaining({ lineNumber: 2, skuId: 'sku-2', externalLineReference: '20' }),
          ],
        }),
      ),
    );
  });

  it('allows readiness override only with reason code input', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    expect(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' })).toHaveProperty(
      'disabled',
      true,
    );

    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));

    await waitFor(() =>
      expect(fake.validateReadiness).toHaveBeenLastCalledWith('inbound-plan-1', {
        attemptOverride: true,
        reasonCode: 'RC-V1-HANDOFF',
      }),
    );
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
  });

  it('starts receiving and confirms a scan receipt line through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));

    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(fake.startReceivingSession).toHaveBeenCalledWith('inbound-plan-1', {
        sessionKey: 'dock-1:user-1',
        deviceCode: 'rf-web',
      }),
    );
    await waitFor(() => expect(fake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [receiptId, receiptInput] = fake.confirmReceiptLine.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(receiptInput).toMatchObject({
      inboundPlanLineId: 'line-1',
      actualQuantity: 12,
      idempotencyKey: 'receipt-line-1',
      scanEvidence: {
        rawValue: DEFAULT_RAW_SCAN,
        resolvedSkuId: 'sku-1',
        resolvedUomId: 'uom-1',
      },
    });
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
  }, 15_000);

  it('opens completed-step summary from the stepper without re-firing mutations', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-summary');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(fake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-receiving'));
    const summary = await screen.findByTestId('inbound-completed-step-summary');
    expect(within(summary).getByText('Tóm tắt bước đã hoàn tất')).toBeTruthy();
    expect(within(summary).getByText(/Tiếp nhận - Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(within(summary).getByText('Số lượng thực nhận')).toBeTruthy();
    expect(within(summary).getByText('12 EA')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận hàng' })).toBeNull();
    expect(fake.confirmReceiptLine).toHaveBeenCalledTimes(1);

    await actor.click(screen.getByTestId('inbound-workflow-step-button-qc'));
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();

    // Clicking a blocked step in the read-only ribbon is INERT: it must NOT raise
    // a prominent blocked card over the active QC panel nor open a summary.
    await actor.click(screen.getByTestId('inbound-workflow-step-button-lpn'));
    expect(screen.getByTestId('inbound-qc-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-action-blocked')).toBeNull();
    expect(screen.queryByText(/LPN\/SSCC: Xác nhận LPN\/SSCC sau QC/i)).toBeNull();
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();
    expect(fake.confirmInboundLpn).not.toHaveBeenCalled();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-receiving'));
    expect(await screen.findByTestId('inbound-completed-step-summary')).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Đóng tóm tắt bước đã hoàn tất' }));
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-console')).toBe(document.activeElement),
    );
  }, 15_000);

  it('routes a confirmed discrepancy line with reason, evidence and idempotency', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    // The single canonical discrepancy trigger lives in the focused-line console;
    // the receiving panel no longer co-renders a competing trigger.
    expect(screen.queryByTestId('inbound-discrepancy-entry')).toBeNull();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound/inbound-plan-1/discrepancy/line-1',
    );
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    await waitFor(() => expect(fake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    const [receiptId, discrepancyInput] = fake.captureDiscrepancy.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(discrepancyInput).toMatchObject({
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      idempotencyKey: 'discrepancy-1',
    });
    await waitFor(() => expect(fake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe(
        '/inbound/inbound-plan-1/receiving',
      ),
    );
    // Post-submit the single canonical overlay closes back to /receiving; the
    // receiving panel renders and focus returns to the always-visible focused-line
    // console (a visible surface on both desktop and mobile — the rail line button
    // is `display:none` while the rail is collapsed on mobile).
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-discrepancy-overlay')).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-console')).toBe(document.activeElement),
    );
  });

  it('keeps discrepancy as the single canonical surface: no inline trigger, reference-code evidence, no file picker', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();

    // The receiving panel must NOT co-render a competing discrepancy surface.
    const receivingPanel = screen.getByTestId('inbound-receiving-panel');
    expect(within(receivingPanel).queryByTestId('inbound-discrepancy-entry')).toBeNull();
    expect(within(receivingPanel).queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();

    // Before a receipt line is confirmed the trigger is hidden entirely (it would
    // otherwise be a disabled, meaningless control with no line to report on).
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    const enabledTrigger = screen.getByRole('button', { name: 'Báo sai lệch dòng này' });
    await waitFor(() => expect(enabledTrigger).toHaveProperty('disabled', false));
    await actor.click(enabledTrigger);

    const dialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound/inbound-plan-1/discrepancy/line-1',
    );
    // Evidence is a reference-code field — exact relabel, no upload/"Thêm ảnh" wording.
    expect(within(dialog).getByLabelText('Mã tham chiếu bằng chứng')).toBeTruthy();
    expect(within(dialog).queryByLabelText('Bằng chứng (mã tham chiếu)')).toBeNull();
    expect(within(dialog).queryByText(/Thêm ảnh|Tải ảnh|Tải lên/i)).toBeNull();
    // No file picker anywhere in the discrepancy surface.
    expect(dialog.querySelector('input[type="file"]')).toBeNull();
    // First input (reason code) is focused on open.
    expect(within(dialog).getByLabelText('Mã lý do sai lệch')).toBe(document.activeElement);
  }, 15_000);

  it('surfaces the AC5 discrepancy-routing cue on the focused line before capture', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();

    // Same `needsDiscrepancyRouting` predicate that drives the QC blocked card:
    // the focused-line discrepancy trigger nudges the operator to handle the
    // discrepancy before QC, and the canonical trigger is enabled to do so.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-discrepancy-trigger-helper').textContent).toContain(
        'Dòng có sai lệch',
      ),
    );
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toHaveProperty(
      'disabled',
      false,
    );
  }, 15_000);

  it('shows the real backend message inline for a failed QC evaluation, not the old generic hard-coded copy (IFB-06)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.evaluateQcTask.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Receipt line has already been evaluated for QC.',
      }),
    );
    repo.current = fake;
    renderPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-qc-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-err');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));

    expect(await screen.findByText('Receipt line has already been evaluated for QC.')).toBeTruthy();
    expect(screen.queryByText('Không thể đánh giá QC.')).toBeNull();
  });

  it('shows the real backend message inline for a failed QC result recording, not the old generic hard-coded copy (IFB-06)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.recordQcResult.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        code: 'BUSINESS_RULE',
        message: 'QC result has already been recorded for this task.',
      }),
    );
    repo.current = fake;
    renderPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-qc-result-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await actor.click(screen.getByLabelText('Bắt buộc QC'));
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-result-err');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    const recordButton = screen.getByRole('button', { name: 'Ghi nhận kết quả QC' });
    await openTechnicalDetails(actor, 'inbound-qc-result-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency kết quả QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency kết quả QC'), 'qc-result-err');
    await waitFor(() => expect(recordButton).toHaveProperty('disabled', false));
    fireEvent.submit(recordButton.closest('form') as HTMLFormElement);

    expect(
      await screen.findByText('QC result has already been recorded for this task.'),
    ).toBeTruthy();
    expect(screen.queryByText('Không thể ghi nhận kết quả QC.')).toBeNull();
  });

  it('evaluates QC skipped after a confirmed receipt line', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));

    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(fake.evaluateQcTask).toHaveBeenCalledWith('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-skipped',
      forceRequired: false,
      reasonCode: null,
      reasonNote: null,
      evidenceRefs: [],
    });
    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('inbound-workflow-step-qc').textContent).toContain('Không yêu cầu');
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-qc'));
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    expect((await screen.findByTestId('inbound-qc-not-required-state')).textContent).toContain(
      'QC: Không yêu cầu',
    );
    // QC fast path: when the evaluated task is NOT required the record sub-form is
    // HIDDEN entirely (not merely disabled), so neither its submit button nor its
    // quantity inputs are in the DOM, while the LPN step is unblocked.
    expect(screen.queryByRole('button', { name: 'Ghi nhận kết quả QC' })).toBeNull();
    expect(screen.queryByLabelText('Số lượng đã kiểm')).toBeNull();
    expect(screen.queryByLabelText('Số lượng đạt')).toBeNull();
    expect(screen.queryByLabelText('Số lượng loại')).toBeNull();
    expect(screen.queryByLabelText('Trạng thái kết quả QC')).toBeNull();
    // The two-step model is intact: the first action stays present and distinct.
    expect(screen.getByRole('button', { name: 'Đánh giá QC' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận QC' })).toBeNull();
    expect(screen.queryByText(/Bỏ qua QC|Đã bỏ qua|Báo vấn đề QC/i)).toBeNull();
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();

    // The read-only ribbon is no longer the navigator: clicking a `waiting` step
    // (LPN, here reachable but not active) is INERT and never raises a prominent
    // blocked card over the open QC panel.
    await actor.click(screen.getByTestId('inbound-workflow-step-button-lpn'));
    expect(screen.getByTestId('inbound-qc-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-action-blocked')).toBeNull();
  });

  it('confirms LPN/SSCC and releases READY_FOR_PUTAWAY line to putaway', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    // LPN/SSCC terminology (never "Pallet"): the panel title and both code fields.
    expect(screen.getByText('LPN/SSCC và phát hành cất hàng')).toBeTruthy();
    expect(screen.getByLabelText('Mã LPN')).toBeTruthy();
    expect(screen.getByLabelText('Mã SSCC')).toBeTruthy();
    expect(screen.queryByText(/Pallet/i)).toBeNull();
    expect(screen.queryByLabelText(/Pallet/i)).toBeNull();

    const releaseButton = screen.getByRole('button', { name: 'Phát hành sang cất hàng' });
    expect(releaseButton).toHaveProperty('disabled', true);
    await actor.type(screen.getByLabelText('Mã LPN'), 'LPN-0001');
    await actor.type(screen.getByLabelText('Mã SSCC'), '003456789012345678');
    await openTechnicalDetails(actor, 'inbound-lpn-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency LPN'));
    await actor.type(screen.getByLabelText('Khóa idempotency LPN'), 'lpn-1');
    await actor.click(screen.getByRole('button', { name: 'Xác nhận LPN/SSCC' }));

    expect(await screen.findByText(/LPN LPN-0001 \/ 003456789012345678/i)).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-release-technical-details');
    // Conditional upfront audit warning near releaseRequireLpn: it only matters once
    // the operator turns the requirement OFF, so it is absent while "Yêu cầu LPN" is on.
    expect(screen.queryByTestId('inbound-release-require-lpn-warning')).toBeNull();
    // Turning the requirement off surfaces the warning that the backend
    // WarehouseProfile may still require an LPN even when the UI option is off.
    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    expect(screen.getByTestId('inbound-release-require-lpn-warning').textContent).toContain(
      'Kho có thể vẫn yêu cầu LPN dù tắt tùy chọn này',
    );
    // Re-enable the requirement so the release payload below asserts requireLpn: true.
    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    expect(screen.queryByTestId('inbound-release-require-lpn-warning')).toBeNull();
    await actor.clear(screen.getByLabelText('Mã vị trí hiện tại'));
    await actor.type(screen.getByLabelText('Mã vị trí hiện tại'), 'RCV-01');
    await actor.clear(screen.getByLabelText('Khóa idempotency phát hành'));
    await actor.type(screen.getByLabelText('Khóa idempotency phát hành'), 'release-1');
    await waitFor(() => expect(releaseButton).toHaveProperty('disabled', false));
    fireEvent.submit(releaseButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(fake.confirmInboundLpn).toHaveBeenCalledTimes(1));
    expect(fake.confirmInboundLpn).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      idempotencyKey: 'lpn-1',
    });
    await waitFor(() => expect(fake.releaseInboundToPutaway).toHaveBeenCalledTimes(1));
    expect(fake.releaseInboundToPutaway).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      currentLocationCode: 'RCV-01',
      requireLpn: true,
      attemptLabelOverride: false,
      reasonCode: null,
      evidenceRefs: [],
      idempotencyKey: 'release-1',
    });
    expect(
      await screen.findByText(/Đã phát hành 12 EA \/ READY_FOR_PUTAWAY \/ RCV-01/i),
    ).toBeTruthy();
  }, 15_000);

  it('shows backend release block reason inline', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.releaseInboundToPutaway.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Inventory status PENDING_QC cannot be released to putaway',
      }),
    );
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    await openTechnicalDetails(actor, 'inbound-release-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency phát hành'));
    await actor.type(screen.getByLabelText('Khóa idempotency phát hành'), 'release-blocked');
    const releaseButton = screen.getByRole('button', { name: 'Phát hành sang cất hàng' });
    await waitFor(() => expect(releaseButton).toHaveProperty('disabled', false));
    fireEvent.submit(releaseButton.closest('form') as HTMLFormElement);

    expect(
      await screen.findByText(/Inventory status PENDING_QC cannot be released to putaway/i),
    ).toBeTruthy();
  });

  it('records required QC result with split quarantine disposition and evidence', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await actor.click(screen.getByLabelText('Bắt buộc QC'));
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-required');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    // QC fast path: when required, the record sub-form is PRESENT and the three
    // quantities are pre-filled / auto-balanced from the line's actualQuantity
    // (inspected = accepted = 12, rejected = 0 so accepted + rejected === inspected).
    expect(screen.queryByTestId('inbound-qc-not-required-state')).toBeNull();
    expect(screen.getByLabelText('Số lượng đã kiểm')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Số lượng đạt')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Số lượng loại')).toHaveProperty('value', '0');
    // Two distinct steps remain — no collapsed single QC button.
    expect(screen.getByRole('button', { name: 'Đánh giá QC' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ghi nhận kết quả QC' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận QC' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Trạng thái kết quả QC'), {
      target: { value: 'Failed' },
    });
    fireEvent.change(screen.getByLabelText('Hướng xử lý QC'), { target: { value: 'Quarantine' } });
    fireEvent.change(screen.getByLabelText('Số lượng đạt'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '3' } });
    const recordButton = screen.getByRole('button', { name: 'Ghi nhận kết quả QC' });
    expect(recordButton).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('Mã lý do kết quả QC'), {
      target: { value: 'RC-V1-DISCREPANCY' },
    });
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '4' } });
    await openTechnicalDetails(actor, 'inbound-qc-result-technical-details');
    fireEvent.change(screen.getByLabelText('Khóa idempotency kết quả QC'), {
      target: { value: 'qc-result-split' },
    });
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng kết quả QC'), {
      target: { value: ',,' },
    });
    expect(screen.getByTestId('inbound-qc-result-helper').textContent).toContain(
      'Kết quả QC này cần tham chiếu bằng chứng',
    );
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng kết quả QC'), {
      target: { value: 'photo://qc/damaged-4' },
    });
    await waitFor(() => expect(recordButton).toHaveProperty('disabled', false));
    fireEvent.submit(recordButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(fake.recordQcResult).toHaveBeenCalledTimes(1));
    expect(fake.recordQcResult).toHaveBeenCalledWith('qc-task-1', {
      idempotencyKey: 'qc-result-split',
      resultStatus: 'Failed',
      dispositionCode: 'Quarantine',
      inspectedQuantity: 12,
      acceptedQuantity: 8,
      rejectedQuantity: 4,
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: null,
      evidenceRefs: ['photo://qc/damaged-4'],
    });
    await waitFor(() => expect(fake.recordQcResult).toHaveBeenCalledTimes(1));
    const blockedAction = await screen.findByTestId('inbound-action-blocked');
    expect(blockedAction.textContent).toContain('READY_FOR_PUTAWAY');
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('keeps discrepancy route disabled until a real evidence ref is provided', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    const discrepancyDialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    const routeButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    expect(routeButton).toHaveProperty('disabled', true);
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), ',,');
    expect(
      within(discrepancyDialog).getByTestId('inbound-discrepancy-helper').textContent,
    ).toContain('Nhập tham chiếu bằng chứng sai lệch');
    expect(routeButton).toHaveProperty('disabled', true);
    expect(fake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('defaults discrepancy type from the confirmed receipt-line signal', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.confirmReceiptLine.mockResolvedValueOnce({
      id: 'receipt-line-1',
      receiptId: 'receipt-1',
      inboundPlanId: 'inbound-plan-1',
      inboundPlanLineId: 'line-1',
      lineNumber: 1,
      skuId: 'sku-1',
      skuCode: 'SKU-A',
      uomId: 'uom-1',
      uomCode: 'EA',
      expectedQuantity: 12,
      actualQuantity: 12,
      status: 'Discrepancy',
      manualConfirm: false,
      reasonCode: null,
      reasonCodeId: null,
      reasonNote: null,
      scanEvidenceJson: { RawValue: 'wrong-sku-barcode' },
      discrepancySignals: ['WrongSku'],
      idempotencyKey: 'receipt-line-wrong-sku',
      receivedAt: '2026-06-22T09:10:00.000Z',
      receivedBy: 'test-admin',
      isDuplicate: false,
      createdAt: '2026-06-22T09:10:00.000Z',
      updatedAt: '2026-06-22T09:10:00.000Z',
    });
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.type(screen.getByLabelText('Quét mã hàng'), 'wrong-sku-barcode');
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-wrong-sku');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Sai SKU/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByLabelText('Loại sai lệch')).toHaveProperty('value', 'WrongSku');
  }, 15_000);

  it('resets discrepancy type to the default when opening a no-signal line', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    // Confirm the full expected quantity (12) so the line carries NO discrepancy
    // signal; opening the overlay must still land on the documented default type
    // rather than inheriting a stale value.
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '12');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    const trigger = await screen.findByRole('button', { name: 'Báo sai lệch dòng này' });
    await waitFor(() => expect(trigger).toHaveProperty('disabled', false));
    await actor.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByLabelText('Loại sai lệch')).toHaveProperty('value', 'QuantityVariance');
  }, 15_000);

  it('hides the discrepancy trigger before a confirmed line and shows it after', async () => {
    const actor = userEvent.setup();

    // Gate-in step: a line is focused but no receipt line is confirmed yet, so the
    // canonical trigger must be hidden (not a disabled, meaningless control).
    const gateInFake = new FakeRepository([makePlan()]);
    allowReceiving(gateInFake);
    repo.current = gateInFake;
    const gateInView = renderPage('/inbound/inbound-plan-1/gate-in');
    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    expect(screen.getByTestId('inbound-gate-in-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();
    gateInView.unmount();
    cleanup();

    // Receiving step: still hidden before confirm; appears once a line is received.
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-discrepancy-trigger')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toBeTruthy();
  }, 15_000);

  it('surfaces the filed-discrepancy status near the trigger after capture', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    await waitFor(() => expect(fake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    // Overlay closes back to /receiving and the focused-line console now makes the
    // filed state obvious: a status line + a relabelled review/update trigger.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-discrepancy-trigger-helper').textContent).toContain(
        'Đã báo sai lệch — Chờ phê duyệt',
      ),
    );
    expect(screen.getByRole('button', { name: 'Xem/cập nhật sai lệch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Báo sai lệch dòng này' })).toBeNull();
  }, 15_000);

  it('hides the discrepancy trigger when a different, not-yet-received source line is selected', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          {
            id: 'line-1',
            lineNumber: 1,
            skuId: 'sku-1',
            skuCode: 'SKU-A',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 12,
            externalLineReference: '10',
          },
          {
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 8,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(fake);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    // Single canonical trigger lives in the focused-line console; the receiving
    // panel no longer co-renders a competing discrepancy surface.
    expect(screen.queryByTestId('inbound-discrepancy-entry')).toBeNull();
    expect(await screen.findByTestId('inbound-discrepancy-trigger')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toHaveProperty(
      'disabled',
      false,
    );
    // Switching to line-2 (no confirmed receipt line) hides the trigger entirely:
    // discrepancy capture requires a received line, and line-1's filed state must
    // not leak onto the newly focused line.
    await actor.click(screen.getByRole('button', { name: /Dòng 2 — SKU-B/i }));
    await waitFor(() => expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull());
    expect(screen.queryByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();
    expect(fake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('shows an inline discrepancy route error when backend rejects capture', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.captureDiscrepancy.mockRejectedValueOnce(
      new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Evidence is required' }),
    );
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-error');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    const discrepancyDialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    expect(
      await within(discrepancyDialog).findByText(/Không thể chuyển xử lý sai lệch/i),
    ).toBeTruthy();
  });

  it('clears stale readiness override after gate-in is recorded', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1/receiving');

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    expect(fake.recordGateIn).not.toHaveBeenCalled();
  });

  it('shows permission denied read-only state when detail read is forbidden', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/Không có quyền đọc kế hoạch nhập kho/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
  });

  it('passes source-system and document-number filters to the repository', async () => {
    const fake = new FakeRepository([
      makePlan({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      makePlan({
        id: 'inbound-plan-2',
        sourceSystem: 'OWNER-PORTAL',
        sourceDocumentNumber: 'ASN-20001',
      }),
    ]);
    repo.current = fake;
    renderListPage();

    // Card (mobile) and table (desktop) both live in the DOM (responsive is CSS-only),
    // so the document number now matches twice — assert with findAllByText.
    await screen.findAllByText('ASN-10001');
    expect(screen.getByRole('link', { name: 'Tạo kế hoạch nhập kho' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Mở chi tiết' })[0]).toHaveProperty(
      'href',
      expect.stringContaining('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Lọc hệ thống nguồn'), { target: { value: 'ERP' } });
    fireEvent.change(screen.getByLabelText('Lọc số chứng từ'), { target: { value: 'ASN-10001' } });

    await waitFor(
      () =>
        expect(fake.list).toHaveBeenCalledWith(
          expect.objectContaining({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
        ),
      { timeout: 5_000 },
    );
  }, 15_000);

  it('renders the desktop table with columns and per-row actions alongside the mobile cards', async () => {
    const fake = new FakeRepository([
      makePlan({ sourceDocumentNumber: 'ASN-10001', warehouseCode: 'WT-01' }),
    ]);
    repo.current = fake;
    renderListPage();

    // Desktop table block (rendered in DOM regardless of viewport since responsive is CSS-only).
    const table = await screen.findByTestId('inbound-plan-table');
    expect(within(table).getByText('Số chứng từ')).toBeTruthy();
    expect(within(table).getByText('Trạng thái')).toBeTruthy();
    expect(within(table).getByText('CoreFlow')).toBeTruthy();

    // The plan row carries its own testid and the same column data as the card.
    const row = screen.getByTestId('inbound-plan-row-inbound-plan-1');
    expect(within(row).getByText('WT-01')).toBeTruthy();

    // Per-row actions route to detail and receiving just like the card.
    const detailLink = within(row).getByRole('link', { name: 'Mở chi tiết' });
    expect(detailLink).toHaveProperty('href', expect.stringContaining('/inbound/inbound-plan-1'));
    const receivingLink = within(row).getByRole('link', { name: 'Thao tác tiếp nhận' });
    expect(receivingLink).toHaveProperty(
      'href',
      expect.stringContaining('/inbound/inbound-plan-1/receiving'),
    );

    // Mobile cards remain in the DOM too (responsive switch is Tailwind CSS).
    expect(screen.getAllByText('ASN-10001').length).toBeGreaterThanOrEqual(2);
  });

  it('rehydrates receiving progress from operational-state after reload without re-firing mutations', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    fake.operationalState = {
      inboundPlanId: 'inbound-plan-1',
      receivingSessions: [
        { inboundPlanId: 'inbound-plan-1', receiptId: 'receipt-1' } as unknown as ReceivingSession,
      ],
      receiptLines: [
        {
          id: 'receipt-line-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Received',
          discrepancySignals: [],
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [],
      releases: [],
    };
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1');

    // Persisted receipt line is rehydrated on load (simulating reload): the focused line's
    // stage reflects "Đã tiếp nhận" without any confirmReceiptLine mutation in this session.
    const chip = await screen.findByTestId('inbound-line-stage-chip-line-1');
    expect(chip.textContent).toContain('Đã tiếp nhận');
    expect(fake.getOperationalState).toHaveBeenCalledWith('inbound-plan-1');
    expect(fake.confirmReceiptLine).not.toHaveBeenCalled();
  });

  it('rehydrates the LATEST receipt line and its correlated QC result on reload (multi-row)', async () => {
    const fake = new FakeRepository([makePlan()]);
    allowReceiving(fake);
    // Two receipt lines for the same plan line (re-receive); QC result is tied to the NEWER one.
    // The derivation must pick the latest receipt line so the QC result correlates → stage = QC.
    // First-match selection would pick `rl-old`, the QC result would not correlate, and the
    // line would stay stuck at "Đã tiếp nhận".
    fake.operationalState = {
      inboundPlanId: 'inbound-plan-1',
      receivingSessions: [
        {
          inboundPlanId: 'inbound-plan-1',
          receiptId: 'receipt-1',
          startedAt: '2026-06-29T01:00:00Z',
        } as unknown as ReceivingSession,
      ],
      receiptLines: [
        {
          id: 'rl-old',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Received',
          receivedAt: '2026-06-29T01:00:00Z',
          discrepancySignals: [],
        } as unknown as ReceiptLine,
        {
          id: 'rl-new',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Received',
          receivedAt: '2026-06-29T05:00:00Z',
          discrepancySignals: [],
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-1',
          receiptLineId: 'rl-new',
          inboundPlanLineId: 'line-1',
          taskStatus: 'Dispositioned',
          required: true,
          createdAt: '2026-06-29T05:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [
        {
          id: 'qcr-1',
          qcTaskId: 'qc-1',
          receiptLineId: 'rl-new',
          resultStatus: 'Passed',
          dispositionCode: 'Release',
          recordedAt: '2026-06-29T06:00:00Z',
        } as unknown as QcResult,
      ],
      lpns: [],
      releases: [],
    };
    repo.current = fake;
    renderPage('/inbound/inbound-plan-1');

    const chip = await screen.findByTestId('inbound-line-stage-chip-line-1');
    expect(chip.textContent).toContain('Đã QC');
    expect(fake.recordQcResult).not.toHaveBeenCalled();
  });
});
