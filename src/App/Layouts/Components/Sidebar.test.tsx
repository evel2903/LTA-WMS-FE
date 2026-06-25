// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { Sidebar } from '@app/Layouts/Components/Sidebar';

function renderSidebar(initialPath = '/inbound') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('Sidebar V1 route hygiene', () => {
  it('shows only implemented operational route groups in V1', () => {
    renderSidebar();

    for (const [label, href] of [
      ['Inbound', ROUTES.INBOUND.ROOT],
      ['Putaway', ROUTES.PUTAWAY.ROOT],
      ['Replenishment', ROUTES.REPLENISHMENT.ROOT],
      ['Outbound', ROUTES.OUTBOUND.ROOT],
      ['Packing', ROUTES.PACKING.ROOT],
      ['Shipping', ROUTES.SHIPPING.ROOT],
      ['Integration', ROUTES.INTEGRATION.ROOT],
      ['Mobile Tasks', ROUTES.MOBILE.TASKS],
      ['Labels & Print Jobs', ROUTES.LABELS.ROOT],
      ['Cycle Count', ROUTES.CYCLE_COUNT.ROOT],
    ] as const) {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
    }
  });

  it('does not expose placeholder-only operational routes', () => {
    renderSidebar();

    const sidebarHrefs = Array.from(document.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    for (const label of ['Warehouse', 'Picking', 'Stock Transfer', 'Stock Adjustment', 'Reports']) {
      expect(screen.queryByRole('link', { name: label })).toBeNull();
    }

    for (const href of [
      ROUTES.WAREHOUSE.ROOT,
      ROUTES.PICKING.ROOT,
      ROUTES.STOCK_TRANSFER.ROOT,
      ROUTES.STOCK_ADJUSTMENT.ROOT,
      ROUTES.REPORTS.ROOT,
    ]) {
      expect(sidebarHrefs).not.toContain(href);
    }
  });
});
