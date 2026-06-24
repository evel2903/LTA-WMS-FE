import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { PackingRepository } from '@modules/Packing/Infrastructure/Repositories/PackingRepository';
import type {
  LabelBlockingValidationResultDto,
  PackSessionDto,
  PackageDto,
  PagedPackageDto,
  ReadyForStagingResultDto,
} from '@modules/Packing/Infrastructure/Dtos/PackingDtos';

const sessionDto: PackSessionDto = {
  Id: 'session-1',
  SessionNumber: 'PACK-S-001',
  PickTaskId: 'pick-task-1',
  MobileTaskId: 'mobile-task-1',
  OutboundOrderId: 'outbound-1',
  WarehouseProfileId: 'profile-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN',
  Status: 'CheckingPassed',
  CheckRequired: true,
  CheckResult: 'Passed',
  CheckExceptionCaseId: null,
  StartedAt: '2026-06-24T00:00:00.000Z',
  StartedBy: 'user-1',
  CheckedAt: '2026-06-24T00:05:00.000Z',
  CheckedBy: 'user-1',
};

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
  Weight: 10,
  Length: 30,
  Width: 20,
  Height: 15,
  LabelBlockingDecision: 'Allowed',
  LabelPrintJobId: 'print-job-1',
  LabelPrintJobCode: 'PJ-001',
  ClosedAt: '2026-06-24T00:10:00.000Z',
  ClosedBy: 'user-1',
  ReadyForStagingAt: null,
  ReadyForStagingBy: null,
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:10:00.000Z',
  Contents: [],
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
  ValidationDetails: {},
};

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const page: PagedPackageDto = {
      Items: [packageDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };
    return Promise.resolve((url.includes('/packing/packages/') ? packageDto : page) as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    if (url.endsWith('/ready-for-staging')) {
      return Promise.resolve({
        Package: { ...packageDto, Status: 'ReadyForStaging' },
        LabelValidation: labelValidationDto,
        IsDuplicate: false,
      } as ReadyForStagingResultDto as T);
    }
    if (url.includes('/sessions')) return Promise.resolve(sessionDto as T);
    return Promise.resolve(packageDto as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve(packageDto as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve(packageDto as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('PackingRepository', () => {
  it('normalizes package list PageSize to default 50 and max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new PackingRepository(http);

    await repository.list({ page: 0, pageSize: 0 });
    await repository.list({ page: 3, pageSize: 500, status: 'Packed', pickTaskId: 'pick-task-1' });

    expect(http.calls[0]).toMatchObject({
      method: 'get',
      url: '/packing/packages',
      config: { params: { Page: 1, PageSize: 50 } },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'get',
      url: '/packing/packages',
      config: { params: { Page: 3, PageSize: 100, Status: 'Packed', PickTaskId: 'pick-task-1' } },
    });
  });

  it('uses BE endpoints and PascalCase payloads for packing actions', async () => {
    const http = new FakeHttpClient();
    const repository = new PackingRepository(http);

    await repository.startSession({
      pickTaskId: 'pick-task-1',
      mobileTaskId: 'mobile-task-1',
      warehouseProfileId: 'profile-1',
      checkRequired: true,
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['scan:1'],
      idempotencyKey: 'session-1',
    });
    await repository.recordCheck('session-1', {
      checkResult: 'Mismatch',
      observedQuantity: 4,
      observedSkuId: 'sku-2',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['scan:2'],
      idempotencyKey: 'check-1',
    });
    await repository.createPackage({
      packSessionId: 'session-1',
      cartonType: 'CARTON-STD',
      weight: 10,
      contents: [{ pickTaskId: 'pick-task-1', quantity: 4 }],
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['carton:1'],
      idempotencyKey: 'create-1',
    });
    await repository.closePackage('package-1', {
      cartonType: 'CARTON-STD',
      weight: 10,
      idempotencyKey: 'close-1',
    });
    await repository.readyForStaging('package-1', {
      labelType: 'PACKAGE',
      attemptOverride: false,
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['label:1'],
      idempotencyKey: 'ready-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['post', '/packing/sessions'],
      ['post', '/packing/sessions/session-1/check'],
      ['post', '/packing/packages'],
      ['post', '/packing/packages/package-1/close'],
      ['post', '/packing/packages/package-1/ready-for-staging'],
    ]);
    expect(http.calls[0].body).toMatchObject({
      PickTaskId: 'pick-task-1',
      WarehouseProfileId: 'profile-1',
      CheckRequired: true,
      IdempotencyKey: 'session-1',
    });
    expect(http.calls[1].body).toMatchObject({
      CheckResult: 'Mismatch',
      ObservedQuantity: 4,
      IdempotencyKey: 'check-1',
    });
    expect(http.calls[2].body).toMatchObject({
      PackSessionId: 'session-1',
      CartonType: 'CARTON-STD',
      Contents: [{ PickTaskId: 'pick-task-1', Quantity: 4 }],
      IdempotencyKey: 'create-1',
    });
    expect(http.calls[4].body).toMatchObject({
      LabelType: 'PACKAGE',
      AttemptOverride: false,
      IdempotencyKey: 'ready-1',
    });
  });
});
