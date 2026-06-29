import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { warehouseProfileRoutes } from '@modules/WarehouseProfile/Presentation/Routes/WarehouseProfileRoutes';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import { ProfileAssignmentPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileAssignmentPanel';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';
import { AssignmentForm } from '@modules/WarehouseProfile/Presentation/Forms/AssignmentForm';
import { WarehouseProfileForm } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileForm';

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
    expect(renderToStaticMarkup(<ProfileStateView state="error" errorMessage="Máy chủ không phản hồi" />)).toContain(
      'Máy chủ không phản hồi',
    );
  });

  it('uses polite status semantics for helper states and assertive semantics for errors', () => {
    const emptyHtml = renderToStaticMarkup(<ProfileStateView state="empty" />);

    expect(emptyHtml).toContain('role="status"');
    expect(emptyHtml).toContain('min-h-28');
    expect(emptyHtml).toContain('py-10');
    expect(emptyHtml).toContain('place-content-center');
    expect(renderToStaticMarkup(<ProfileStateView state="loading" />)).toContain('role="status"');
    expect(renderToStaticMarkup(<ProfileStateView state="denied" />)).toContain('role="status"');
    expect(renderToStaticMarkup(<ProfileStateView state="error" />)).toContain('role="alert"');
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
        conflictMessage="Đã có hồ sơ đang hoạt động cho phạm vi này."
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('Xung đột');
    expect(html).toContain('Đã có hồ sơ đang hoạt động cho phạm vi này.');
    expect(html).toContain('role="alert"');
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
    expect(html).toContain('role="status"');
  });

  it('renders non-conflict backend errors as assertive alerts', () => {
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        errorMessage="Vòng đời hồ sơ không hợp lệ"
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );

    expect(html).toContain('Vòng đời hồ sơ không hợp lệ');
    expect(html).toContain('role="alert"');
  });
});

describe('WarehouseProfile ReUI helper alerts', () => {
  it('renders assignment panel read-only and empty helpers as polite status alerts', () => {
    const html = renderToStaticMarkup(
      <ProfileAssignmentPanel
        assignments={[]}
        canEdit={false}
        onCreate={() => undefined}
      />,
    );

    expect(html.match(/role="status"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Chỉ đọc');
    expect(html).toContain('Chưa có gán nào.');
  });

  it('renders assignment form conflicts as assertive destructive alerts', () => {
    const html = renderToStaticMarkup(
      <AssignmentForm conflict="Xung đột phạm vi gán" onSubmit={() => undefined} />,
    );

    expect(html).toContain('Xung đột phạm vi gán');
    expect(html).toContain('role="alert"');
  });

  it('renders profile form conflicts as assertive destructive alerts', () => {
    const html = renderToStaticMarkup(
      <WarehouseProfileForm
        submitLabel="Lưu hồ sơ"
        conflict="Mã hồ sơ đã tồn tại"
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Mã hồ sơ đã tồn tại');
    expect(html).toContain('role="alert"');
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
