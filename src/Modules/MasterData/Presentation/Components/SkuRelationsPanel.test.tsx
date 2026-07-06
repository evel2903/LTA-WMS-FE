import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const auditFields = {
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-07-06T00:00:00.000Z',
  updatedAt: '2026-07-06T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

const relationState = vi.hoisted(() => ({
  current: {
    packs: {
      data: {
        items: [
          {
            id: 'pack-1',
            skuId: 'sku-1',
            packCode: 'BOX',
            packName: 'Box',
            uomId: 'uom-1',
            quantityPerPack: 12,
            isDefault: true,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-07-06T00:00:00.000Z',
            updatedAt: '2026-07-06T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    },
    barcodes: {
      data: {
        items: [
          {
            id: 'barcode-1',
            skuId: 'sku-1',
            ownerId: null,
            uomId: 'uom-1',
            packCode: 'BOX',
            barcodeValue: '8930000000012',
            barcodeType: 'EAN13',
            isPrimary: true,
            effectiveFrom: '2026-07-01T00:00:00.000Z',
            effectiveTo: null,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-07-06T00:00:00.000Z',
            updatedAt: '2026-07-06T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    },
    conversions: {
      data: {
        items: [
          {
            id: 'conversion-1',
            skuId: 'sku-1',
            fromUomId: 'uom-1',
            toUomId: 'uom-2',
            factor: 12,
            effectiveFrom: '2026-07-01T00:00:00.000Z',
            effectiveTo: null,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-07-06T00:00:00.000Z',
            updatedAt: '2026-07-06T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    },
    coverages: {
      data: {
        items: [
          {
            id: 'coverage-1',
            skuId: 'sku-1',
            warehouseId: 'wh-1',
            ownerId: null,
            minQty: 1,
            maxQty: 100,
            standardQty: 12,
            multipleQty: 6,
            leadTimeDays: 2,
            defaultReceiveWarehouseId: null,
            defaultShipWarehouseId: null,
            reorderPolicy: {},
            stopReceiving: true,
            stopShipping: false,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-07-06T00:00:00.000Z',
            updatedAt: '2026-07-06T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    },
  },
}));

vi.mock('@modules/MasterData/Application/Queries/CatalogQueries', () => ({
  useSkuRelations: () => relationState.current,
}));

vi.mock('@modules/MasterData/Application/Commands/UseCatalogMutations', () => {
  const mutation = { isPending: false, mutate: vi.fn() };

  return {
    useCatalogMutations: () => ({
      createPackDefinition: mutation,
      updatePackDefinition: mutation,
      createSkuBarcode: mutation,
      updateSkuBarcode: mutation,
      createUomConversion: mutation,
      updateUomConversion: mutation,
      createItemCoverage: mutation,
      updateItemCoverage: mutation,
    }),
  };
});

vi.mock('@modules/ReasonCode/Presentation/Components/ReasonCodeSelect', () => ({
  ReasonCodeSelect: ({ id, label }: { id: string; label: string }) => (
    <label htmlFor={id}>
      {label}
      <select id={id} />
    </label>
  ),
}));

import { SkuRelationsPanel } from '@modules/MasterData/Presentation/Components/SkuRelationsPanel';

describe('SkuRelationsPanel', () => {
  it('renders relation rows as mobile cards with Vietnamese UOM and status labels', () => {
    const html = renderToStaticMarkup(
      <SkuRelationsPanel
        skuId="sku-1"
        canEdit
        uoms={[
          {
            id: 'uom-1',
            uomCode: 'EA',
            uomName: 'Each',
            uomType: null,
            decimalPrecision: 0,
            status: 'Active',
            ...auditFields,
          },
          {
            id: 'uom-2',
            uomCode: 'BOX',
            uomName: 'Box',
            uomType: null,
            decimalPrecision: 0,
            status: 'Active',
            ...auditFields,
          },
        ]}
        warehouses={[
          {
            id: 'wh-1',
            siteId: 'site-1',
            warehouseCode: 'WH-01',
            warehouseName: 'Warehouse 01',
            warehouseTypeCode: 'MAIN',
            status: 'Active',
            timezone: 'Asia/Bangkok',
            ...auditFields,
          },
        ]}
      />,
    );

    expect(html).toContain('data-sku-relation-mobile-list="true"');
    expect(html).toContain('data-sku-relation-mobile-row="true"');
    expect(html).toContain('Đơn vị tính');
    expect(html).toContain('Chọn Đơn vị tính');
    expect(html).toContain('Mã vạch');
    expect(html).toContain('Quy đổi đơn vị tính');
    expect(html).toContain('Phạm vi hàng hóa');
    expect(html).toContain('8930000000012');
    expect(html).toContain('EA - Each');
    expect(html).toContain('BOX - Box');
    expect(html).toContain('WH-01 - Warehouse 01');
    expect(html).toContain('Nhận hàng');
    expect(html).toContain('Thêm mã vạch');
    expect(html).toContain('Thêm quy đổi');
    expect(html).toContain('Thêm phạm vi');
    expect(html).toContain('aria-label="Chỉnh sửa Mã vạch"');
    expect(html).toContain('aria-label="Chỉnh sửa Quy đổi đơn vị tính"');
    expect(html).toContain('aria-label="Chỉnh sửa Phạm vi hàng hóa"');
    expect(html).toContain('Đang hoạt động');
    expect(html).not.toContain('>UOM<');
    expect(html).not.toContain('>Active<');
  });
});
