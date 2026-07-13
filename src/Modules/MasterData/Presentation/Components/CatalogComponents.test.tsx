// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import {
  MASTER_DATA_EMPTY_LABELS,
  displayMasterDataStatus,
  displaySkuStatus,
  displayUomType,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import { catalogRoutes } from '@modules/MasterData/Presentation/Routes/CatalogRoutes';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { OwnerPolicyView } from '@modules/MasterData/Presentation/Components/OwnerPolicyView';
import {
  CatalogListView,
  type CatalogColumn,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';
import { OwnerForm } from '@modules/MasterData/Presentation/Forms/OwnerForm';
import { SkuForm } from '@modules/MasterData/Presentation/Forms/SkuForm';
import { UomForm } from '@modules/MasterData/Presentation/Forms/UomForm';

interface Row {
  id: string;
  code: string;
}

const columns: CatalogColumn<Row>[] = [
  { header: 'Mã', render: (row) => row.code },
];

const baseProps = {
  title: 'Chủ hàng',
  description: 'Quản lý chủ hàng',
  columns,
  rows: [] as Row[],
  rowKey: (row: Row) => row.id,
  page: 1,
  totalPages: 1,
  onPageChange: () => undefined,
};

afterEach(() => cleanup());

describe('Catalog components', () => {
  it('renders the loading state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="loading" />);
    expect(html).toContain('Đang tải');
  });

  it('renders the empty state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="empty" />);
    expect(html).toContain('Không tìm thấy bản ghi.');
    expect(html).toContain('role="status"');
  });

  it('renders an entity-specific empty label when supplied', () => {
    const html = renderToStaticMarkup(
      <CatalogListView {...baseProps} state="empty" emptyLabel="Chưa có chủ hàng." />,
    );
    expect(html).toContain('Chưa có chủ hàng.');
    expect(html).not.toContain('Không tìm thấy bản ghi.');
  });

  it('exposes distinct, entity-specific empty copy per page (Owner/UOM/SKU)', () => {
    expect(MASTER_DATA_EMPTY_LABELS.owners).toBe('Chưa có chủ hàng.');
    expect(MASTER_DATA_EMPTY_LABELS.uoms).toBe('Chưa có đơn vị tính.');
    expect(MASTER_DATA_EMPTY_LABELS.skus).toBe('Chưa có SKU.');

    const labels = Object.values(MASTER_DATA_EMPTY_LABELS);
    expect(new Set(labels).size).toBe(labels.length);

    // Each label actually surfaces through the shared list view's empty state.
    for (const label of labels) {
      const html = renderToStaticMarkup(
        <CatalogListView {...baseProps} state="empty" emptyLabel={label} />,
      );
      expect(html).toContain(label);
      expect(html).not.toContain('Không tìm thấy bản ghi.');
    }
  });

  it('renders the error state with the supplied message', () => {
    const html = renderToStaticMarkup(
      <CatalogListView {...baseProps} state="error" errorMessage="Backend unavailable" />,
    );
    expect(html).toContain('Backend unavailable');
    expect(html).toContain('role="alert"');
  });

  it('renders the permission-denied state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="denied" />);
    expect(html).toContain('Không có quyền');
    expect(html).toContain('role="alert"');
  });

  it('renders rows and the entity title in the ready state', () => {
    const html = renderToStaticMarkup(
      <CatalogListView
        {...baseProps}
        state="ready"
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
      />,
    );
    expect(html).toContain('Chủ hàng');
    expect(html).toContain('OWN-01');
  });

  it('clamps pagination display when current page exceeds available pages', () => {
    const html = renderToStaticMarkup(
      <CatalogListView
        {...baseProps}
        state="ready"
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
        page={5}
        totalPages={1}
      />,
    );

    expect(html).toContain('Trang 1 / 1');
    expect(html).not.toContain('Trang 5 / 1');
  });

  it('requests page correction when current page exceeds available pages', async () => {
    const onPageChange = vi.fn();

    render(
      <CatalogListView
        {...baseProps}
        state="ready"
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
        page={5}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    await waitFor(() => expect(onPageChange).toHaveBeenCalledWith(1));
  });

  it('renders a shared list shell with Vietnamese aria labels and mobile row cards', () => {
    const html = renderToStaticMarkup(
      <CatalogListView
        {...baseProps}
        state="ready"
        toolbar={<input aria-label="Mã chủ hàng" />}
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
      />,
    );

    expect(html).toContain('aria-label="Bộ lọc Chủ hàng"');
    expect(html).toContain('aria-label="Danh sách Chủ hàng"');
    expect(html).toContain('data-catalog-mobile-list="true"');
    expect(html).toContain('data-catalog-mobile-row="true"');
    expect(html).toContain('Mã');
    expect(html).toContain('OWN-01');
  });

  it('renders master data status labels without exposing raw enum copy', () => {
    expect(displayMasterDataStatus('Active')).toBe('Đang hoạt động');
    expect(displayMasterDataStatus('Inactive')).toBe('Không hoạt động');
    expect(displayMasterDataStatus('Blocked')).toBe('Tạm khóa');
    expect(displayMasterDataStatus('Maintenance')).toBe('Bảo trì');
    expect(displayMasterDataStatus('Archived')).toBe('Archived');
    expect(displayMasterDataStatus(' Active ')).toBe('Đang hoạt động');
    expect(displayMasterDataStatus('   ')).toBe('-');
    expect(displayMasterDataStatus(undefined)).toBe('-');

    const activeHtml = renderToStaticMarkup(<MasterDataStatusBadge status="Active" />);
    const inactiveHtml = renderToStaticMarkup(<MasterDataStatusBadge status="Inactive" />);
    const unknownHtml = renderToStaticMarkup(<MasterDataStatusBadge status="Archived" />);

    expect(activeHtml).toContain('Đang hoạt động');
    expect(activeHtml).not.toContain('>Active<');
    expect(inactiveHtml).toContain('Không hoạt động');
    expect(inactiveHtml).not.toContain('>Inactive<');
    expect(unknownHtml).toContain('Archived');
  });

  it('renders UOM type labels without exposing raw enum copy in visible text', () => {
    expect(displayUomType('Quantity')).toBe('Số lượng');
    expect(displayUomType('Count')).toBe('Số đếm');
    expect(displayUomType('Weight')).toBe('Khối lượng');
    expect(displayUomType(' Quantity ')).toBe('Số lượng');
    expect(displayUomType('   ')).toBe('-');
    expect(displayUomType(null)).toBe('-');
    expect(displayUomType('Custom')).toBe('Custom');

    const html = renderToStaticMarkup(
      <UomForm
        submitLabel="Cập nhật đơn vị tính"
        initialValue={{
          id: 'uom-1',
          uomCode: 'PALLET',
          uomName: 'Pallet',
          uomType: 'Quantity',
          decimalPrecision: 0,
          status: 'Active',
          sourceSystem: 'seed',
          referenceId: 'PALLET',
          createdAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-19T00:00:00.000Z',
          createdBy: 'admin@example.com',
          updatedBy: null,
        }}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Số lượng');
    expect(html).toContain('value="Số lượng"');
    expect(html).toContain('list="uom-type-options"');
    expect(html).toContain('Nhập hoặc chọn loại đơn vị tính');
    expect(html).not.toContain('>Quantity<');
    expect(html).not.toContain('value="Quantity"');
  });

  it('renders each SKU status pill with Vietnamese display labels', () => {
    expect(displaySkuStatus('Active')).toBe('Đang kinh doanh');
    expect(displaySkuStatus('Draft')).toBe('Nháp');
    expect(displaySkuStatus('Blocked')).toBe('Tạm khóa');
    expect(displaySkuStatus('Discontinued')).toBe('Ngừng kinh doanh');
    expect(displaySkuStatus('Archived')).toBe('Archived');
    expect(displaySkuStatus(' Active ')).toBe('Đang kinh doanh');
    expect(displaySkuStatus('   ')).toBe('-');
    expect(displaySkuStatus(undefined)).toBe('-');

    const activeHtml = renderToStaticMarkup(<SkuStatusBadge status="Active" />);
    const draftHtml = renderToStaticMarkup(<SkuStatusBadge status="Draft" />);
    const blockedHtml = renderToStaticMarkup(<SkuStatusBadge status="Blocked" />);
    const discontinuedHtml = renderToStaticMarkup(<SkuStatusBadge status="Discontinued" />);
    const unknownHtml = renderToStaticMarkup(<SkuStatusBadge status="Archived" />);

    expect(activeHtml).toContain('data-slot="badge"');
    expect(activeHtml).toContain('Đang kinh doanh');
    expect(activeHtml).not.toContain('>Active<');
    expect(draftHtml).toContain('Nháp');
    expect(draftHtml).not.toContain('>Draft<');
    expect(blockedHtml).toContain('Tạm khóa');
    expect(blockedHtml).not.toContain('>Blocked<');
    expect(discontinuedHtml).toContain('Ngừng kinh doanh');
    expect(discontinuedHtml).not.toContain('>Discontinued<');
    expect(unknownHtml).toContain('Archived');
  });

  it('hiển thị cảnh báo trùng mã trong form chủ hàng', () => {
    const html = renderToStaticMarkup(
      <OwnerForm submitLabel="Tạo chủ hàng" conflict="Mã chủ hàng đã tồn tại" onSubmit={() => undefined} />,
    );
    expect(html).toContain('Mã chủ hàng đã tồn tại');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('role="alert"');
  });

  it('hiển thị cảnh báo trùng mã trong form SKU', () => {
    const html = renderToStaticMarkup(
      <SkuForm
        submitLabel="Tạo SKU"
        owners={[]}
        uoms={[]}
        conflict="Mã SKU đã tồn tại"
        onSubmit={() => undefined}
      />,
    );
    expect(html).toContain('Mã SKU đã tồn tại');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Nháp');
    expect(html).not.toContain('>Draft<');
  });

  it('shows SKU missing setup guidance for absent active Owner/UOM lookups', () => {
    const html = renderToStaticMarkup(
      <SkuForm
        submitLabel="Tạo SKU"
        owners={[]}
        uoms={[]}
        missingSetupMessages={[
          'Chưa có Đơn vị tính đang hoạt động để chọn đơn vị cơ sở/tồn kho.',
          'Chưa có Chủ hàng đang hoạt động để chọn chủ hàng mặc định.',
        ]}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Thiếu cấu hình SKU');
    expect(html).toContain('Chưa có Đơn vị tính đang hoạt động');
    expect(html).toContain('Chưa có Chủ hàng đang hoạt động');
    expect(html).toContain('role="status"');
  });

  it('hiển thị cảnh báo chỉ đọc khi tạo mới không được phép', () => {
    const html = renderToStaticMarkup(
      <CatalogListView
        {...baseProps}
        state="ready"
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
        canCreate={false}
      />,
    );

    expect(html).toContain('Chỉ đọc');
    expect(html).toContain('Bạn chỉ có quyền xem dữ liệu trong phạm vi này.');
    expect(html).toContain('role="status"');
  });

  it('renders audit metadata with values and dashes for nulls', () => {
    const html = renderToStaticMarkup(
      <AuditMetadata
        createdAt="2026-06-18T00:00:00.000Z"
        updatedAt="2026-06-19T00:00:00.000Z"
        createdBy="alice"
        updatedBy={null}
      />,
    );
    expect(html).toContain('2026-06-18T00:00:00.000Z');
    expect(html).toContain('2026-06-19T00:00:00.000Z');
    expect(html).toContain('alice');
    expect(html).toContain('-');
  });

  it('renders BillingPolicy and VisibilityScope as read-only JSON when present', () => {
    const html = renderToStaticMarkup(
      <OwnerPolicyView
        billingPolicy={{ model: 'monthly', rate: 12 }}
        visibilityScope={{ warehouses: ['wh-1', 'wh-2'] }}
      />,
    );
    expect(html).toContain('Chính sách tính phí');
    expect(html).toContain('Phạm vi hiển thị');
    // The actual JSON contents must be rendered, not just the labels.
    expect(html).toContain('monthly');
    expect(html).toContain('&quot;rate&quot;: 12');
    expect(html).toContain('wh-2');
    // It is a read-only display: no input/textarea controls.
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
  });

  it('shows a placeholder when an owner has no policy / scope data', () => {
    const html = renderToStaticMarkup(
      <OwnerPolicyView billingPolicy={undefined} visibilityScope={null} />,
    );
    expect(html).toContain('Chính sách tính phí');
    expect(html).toContain('Phạm vi hiển thị');
    expect(html).toContain('Chưa thiết lập');
  });

  it('registers the catalog routes and route constants', () => {
    expect(ROUTES.FOUNDATION.MASTER_DATA.OWNERS).toBe('/foundation/master-data/owners');
    expect(ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW).toBe('/foundation/master-data/owners/new');
    expect(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL('owner-1')).toBe(
      '/foundation/master-data/owners/owner-1',
    );
    expect(ROUTES.FOUNDATION.MASTER_DATA.OWNER_EDIT('owner-1')).toBe(
      '/foundation/master-data/owners/owner-1/edit',
    );
    expect(ROUTES.FOUNDATION.MASTER_DATA.UOMS).toBe('/foundation/master-data/uoms');
    expect(ROUTES.FOUNDATION.MASTER_DATA.SKUS).toBe('/foundation/master-data/skus');
    expect(ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW).toBe('/foundation/master-data/skus/new');
    expect(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL('sku-1')).toBe(
      '/foundation/master-data/skus/sku-1',
    );
    expect(ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT('sku-1')).toBe(
      '/foundation/master-data/skus/sku-1/edit',
    );
    expect(catalogRoutes.map((route) => route.path)).toEqual([
      ROUTES.FOUNDATION.MASTER_DATA.OWNERS,
      ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW,
      ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(),
      ROUTES.FOUNDATION.MASTER_DATA.OWNER_EDIT(),
      ROUTES.FOUNDATION.MASTER_DATA.UOMS,
      ROUTES.FOUNDATION.MASTER_DATA.SKUS,
      ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW,
      ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(),
      ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT(),
    ]);
  });
});
