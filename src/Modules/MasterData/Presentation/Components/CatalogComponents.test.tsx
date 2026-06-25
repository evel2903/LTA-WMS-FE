import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { MASTER_DATA_EMPTY_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import { catalogRoutes } from '@modules/MasterData/Presentation/Routes/CatalogRoutes';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { OwnerPolicyView } from '@modules/MasterData/Presentation/Components/OwnerPolicyView';
import {
  CatalogListView,
  type CatalogColumn,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';
import { skuStatusVariant } from '@modules/MasterData/Presentation/Components/SkuStatusVariant';
import { OwnerForm } from '@modules/MasterData/Presentation/Forms/OwnerForm';
import { SkuForm } from '@modules/MasterData/Presentation/Forms/SkuForm';

interface Row {
  id: string;
  code: string;
}

const columns: CatalogColumn<Row>[] = [
  { header: 'Code', render: (row) => row.code },
];

const baseProps = {
  title: 'Chủ hàng',
  description: 'Manage owners',
  columns,
  rows: [] as Row[],
  rowKey: (row: Row) => row.id,
  page: 1,
  totalPages: 1,
  onPageChange: () => undefined,
};

describe('Catalog components', () => {
  it('renders the loading state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="loading" />);
    expect(html).toContain('Đang tải');
  });

  it('renders the empty state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="empty" />);
    expect(html).toContain('Không tìm thấy bản ghi.');
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
  });

  it('renders the permission-denied state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="denied" />);
    expect(html).toContain('Không có quyền');
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

  it('renders each SKU status variant', () => {
    expect(skuStatusVariant('Active')).toBe('success');
    expect(skuStatusVariant('Draft')).toBe('outline');
    expect(skuStatusVariant('Blocked')).toBe('warning');
    expect(skuStatusVariant('Discontinued')).toBe('secondary');

    expect(renderToStaticMarkup(<SkuStatusBadge status="Active" />)).toContain('Active');
    expect(renderToStaticMarkup(<SkuStatusBadge status="Draft" />)).toContain('Draft');
    expect(renderToStaticMarkup(<SkuStatusBadge status="Blocked" />)).toContain('Blocked');
    expect(renderToStaticMarkup(<SkuStatusBadge status="Discontinued" />)).toContain('Discontinued');
  });

  it('renders an inline conflict message in the owner form', () => {
    const html = renderToStaticMarkup(
      <OwnerForm submitLabel="Create Owner" conflict="Owner code already exists" onSubmit={() => undefined} />,
    );
    expect(html).toContain('Owner code already exists');
  });

  it('renders an inline conflict message in the sku form', () => {
    const html = renderToStaticMarkup(
      <SkuForm
        submitLabel="Create SKU"
        owners={[]}
        uoms={[]}
        conflict="SKU code already exists"
        onSubmit={() => undefined}
      />,
    );
    expect(html).toContain('SKU code already exists');
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
    expect(ROUTES.FOUNDATION.MASTER_DATA.UOM_NEW).toBe('/foundation/master-data/uoms/new');
    expect(ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL('uom-1')).toBe(
      '/foundation/master-data/uoms/uom-1',
    );
    expect(ROUTES.FOUNDATION.MASTER_DATA.UOM_EDIT('uom-1')).toBe(
      '/foundation/master-data/uoms/uom-1/edit',
    );
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
      ROUTES.FOUNDATION.MASTER_DATA.UOM_NEW,
      ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL(),
      ROUTES.FOUNDATION.MASTER_DATA.UOM_EDIT(),
      ROUTES.FOUNDATION.MASTER_DATA.SKUS,
      ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW,
      ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(),
      ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT(),
    ]);
  });
});
