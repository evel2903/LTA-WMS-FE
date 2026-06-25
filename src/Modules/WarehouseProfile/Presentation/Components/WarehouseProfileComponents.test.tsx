import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { warehouseProfileRoutes } from '@modules/WarehouseProfile/Presentation/Routes/WarehouseProfileRoutes';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';

describe('WarehouseProfileStatusBadge', () => {
  it('renders each lifecycle status label', () => {
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="DRAFT" />)).toContain('Bản nháp');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="ACTIVE" />)).toContain('Đang hoạt động');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="EXPIRED" />)).toContain('Hết hiệu lực');
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="RETIRED" />)).toContain('Ngưng sử dụng');
  });
});

describe('ControlModeBadge', () => {
  it('renders a distinct label for each of the four control modes', () => {
    expect(renderToStaticMarkup(<ControlModeBadge mode="HARD_BLOCK" />)).toContain('Chặn cứng');
    expect(renderToStaticMarkup(<ControlModeBadge mode="APPROVAL_REQUIRED" />)).toContain('Yêu cầu phê duyệt');
    expect(renderToStaticMarkup(<ControlModeBadge mode="SOFT_WARNING" />)).toContain('Cảnh báo mềm');
    expect(renderToStaticMarkup(<ControlModeBadge mode="AUTO_SUGGESTION" />)).toContain('Gợi ý tự động');
  });
});

describe('ProfileStateView (AC5 states)', () => {
  it('renders loading / empty / denied states distinctly', () => {
    expect(renderToStaticMarkup(<ProfileStateView state="loading" />)).toContain('Đang tải');
    expect(renderToStaticMarkup(<ProfileStateView state="empty" emptyLabel="Chưa có hồ sơ." />)).toContain(
      'Chưa có hồ sơ.',
    );
    expect(renderToStaticMarkup(<ProfileStateView state="denied" />)).toContain('Không có quyền');
  });

  it('renders an error message in the error state', () => {
    expect(renderToStaticMarkup(<ProfileStateView state="error" errorMessage="Backend down" />)).toContain(
      'Backend down',
    );
  });
});

describe('ProfileLifecycleActions (AC2 + AC5 conflict / denied)', () => {
  it('renders activate + deactivate actions for a draft profile', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions status="DRAFT" onActivate={() => undefined} onDeactivate={() => undefined} />,
    );
    expect(html).toContain('Kích hoạt');
    expect(html).toContain('Ngưng kích hoạt');
  });

  it('renders the conflict list as a distinct state when a 409 conflict message is supplied', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        conflictMessage="Overlapping active profile for this scope."
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('Xung đột');
    expect(html).toContain('Overlapping active profile for this scope.');
  });

  it('disables the actions and shows a read-only label when not permitted', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        canManage={false}
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('disabled');
    expect(html).toContain('Chỉ đọc');
  });
});

describe('warehouse profile routes', () => {
  it('registers list/detail and rule screen routes under the foundation namespace', () => {
    expect(ROUTES.FOUNDATION.WAREHOUSE_PROFILES).toBe('/foundation/warehouse-profiles');
    expect(ROUTES.FOUNDATION.RULE_MATRIX).toBe('/foundation/rule-matrix');
    expect(warehouseProfileRoutes).toHaveLength(6);
    expect(warehouseProfileRoutes.map((route) => route.path)).toEqual([
      ROUTES.FOUNDATION.WAREHOUSE_PROFILES,
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW,
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(),
      ROUTES.FOUNDATION.WAREHOUSE_PROFILE_EDIT(),
      ROUTES.FOUNDATION.RULE_MATRIX,
      ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW,
    ]);
  });
});
