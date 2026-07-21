// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const repository = vi.hoisted(() => ({ createManualReceipt: vi.fn() }));

vi.mock(
  '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance',
  () => ({ inboundReceivingRepository: repository }),
);

vi.mock('@modules/InboundReceiving/Presentation/Components/UseManualReceiptLookups', () => ({
  useManualReceiptLookups: () => ({
    supplierOptions: [{ value: 'supplier-1', label: 'SUP-1 - Nhà cung cấp 1' }],
    supplierQuery: { isLoading: false, isError: false },
    supplierSearch: '',
    setSupplierSearch: vi.fn(),
    ownerOptions: [{ value: 'owner-1', label: 'OWN-1 - Chủ hàng 1' }],
    ownerQuery: { isLoading: false, isError: false },
    ownerSearch: '',
    setOwnerSearch: vi.fn(),
    warehouseOptions: [{ value: 'warehouse-1', label: 'WH-1 - Kho 1' }],
    warehouseQuery: { isLoading: false, isError: false },
    warehouseSearch: '',
    setWarehouseSearch: vi.fn(),
    warehouseProfileOptions: [],
    warehouseProfileQuery: { isLoading: false, isError: false },
    warehouseProfileSearch: '',
    setWarehouseProfileSearch: vi.fn(),
  }),
}));

import { ManualReceiptCreatePage } from '@modules/InboundReceiving/Presentation/Pages/ManualReceiptCreatePage';

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/inbound-receiving/new']}>
        <Routes>
          <Route path="/inbound-receiving/new" element={<ManualReceiptCreatePage />} />
          <Route
            path="/inbound-receiving/receipts/:receiptId"
            element={<p>receipt-destination</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ManualReceiptCreatePage', () => {
  it('validates required inputs and redirects after duplicate-safe creation', async () => {
    repository.createManualReceipt.mockResolvedValueOnce({
      receipt: { id: 'receipt-1', inboundPlanId: null },
      session: { id: 'session-1' },
      isDuplicate: true,
    });
    const user = userEvent.setup();

    renderPage();

    const submit = screen.getByRole('button', { name: 'Tạo và tiếp nhận ngay' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText('Số phiếu'), 'RCPT-001');
    await user.type(screen.getByLabelText('Tham chiếu nghiệp vụ'), 'MANUAL:001');
    await user.selectOptions(screen.getByLabelText('Nhà cung cấp'), 'supplier-1');
    await user.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await user.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => expect(repository.createManualReceipt).toHaveBeenCalledTimes(1));
    expect(repository.createManualReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        supplierId: 'supplier-1',
        receiptNumber: 'RCPT-001',
        businessReference: 'MANUAL:001',
        warehouseProfileId: null,
      }),
    );
    expect(await screen.findByText('receipt-destination')).toBeTruthy();
  });
});
