// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type { InboundPlanFormLookups } from '@modules/InboundPlan/Presentation/Components/UseInboundPlanFormLookups';

const lookup = <T,>(items: T[]) => ({ data: { items }, isLoading: false, isError: false });

vi.mock('@modules/InboundPlan/Presentation/Components/UseInboundPlanFormLookups', () => ({
  useInboundPlanFormLookups: (): InboundPlanFormLookups =>
    ({
      supplierQuery: lookup([]),
      supplierOptions: [
        { value: 'supplier-1', label: 'SUP - Supplier 1' },
        { value: 'supplier-2', label: 'SUP2 - Supplier 2' },
      ],
      ownerQuery: lookup([]),
      ownerOptions: [
        { value: 'owner-1', label: 'OWN - Owner 1' },
        { value: 'owner-2', label: 'OWN2 - Owner 2' },
      ],
      warehouseQuery: lookup([]),
      warehouseOptions: [
        { value: 'warehouse-1', label: 'WH - Warehouse 1' },
        { value: 'warehouse-2', label: 'WH2 - Warehouse 2' },
      ],
      warehouseSearch: '',
      setWarehouseSearch: vi.fn(),
      debouncedWarehouseSearch: '',
      warehouseProfileQuery: lookup([]),
      warehouseProfileOptions: [],
      skuQuery: lookup([]),
      skuOptions: [
        {
          value: 'sku-1',
          label: 'SKU-SER-1783928953781 - Serial Only Test 1783928953781',
        },
        { value: 'sku-2', label: 'SKU-2 - Sku 2' },
      ],
      uomQuery: lookup([]),
      uomOptions: [
        { value: 'uom-1', label: 'EA - Each' },
        { value: 'uom-2', label: 'BOX - Box' },
      ],
    }) as unknown as InboundPlanFormLookups,
}));

import { InboundPlanEditPanel } from '@modules/InboundPlan/Presentation/Components/InboundPlanEditPanel';

function buildPlan(overrides: Partial<InboundPlan> = {}): InboundPlan {
  return {
    id: 'plan-1',
    sourceSystem: 'ERP',
    sourceDocumentType: 'ASN',
    sourceDocumentNumber: 'ASN-10001',
    businessReference: 'ERP:ASN:ASN-10001',
    supplierId: 'supplier-1',
    supplierCode: 'SUP',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH',
    warehouseProfileId: null,
    expectedArrivalAt: null,
    status: 'Draft',
    gateInStatus: 'NotRecorded',
    gateInAt: null,
    gateReference: null,
    vehicleNumber: null,
    driverName: null,
    evidenceRefs: [],
    coreFlowInstanceId: null,
    isDuplicate: false,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-1',
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

afterEach(() => {
  cleanup();
});

describe('InboundPlanEditPanel', () => {
  async function selectOption(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
    await user.click(screen.getByRole('combobox', { name: label }));
    await user.click(screen.getByRole('option', { name: option }));
  }

  it('uses ComboboxSelect for all shared lookup fields and submits newly selected IDs', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const plan = buildPlan();

    render(<InboundPlanEditPanel plan={plan} isPending={false} errorMessage={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getAllByRole('combobox')).toHaveLength(6);
    expect(document.querySelectorAll('select')).toHaveLength(0);
    expect(screen.getByRole('combobox', { name: 'Nhà cung cấp' }).textContent).toContain('SUP - Supplier 1');
    expect(screen.getByRole('combobox', { name: 'Chủ hàng' }).textContent).toContain('OWN - Owner 1');
    expect(screen.getByRole('combobox', { name: 'Kho' }).textContent).toContain('WH - Warehouse 1');
    const skuCombobox = screen.getByRole('combobox', { name: 'SKU' });
    expect(skuCombobox.textContent).toContain('SKU-SER-1783928953781 - Serial Only Test 1783928953781');
    expect(skuCombobox.className).toContain('overflow-hidden');
    expect(skuCombobox.parentElement?.className).toContain('min-w-0');
    expect(skuCombobox.querySelector('span')?.className).toContain('truncate');
    expect(skuCombobox.getAttribute('title')).toBe('SKU-SER-1783928953781 - Serial Only Test 1783928953781');
    expect(screen.getByRole('combobox', { name: 'Đơn vị tính' }).textContent).toContain('EA - Each');

    await selectOption(user, 'Nhà cung cấp', 'SUP2 - Supplier 2');
    await selectOption(user, 'Chủ hàng', 'OWN2 - Owner 2');
    await selectOption(user, 'Kho', 'WH2 - Warehouse 2');
    await selectOption(user, 'SKU', 'SKU-2 - Sku 2');
    await selectOption(user, 'Đơn vị tính', 'BOX - Box');

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 'supplier-2',
        ownerId: 'owner-2',
        warehouseId: 'warehouse-2',
        warehouseProfileId: null,
        lines: [expect.objectContaining({ skuId: 'sku-2', uomId: 'uom-2' })],
      }),
    );
  });

  it('echoes back the plan.updatedAt it was seeded from as expectedUpdatedAt on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const plan = buildPlan({ updatedAt: '2026-07-16T05:04:34.436Z' });

    render(<InboundPlanEditPanel plan={plan} isPending={false} errorMessage={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ expectedUpdatedAt: '2026-07-16T05:04:34.436Z' });
  });
});
