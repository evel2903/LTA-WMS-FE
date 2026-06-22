// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import type { InboundPlan } from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  InboundPlanFilter,
  RecordGateInInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundRepository }));
vi.mock('@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance', () => ({
  get inboundRepository() {
    return repo.current;
  },
}));

import { InboundPage } from '@modules/Inbound/Presentation/Pages/InboundPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
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
  public readiness = {
    allowed: false,
    blocked: true,
    decision: 'Blocked',
    gateInRequired: true,
    gateInRecorded: false,
    overrideAccepted: false,
    reason: 'Gate-in is required before receiving.',
  } as const;

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

  getById = vi.fn((id: string) =>
    Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]),
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
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InboundPage />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('InboundPage', () => {
  it('lists plans, shows line detail and validates receiving readiness state', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    expect(screen.getByText('SKU-A')).toBeTruthy();
    expect(screen.getByText(/ETA: 2026-06-22T08:00:00.000Z/i)).toBeTruthy();
    expect(screen.getByText(/CoreFlow trace: core-flow-1/i)).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText(/Gate-in is required before receiving/i)).toBeTruthy();
    expect(fake.validateReadiness).toHaveBeenCalledWith('inbound-plan-1', {
      attemptOverride: false,
    });
  });

  it('creates source document and records gate-in through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.type(screen.getByLabelText('Source document number'), 'ASN-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('Expected arrival'), '2026-06-22T08:00');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.clear(screen.getByLabelText('Expected quantity'));
    await actor.type(screen.getByLabelText('Expected quantity'), '12');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceSystem: 'ERP',
          sourceDocumentNumber: 'ASN-10001',
          lines: [expect.objectContaining({ skuId: 'sku-1', expectedQuantity: 12 })],
        }),
      ),
    );
    const createInput = fake.create.mock.calls[0][0];
    expect(createInput.expectedArrivalAt).toMatch(/^2026-06-22T/);

    const gateForm = screen
      .getByRole('button', { name: 'Record gate-in' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Gate reference'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Record gate-in' }));

    await waitFor(() =>
      expect(fake.recordGateIn).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ gateReference: 'GATE-A-001' }),
      ),
    );
  });

  it('shows duplicate/idempotent source trace when backend returns duplicate flag', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.create.mockResolvedValueOnce(makePlan({ isDuplicate: true }));
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.type(screen.getByLabelText('Source document number'), 'ASN-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

    expect(await screen.findByText(/existing inbound plan reused/i)).toBeTruthy();
  });

  it('creates source document with multiple lines and external line references', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.clear(screen.getByLabelText('Source document type'));
    await actor.type(screen.getByLabelText('Source document type'), 'PO');
    await actor.type(screen.getByLabelText('Source document number'), 'PO-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.clear(screen.getByLabelText('Expected quantity'));
    await actor.type(screen.getByLabelText('Expected quantity'), '12');
    await actor.type(screen.getByLabelText('External line reference'), '10');

    await actor.click(screen.getByRole('button', { name: 'Add line' }));
    const skuInputs = screen.getAllByLabelText('SKU id');
    const uomInputs = screen.getAllByLabelText('UOM id');
    const qtyInputs = screen.getAllByLabelText('Expected quantity');
    const refInputs = screen.getAllByLabelText('External line reference');
    await actor.type(skuInputs[1], 'sku-2');
    await actor.type(uomInputs[1], 'uom-2');
    await actor.clear(qtyInputs[1]);
    await actor.type(qtyInputs[1], '8');
    await actor.type(refInputs[1], '20');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

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
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    expect(screen.getByRole('button', { name: 'Override readiness' })).toHaveProperty(
      'disabled',
      true,
    );

    await actor.type(screen.getByLabelText('Readiness reason code'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Override readiness' }));

    await waitFor(() =>
      expect(fake.validateReadiness).toHaveBeenLastCalledWith('inbound-plan-1', {
        attemptOverride: true,
        reasonCode: 'RC-V1-HANDOFF',
      }),
    );
    expect(await screen.findByText(/override accepted/i)).toBeTruthy();
  });

  it('clears stale readiness override after gate-in is recorded', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.type(screen.getByLabelText('Readiness reason code'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Override readiness' }));
    expect(await screen.findByText(/override accepted/i)).toBeTruthy();

    const gateForm = screen
      .getByRole('button', { name: 'Record gate-in' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Gate reference'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Record gate-in' }));

    await waitFor(() => expect(screen.queryByText(/override accepted/i)).toBeNull());
    expect(fake.recordGateIn).toHaveBeenCalledWith(
      'inbound-plan-1',
      expect.objectContaining({ gateReference: 'GATE-A-001' }),
    );
  });

  it('shows permission denied read-only state when list is forbidden', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create inbound plan' })).toBeNull();
  });

  it('passes source-system and document-number filters to the repository', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePlan({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      makePlan({
        id: 'inbound-plan-2',
        sourceSystem: 'OWNER-PORTAL',
        sourceDocumentNumber: 'ASN-20001',
      }),
    ]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.type(screen.getByLabelText('Source system filter'), 'ERP');
    await actor.type(screen.getByLabelText('Document number filter'), 'ASN-10001');

    await waitFor(() =>
      expect(fake.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      ),
    );
  });
});
