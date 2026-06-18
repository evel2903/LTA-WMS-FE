import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { catalogRoutes } from '@modules/MasterData/Presentation/Routes/CatalogRoutes';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
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
  title: 'Owners',
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
    expect(html).toContain('Loading');
  });

  it('renders the empty state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="empty" />);
    expect(html).toContain('No records');
  });

  it('renders the error state with the supplied message', () => {
    const html = renderToStaticMarkup(
      <CatalogListView {...baseProps} state="error" errorMessage="Backend unavailable" />,
    );
    expect(html).toContain('Backend unavailable');
  });

  it('renders the permission-denied state', () => {
    const html = renderToStaticMarkup(<CatalogListView {...baseProps} state="denied" />);
    expect(html).toContain('Permission denied');
  });

  it('renders rows and the entity title in the ready state', () => {
    const html = renderToStaticMarkup(
      <CatalogListView
        {...baseProps}
        state="ready"
        rows={[{ id: 'owner-1', code: 'OWN-01' }]}
      />,
    );
    expect(html).toContain('Owners');
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

  it('registers the catalog routes and route constants', () => {
    expect(ROUTES.FOUNDATION.MASTER_DATA.OWNERS).toBe('/foundation/master-data/owners');
    expect(ROUTES.FOUNDATION.MASTER_DATA.UOMS).toBe('/foundation/master-data/uoms');
    expect(ROUTES.FOUNDATION.MASTER_DATA.SKUS).toBe('/foundation/master-data/skus');
    expect(catalogRoutes).toHaveLength(3);
  });
});
