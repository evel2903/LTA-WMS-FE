// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InboundPlan } from '@modules/Inbound/Domain/Types/InboundPlan';
import type { InboundPlanFormLookups } from '@modules/Inbound/Presentation/Components/UseInboundPlanFormLookups';

const lookup = <T,>(items: T[]) => ({ data: { items }, isLoading: false, isError: false });

vi.mock('@modules/Inbound/Presentation/Components/UseInboundPlanFormLookups', () => ({
  useInboundPlanFormLookups: (): InboundPlanFormLookups =>
    ({
      supplierQuery: lookup([]),
      supplierOptions: [{ value: 'supplier-1', label: 'SUP - Supplier 1' }],
      ownerQuery: lookup([]),
      ownerOptions: [{ value: 'owner-1', label: 'OWN - Owner 1' }],
      warehouseQuery: lookup([]),
      warehouseOptions: [{ value: 'warehouse-1', label: 'WH - Warehouse 1' }],
      warehouseSearch: '',
      setWarehouseSearch: vi.fn(),
      debouncedWarehouseSearch: '',
      warehouseProfileQuery: lookup([]),
      warehouseProfileOptions: [],
      skuQuery: lookup([]),
      skuOptions: [{ value: 'sku-1', label: 'SKU-1 - Sku 1' }],
      uomQuery: lookup([]),
      uomOptions: [{ value: 'uom-1', label: 'EA - Each' }],
    }) as unknown as InboundPlanFormLookups,
}));

import { InboundEditPanel } from '@modules/Inbound/Presentation/Components/InboundEditPanel';

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

describe('InboundEditPanel', () => {
  it('echoes back the plan.updatedAt it was seeded from as expectedUpdatedAt on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const plan = buildPlan({ updatedAt: '2026-07-16T05:04:34.436Z' });

    render(<InboundEditPanel plan={plan} isPending={false} errorMessage={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ expectedUpdatedAt: '2026-07-16T05:04:34.436Z' });
  });
});
