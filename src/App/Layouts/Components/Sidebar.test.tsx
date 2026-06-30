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
  it('groups Foundation navigation and exposes warehouse type catalog', () => {
    renderSidebar(ROUTES.FOUNDATION.WAREHOUSE_TYPES);

    expect(screen.getByText('Cấu trúc vật lý')).toBeTruthy();
    expect(screen.getByText('Sản phẩm và đóng gói')).toBeTruthy();
    expect(screen.getByText('Quy tắc và hồ sơ')).toBeTruthy();
    expect(screen.getByText('Quản trị')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Loại kho' }).getAttribute('href')).toBe(
      ROUTES.FOUNDATION.WAREHOUSE_TYPES,
    );
    expect(screen.getByRole('link', { name: 'Kho và sơ đồ kho' }).getAttribute('href')).toBe(
      ROUTES.FOUNDATION.LOCATIONS,
    );
  });

  it('shows only implemented operational route groups in V1', () => {
    renderSidebar();

    for (const [label, href] of [
      ['Nhập kho', ROUTES.INBOUND.ROOT],
      ['Cất hàng', ROUTES.PUTAWAY.ROOT],
      ['Bổ sung hàng', ROUTES.REPLENISHMENT.ROOT],
      ['Xuất kho', ROUTES.OUTBOUND.ROOT],
      ['Đóng gói', ROUTES.PACKING.ROOT],
      ['Giao hàng', ROUTES.SHIPPING.ROOT],
      ['Tích hợp', ROUTES.INTEGRATION.ROOT],
      ['Nhiệm vụ di động', ROUTES.MOBILE.TASKS],
      ['Nhãn và lệnh in', ROUTES.LABELS.ROOT],
      ['Kiểm kê chu kỳ', ROUTES.CYCLE_COUNT.ROOT],
    ] as const) {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
    }
  });

  it('does not expose placeholder-only operational routes', () => {
    renderSidebar();

    const sidebarHrefs = Array.from(document.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    for (const label of ['Kho', 'Lấy hàng', 'Chuyển kho', 'Điều chỉnh tồn', 'Báo cáo']) {
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
