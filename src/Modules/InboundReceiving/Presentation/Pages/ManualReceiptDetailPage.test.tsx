// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { ReceiptOperationalState } from '@modules/InboundReceiving/Domain/Types/Receipt';

const repository = vi.hoisted(() => ({
  getReceiptOperationalState: vi.fn(),
  createManualReceipt: vi.fn(),
  validateReadiness: vi.fn(),
  startReceivingSession: vi.fn(),
  confirmReceiptLine: vi.fn(),
  confirmInboundLpn: vi.fn(),
  releaseInboundToPutaway: vi.fn(),
  captureDiscrepancy: vi.fn(),
  evaluateQcTask: vi.fn(),
  recordQcResult: vi.fn(),
}));
const putawayRepository = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 1, totalItems: 0, totalPages: 0 }),
  release: vi.fn(),
  getById: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock(
  '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance',
  () => ({
    inboundReceivingRepository: repository,
  }),
);
vi.mock('@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance', () => ({
  putawayRepository,
}));

vi.mock('@modules/InboundReceiving/Presentation/Components/UseManualReceiptLookups', () => ({
  useManualReceiptLookups: () => ({
    skuOptions: [{ value: 'sku-1', label: 'SKU-A - Sản phẩm A' }],
    skuQuery: { isLoading: false, isError: false },
    skuSearch: '',
    setSkuSearch: vi.fn(),
    uomOptions: [{ value: 'uom-1', label: 'EA - Cái' }],
    uomQuery: { isLoading: false, isError: false },
    uomSearch: '',
    setUomSearch: vi.fn(),
  }),
}));

vi.mock('@modules/PartnerMaster/Application/Queries/UsePartners', () => ({
  usePartner: () => ({
    data: { partnerCode: 'SUP-1', partnerName: 'Nhà cung cấp 1' },
    isLoading: false,
  }),
}));

vi.mock('@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles', () => ({
  useWarehouseProfile: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [
      { value: 'RC-V1-MANUAL-SCAN', label: 'RC-V1-MANUAL-SCAN — Xác nhận thủ công' },
      { value: 'RC-V1-DISCREPANCY', label: 'RC-V1-DISCREPANCY — Sai lệch nhập kho' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { ManualReceiptDetailPage } from '@modules/InboundReceiving/Presentation/Pages/ManualReceiptDetailPage';

async function selectCombobox(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  optionName: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(screen.getByRole('option', { name: optionName }));
}

const operationalState: ReceiptOperationalState = {
  receiptId: 'receipt-manual-1',
  inboundPlanId: null,
  receipt: {
    id: 'receipt-manual-1',
    inboundPlanId: null,
    receiptNumber: 'RCPT-MANUAL-001',
    businessReference: 'MANUAL:DOCK:001',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    warehouseProfileId: null,
    supplierId: 'supplier-1',
    supplierCode: 'SUP-1',
    supplierName: 'Nhà cung cấp 1',
    status: 'Open',
    coreFlowInstanceId: null,
    createdAt: '2026-07-18T08:00:00.000Z',
    updatedAt: '2026-07-18T08:00:00.000Z',
    createdBy: 'user-1',
    updatedBy: null,
  },
  receivingSessions: [
    {
      id: 'session-1',
      inboundPlanId: null,
      receiptId: 'receipt-manual-1',
      receiptNumber: 'RCPT-MANUAL-001',
      sessionKey: 'dock-1',
      deviceCode: null,
      ownerId: 'owner-1',
      ownerCode: 'OWN-A',
      warehouseId: 'warehouse-1',
      warehouseCode: 'WT-01',
      status: 'Open',
      startedAt: '2026-07-18T08:00:00.000Z',
      closedAt: null,
      isDuplicate: false,
      createdAt: '2026-07-18T08:00:00.000Z',
      updatedAt: '2026-07-18T08:00:00.000Z',
      startedBy: 'user-1',
      updatedBy: null,
    },
  ],
  receiptLines: [
    {
      id: 'receipt-line-1',
      receiptId: 'receipt-manual-1',
      inboundPlanId: null,
      inboundPlanLineId: null,
      lineNumber: 1,
      skuId: 'sku-1',
      skuCode: 'SKU-A',
      uomId: 'uom-1',
      uomCode: 'EA',
      expectedQuantity: null,
      actualQuantity: 5,
      status: 'Received',
      manualConfirm: true,
      reasonCode: null,
      reasonCodeId: null,
      reasonNote: null,
      scanEvidenceJson: null,
      discrepancySignals: [],
      lotNumber: null,
      expiryDate: null,
      serialNumber: null,
      idempotencyKey: 'line-1',
      receivedAt: '2026-07-18T08:05:00.000Z',
      receivedBy: 'user-1',
      isDuplicate: false,
      createdAt: '2026-07-18T08:05:00.000Z',
      updatedAt: '2026-07-18T08:05:00.000Z',
    },
  ],
  qcTasks: [],
  qcResults: [],
  lpns: [],
  releases: [],
  discrepancies: [],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/inbound-receiving/receipts/receipt-manual-1']}>
        <Routes>
          <Route
            path="/inbound-receiving/receipts/:receiptId"
            element={<ManualReceiptDetailPage />}
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

describe('ManualReceiptDetailPage', () => {
  it('shows the manual readiness rule, disables quantity variance without expected quantity and confirms a new line without a plan', async () => {
    repository.getReceiptOperationalState.mockResolvedValue(operationalState);
    repository.confirmReceiptLine.mockResolvedValue({
      ...operationalState.receiptLines[0],
      id: 'receipt-line-2',
      lineNumber: 2,
      actualQuantity: 3,
      idempotencyKey: 'line-2',
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' })).toBeTruthy();
    expect(
      screen.getByText(
        'Sẵn sàng tiếp nhận: Không áp dụng kiểm tra gate-in/kế hoạch đối với phiếu thủ công.',
      ),
    ).toBeTruthy();
    const varianceOption = screen.getByRole('option', { name: 'Chênh lệch số lượng' });
    expect(varianceOption).toHaveProperty('disabled', true);

    await selectCombobox(user, 'SKU', 'SKU-A - Sản phẩm A');
    await selectCombobox(user, 'Đơn vị tính', 'EA - Cái');
    await user.type(screen.getByLabelText('Số lượng thực nhận'), '3');
    await user.type(screen.getByLabelText('Dữ liệu quét thô (không bắt buộc)'), 'scan-manual-1');
    await user.click(screen.getByRole('button', { name: 'Xác nhận dòng thực nhận' }));

    await waitFor(() => expect(repository.confirmReceiptLine).toHaveBeenCalledTimes(1));
    expect(repository.confirmReceiptLine).toHaveBeenCalledWith(
      'receipt-manual-1',
      expect.objectContaining({
        inboundPlanLineId: null,
        skuId: 'sku-1',
        uomId: 'uom-1',
        actualQuantity: 3,
        expectedQuantity: null,
        manualConfirm: false,
      }),
    );
    const call = repository.confirmReceiptLine.mock.calls[0] as unknown as [
      string,
      { scanEvidence?: { rawValue?: string } },
    ];
    expect(call[1].scanEvidence?.rawValue).toBe('scan-manual-1');
  });

  it('uses configured receipt reason codes for manual confirmation and discrepancy capture', async () => {
    repository.getReceiptOperationalState.mockResolvedValue(operationalState);
    repository.captureDiscrepancy.mockResolvedValue({
      id: 'discrepancy-1',
      receiptId: 'receipt-manual-1',
      receiptLineId: 'receipt-line-1',
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    await user.click(screen.getByLabelText('Xác nhận thủ công (cần mã lý do Override)'));
    expect(screen.getByRole('combobox', { name: 'Mã lý do xác nhận thủ công' })).toBeTruthy();

    const discrepancyReason = document.getElementById('manual-discrepancy-reason');
    if (!discrepancyReason) throw new Error('discrepancy reason selector is missing');
    await user.click(discrepancyReason);
    await user.click(screen.getByRole('option', { name: /RC-V1-DISCREPANCY/ }));
    const discrepancyEvidence = document.getElementById('manual-discrepancy-evidence');
    if (!discrepancyEvidence) throw new Error('discrepancy evidence input is missing');
    await user.type(discrepancyEvidence, 'evidence://manual/discrepancy-1');
    await user.click(screen.getByRole('button', { name: 'Ghi nhận sai lệch' }));

    await waitFor(() => expect(repository.captureDiscrepancy).toHaveBeenCalledTimes(1));
    expect(repository.captureDiscrepancy).toHaveBeenCalledWith(
      'receipt-manual-1',
      expect.objectContaining({
        reasonCode: 'RC-V1-DISCREPANCY',
        evidenceRefs: ['evidence://manual/discrepancy-1'],
      }),
    );
  });

  it('keeps a planned receipt read-only on the canonical receipt route', async () => {
    repository.getReceiptOperationalState.mockResolvedValue({
      ...operationalState,
      inboundPlanId: 'plan-1',
      receipt: { ...operationalState.receipt, inboundPlanId: 'plan-1' },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mở console kế hoạch' }).getAttribute('href')).toBe(
      '/inbound-receiving/plan-1',
    );
    expect(screen.queryByRole('button', { name: 'Đánh giá yêu cầu QC' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xác nhận LPN' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi nhận sai lệch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bàn giao cất hàng' })).toBeNull();
    expect(
      screen.getByText(
        'Phiếu có kế hoạch chỉ được xem tại đây; mọi thao tác tiếp nhận thực hiện trong console kế hoạch.',
      ),
    ).toBeTruthy();
  });

  it('does not erase QC/LPN draft quantities when discrepancy type changes', async () => {
    repository.getReceiptOperationalState.mockResolvedValue({
      ...operationalState,
      qcTasks: [
        {
          id: 'qc-task-1',
          receiptLineId: 'receipt-line-1',
          required: true,
          createdAt: '2026-07-18T08:06:00.000Z',
        },
      ],
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    const inspected = screen.getByLabelText('Đã kiểm');
    await user.clear(inspected);
    await user.type(inspected, '9');
    const lpnQuantity = screen.getByLabelText('Số lượng');
    await user.clear(lpnQuantity);
    await user.type(lpnQuantity, '7');
    await user.selectOptions(screen.getByLabelText('Loại sai lệch'), 'WrongSku');

    expect(Reflect.get(inspected, 'value')).toBe('9');
    expect(Reflect.get(lpnQuantity, 'value')).toBe('7');
  });

  it('evaluates a QC task for the selected manual receipt line', async () => {
    repository.getReceiptOperationalState.mockResolvedValue(operationalState);
    repository.evaluateQcTask.mockResolvedValue({
      id: 'qc-task-2',
      receiptLineId: 'receipt-line-1',
      required: false,
      createdAt: '2026-07-18T08:07:00.000Z',
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    await user.click(screen.getByRole('button', { name: 'Đánh giá yêu cầu QC' }));

    await waitFor(() => expect(repository.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(repository.evaluateQcTask).toHaveBeenCalledWith(
      'receipt-manual-1',
      expect.objectContaining({
        receiptLineId: 'receipt-line-1',
        forceRequired: false,
      }),
    );
    const evaluateCall = repository.evaluateQcTask.mock.calls[0] as unknown as [
      string,
      { idempotencyKey: string },
    ];
    expect(evaluateCall[1].idempotencyKey).toMatch(/^manual-qc-task-/);
  });

  it('records a balanced QC result for a required manual receipt QC task', async () => {
    repository.getReceiptOperationalState.mockResolvedValue({
      ...operationalState,
      qcTasks: [
        {
          id: 'qc-task-1',
          receiptLineId: 'receipt-line-1',
          required: true,
          createdAt: '2026-07-18T08:06:00.000Z',
        },
      ],
    });
    repository.recordQcResult.mockResolvedValue({
      id: 'qc-result-1',
      qcTaskId: 'qc-task-1',
      receiptLineId: 'receipt-line-1',
      resultStatus: 'Passed',
      dispositionCode: 'Release',
      inspectedQuantity: 5,
      acceptedQuantity: 5,
      rejectedQuantity: 0,
      recordedAt: '2026-07-18T08:08:00.000Z',
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    const recordButton = await screen.findByRole('button', {
      name: 'Ghi nhận kết quả QC',
    });
    await user.click(recordButton);

    await waitFor(() => expect(repository.recordQcResult).toHaveBeenCalledTimes(1));
    expect(repository.recordQcResult).toHaveBeenCalledWith(
      'qc-task-1',
      expect.objectContaining({
        resultStatus: 'Passed',
        dispositionCode: 'Release',
        inspectedQuantity: 5,
        acceptedQuantity: 5,
        rejectedQuantity: 0,
        reasonCode: null,
        reasonNote: null,
        evidenceRefs: [],
      }),
    );
    const resultCall = repository.recordQcResult.mock.calls[0] as unknown as [
      string,
      { idempotencyKey: string },
    ];
    expect(resultCall[1].idempotencyKey).toMatch(/^manual-qc-result-/);
  });

  it('confirms an LPN for the selected manual receipt line', async () => {
    repository.getReceiptOperationalState.mockResolvedValue(operationalState);
    repository.confirmInboundLpn.mockResolvedValue({
      id: 'lpn-1',
      receiptLineId: 'receipt-line-1',
      lpnCode: 'LPN-MANUAL-001',
      quantity: 5,
      confirmedAt: '2026-07-18T08:09:00.000Z',
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    await user.type(screen.getByLabelText('Mã LPN'), 'LPN-MANUAL-001');
    await user.click(screen.getByRole('button', { name: 'Xác nhận LPN' }));

    await waitFor(() => expect(repository.confirmInboundLpn).toHaveBeenCalledTimes(1));
    expect(repository.confirmInboundLpn).toHaveBeenCalledWith(
      'receipt-manual-1',
      'receipt-line-1',
      expect.objectContaining({
        lpnCode: 'LPN-MANUAL-001',
        ssccCode: null,
        quantity: 5,
        reasonCode: null,
        reasonNote: null,
        evidenceRefs: [],
      }),
    );
    const lpnCall = repository.confirmInboundLpn.mock.calls[0] as unknown as [
      string,
      string,
      { idempotencyKey: string },
    ];
    expect(lpnCall[2].idempotencyKey).toMatch(/^manual-lpn-/);
  });

  it('releases the selected manual receipt line to putaway', async () => {
    repository.getReceiptOperationalState.mockResolvedValue(operationalState);
    repository.releaseInboundToPutaway.mockResolvedValue({
      id: 'release-1',
      receiptLineId: 'receipt-line-1',
      currentLocationCode: 'RECEIVING',
      releasedAt: '2026-07-18T08:10:00.000Z',
    });
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole('heading', { name: 'RCPT-MANUAL-001' });
    await user.click(screen.getByRole('button', { name: 'Bàn giao cất hàng' }));

    await waitFor(() => expect(repository.releaseInboundToPutaway).toHaveBeenCalledTimes(1));
    expect(repository.releaseInboundToPutaway).toHaveBeenCalledWith(
      'receipt-manual-1',
      'receipt-line-1',
      expect.objectContaining({
        currentLocationCode: 'RECEIVING',
        requireLpn: false,
      }),
    );
    const releaseCall = repository.releaseInboundToPutaway.mock.calls[0] as unknown as [
      string,
      string,
      { idempotencyKey: string },
    ];
    expect(releaseCall[2].idempotencyKey).toMatch(/^manual-release-/);
    await waitFor(() =>
      expect(putawayRepository.release).toHaveBeenCalledWith(
        expect.objectContaining({
          inboundPutawayReleaseId: 'release-1',
          idempotencyKey: 'putaway-release-release-1',
        }),
      ),
    );
  });
});
