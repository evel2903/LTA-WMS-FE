// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { IInventoryRepository } from '@modules/Inventory/Application/Interfaces/IInventoryRepository';
import type { InventoryControlResult } from '@modules/Inventory/Domain/Types/InventoryControl';

const repo = vi.hoisted(() => ({ current: null as unknown as IInventoryRepository }));
vi.mock('@modules/Inventory/Infrastructure/Repositories/InventoryRepository', () => ({
  get inventoryRepository() {
    return repo.current;
  },
}));

import { InventoryControlPanel } from '@modules/Inventory/Presentation/Components/InventoryControlPanel';

const result: InventoryControlResult = {
  inventoryTransaction: {
    id: 'transaction-1',
    transactionCode: 'ITX-001',
    transactionType: 'StatusChange',
    transactionStatus: 'Posted',
    putawayTaskId: null,
    putawayTaskCode: null,
    inventoryMovementId: 'movement-1',
    ownerId: 'owner-1',
    ownerCode: null,
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-A',
    skuId: 'sku-1',
    skuCode: null,
    uomId: null,
    uomCode: null,
    quantity: 2,
    fromInventoryStatusCode: 'HOLD',
    toInventoryStatusCode: 'AVAILABLE',
    fromLocationId: 'loc-1',
    fromLocationCode: 'A-01',
    toLocationId: 'loc-1',
    toLocationCode: 'A-01',
    lpnCode: null,
    ssccCode: null,
    idempotencyKey: 'status-key-1',
    outboxMessageId: 'outbox-1',
    reasonCode: 'INV_RELEASE',
    reasonCodeId: 'reason-1',
    reasonNote: null,
    evidenceRefs: [],
    postedAt: '2026-06-23T05:00:00.000Z',
    postedBy: 'operator-1',
    createdAt: '2026-06-23T05:00:00.000Z',
    updatedAt: '2026-06-23T05:00:00.000Z',
  },
  inventoryMovement: {
    id: 'movement-1',
    movementCode: 'IMV-001',
    movementStatus: 'Posted',
    inventoryTransactionId: 'transaction-1',
    putawayTaskId: null,
    putawayTaskCode: null,
    ownerId: 'owner-1',
    ownerCode: null,
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-A',
    skuId: 'sku-1',
    skuCode: null,
    uomId: null,
    uomCode: null,
    quantity: 2,
    fromDimensionId: 'dimension-source',
    fromBalanceId: 'balance-source',
    fromLocationId: 'loc-1',
    fromLocationCode: 'A-01',
    fromInventoryStatusCode: 'HOLD',
    toDimensionId: 'dimension-target',
    toBalanceId: 'balance-target',
    toLocationId: 'loc-1',
    toLocationCode: 'A-01',
    toInventoryStatusCode: 'AVAILABLE',
    lpnCode: null,
    ssccCode: null,
    scanEvidenceJson: {},
    createdAt: '2026-06-23T05:00:00.000Z',
    createdBy: 'operator-1',
  },
  sourceBalance: {
    balanceId: 'balance-source',
    dimensionId: 'dimension-source',
    qtyOnHand: 8,
    qtyReserved: 0,
    qtyAvailable: 8,
  },
  targetBalance: {
    balanceId: 'balance-target',
    dimensionId: 'dimension-target',
    qtyOnHand: 2,
    qtyReserved: 0,
    qtyAvailable: 2,
  },
  outboxMessageId: 'outbox-1',
  eventType: 'InventoryStatusChanged',
  isDuplicate: false,
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InventoryControlPanel />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('InventoryControlPanel', () => {
  it('submits status change through repository layer and renders ledger result', async () => {
    const actor = userEvent.setup();
    const changeStatus = vi.fn(() => Promise.resolve(result));
    const fake = {
      changeStatus,
      moveInternal: vi.fn(() => Promise.resolve({ ...result, eventType: 'InventoryMoved' })),
      list: vi.fn(),
      getById: vi.fn(),
      adjustQuantity: vi.fn(),
    } as unknown as IInventoryRepository;
    repo.current = fake;

    renderPanel();
    const statusForm = within(screen.getByRole('form', { name: /Status change/i }));

    await actor.type(statusForm.getByLabelText('Status source balance id'), 'balance-source');
    await actor.clear(statusForm.getByLabelText('Target status'));
    await actor.type(statusForm.getByLabelText('Target status'), 'AVAILABLE');
    await actor.type(statusForm.getByLabelText('Status quantity'), '2');
    await actor.type(statusForm.getByLabelText('Status reason code'), 'INV_RELEASE');
    await actor.type(statusForm.getByLabelText('Status idempotency key'), 'status-key-1');
    await actor.click(statusForm.getByRole('button', { name: /Post status change/i }));

    await waitFor(() =>
      expect(changeStatus).toHaveBeenCalledWith({
        sourceBalanceId: 'balance-source',
        targetInventoryStatusCode: 'AVAILABLE',
        quantity: 2,
        reasonCode: 'INV_RELEASE',
        reasonNote: undefined,
        evidenceRefs: [],
        idempotencyKey: 'status-key-1',
      }),
    );
    expect(await screen.findByText(/InventoryStatusChanged/i)).toBeTruthy();
    expect(await screen.findByText(/Transaction: ITX-001/i)).toBeTruthy();
  });

  it('surfaces backend reason requirement inline', async () => {
    const actor = userEvent.setup();
    const fake = {
      changeStatus: vi.fn(() =>
        Promise.reject(
          new ApiError({
            status: 400,
            code: 'BUSINESS_RULE',
            message: 'ReasonCode is required for inventory status/movement control',
          }),
        ),
      ),
      moveInternal: vi.fn(),
      list: vi.fn(),
      getById: vi.fn(),
      adjustQuantity: vi.fn(),
    } as unknown as IInventoryRepository;
    repo.current = fake;

    renderPanel();
    const statusForm = within(screen.getByRole('form', { name: /Status change/i }));

    await actor.type(statusForm.getByLabelText('Status source balance id'), 'balance-source');
    await actor.clear(statusForm.getByLabelText('Target status'));
    await actor.type(statusForm.getByLabelText('Target status'), 'AVAILABLE');
    await actor.type(statusForm.getByLabelText('Status quantity'), '2');
    await actor.type(statusForm.getByLabelText('Status reason code'), 'INV_RELEASE');
    await actor.type(statusForm.getByLabelText('Status idempotency key'), 'status-key-1');
    await actor.click(statusForm.getByRole('button', { name: /Post status change/i }));

    expect(
      await screen.findByText(/ReasonCode is required for inventory status\/movement control/i),
    ).toBeTruthy();
  });

  it('does not submit invalid forms when submit is triggered programmatically', () => {
    const changeStatus = vi.fn(() => Promise.resolve(result));
    const moveInternal = vi.fn(() => Promise.resolve({ ...result, eventType: 'InventoryMoved' }));
    const fake = {
      changeStatus,
      moveInternal,
      list: vi.fn(),
      getById: vi.fn(),
      adjustQuantity: vi.fn(),
    } as unknown as IInventoryRepository;
    repo.current = fake;

    renderPanel();

    fireEvent.submit(screen.getByRole('form', { name: /Status change/i }));
    fireEvent.submit(screen.getByRole('form', { name: /Internal movement/i }));

    expect(changeStatus).not.toHaveBeenCalled();
    expect(moveInternal).not.toHaveBeenCalled();
  });
});
