import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';

const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'POLICY', label: 'POLICY - Lifecycle policy' }],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { warehouseProfileRoutes } from '@modules/WarehouseProfile/Presentation/Routes/WarehouseProfileRoutes';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import { ProfileAssignmentPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileAssignmentPanel';
import { WarehouseProfileDetailPanel } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileDetailPanel';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';
import { WarehouseProfileTable } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileTable';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';
import { AssignmentForm } from '@modules/WarehouseProfile/Presentation/Forms/AssignmentForm';
import { WarehouseProfileForm } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileForm';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileAssignment } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignment';

function profile(overrides: Partial<WarehouseProfile> = {}): WarehouseProfile {
  return {
    id: 'profile-1',
    profileCode: 'DC-DEFAULT',
    profileName: 'Default DC profile',
    warehouseTypeCode: 'DC',
    version: 1,
    status: 'ACTIVE',
    scopeKey: 'DC',
    warehouseId: null,
    zoneId: null,
    locationType: null,
    ownerId: null,
    skuId: null,
    itemClass: null,
    orderType: null,
    customerId: null,
    supplierId: null,
    capabilityFlags: {},
    strategyPolicy: {},
    thresholdPolicy: {},
    approvalPolicy: {},
    labelDevicePolicy: {},
    integrationPolicy: {},
    auditPolicy: {},
    effectiveFrom: '2026-06-01T00:00:00.000Z',
    effectiveTo: null,
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function assignment(
  overrides: Partial<WarehouseProfileAssignment> = {},
): WarehouseProfileAssignment {
  return {
    id: 'assignment-1',
    warehouseProfileId: 'profile-1',
    assignmentType: 'WAREHOUSE_TYPE',
    warehouseTypeCode: 'DC',
    warehouseId: null,
    scopeKey: 'DC',
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('WarehouseProfileStatusBadge', () => {
  it('renders each lifecycle status label', () => {
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="DRAFT" />)).toContain(
      'Bản nháp',
    );
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="ACTIVE" />)).toContain(
      'Đang hoạt động',
    );
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="EXPIRED" />)).toContain(
      'Hết hiệu lực',
    );
    expect(renderToStaticMarkup(<WarehouseProfileStatusBadge status="RETIRED" />)).toContain(
      'Ngưng sử dụng',
    );
  });
});

describe('ControlModeBadge', () => {
  it('renders a distinct label for each of the four control modes', () => {
    expect(renderToStaticMarkup(<ControlModeBadge mode="HARD_BLOCK" />)).toContain('Chặn cứng');
    expect(renderToStaticMarkup(<ControlModeBadge mode="APPROVAL_REQUIRED" />)).toContain(
      'Yêu cầu phê duyệt',
    );
    expect(renderToStaticMarkup(<ControlModeBadge mode="SOFT_WARNING" />)).toContain(
      'Cảnh báo mềm',
    );
    expect(renderToStaticMarkup(<ControlModeBadge mode="AUTO_SUGGESTION" />)).toContain(
      'Gợi ý tự động',
    );
  });

  it('renders a safe Vietnamese fallback for an unsupported control mode', () => {
    const html = renderToStaticMarkup(<ControlModeBadge mode="CUSTOM_MODE" />);

    expect(html).toContain('Chế độ kiểm soát chưa hỗ trợ (CUSTOM_MODE)');
  });
});

describe('ProfileStateView (AC5 states)', () => {
  it('renders loading / empty / denied states distinctly', () => {
    expect(renderToStaticMarkup(<ProfileStateView state="loading" />)).toContain('Đang tải');
    expect(
      renderToStaticMarkup(<ProfileStateView state="empty" emptyLabel="Chưa có hồ sơ." />),
    ).toContain('Chưa có hồ sơ.');
    expect(renderToStaticMarkup(<ProfileStateView state="denied" />)).toContain('Không có quyền');
  });

  it('renders an error message in the error state', () => {
    expect(
      renderToStaticMarkup(
        <ProfileStateView state="error" errorMessage="Máy chủ không phản hồi" />,
      ),
    ).toContain('Máy chủ không phản hồi');
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
    reasonCodeOptions.useReasonCodeOptions.mockClear();
    const html = renderToStaticMarkup(
      <ProfileLifecycleActions
        status="DRAFT"
        onActivate={() => undefined}
        onDeactivate={() => undefined}
      />,
    );
    expect(html).toContain('Kích hoạt');
    expect(html).toContain('Ngưng kích hoạt');
    expect(reasonCodeOptions.useReasonCodeOptions).toHaveBeenCalledWith({
      action: 'Update',
      objectType: 'WarehouseProfile',
    });
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
      <ProfileAssignmentPanel assignments={[]} canEdit={false} onCreate={() => undefined} />,
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

describe('WarehouseProfileDetailPanel', () => {
  it('renders wildcard scope and open-ended dates with Vietnamese labels', () => {
    const html = renderToStaticMarkup(
      <WarehouseProfileDetailPanel
        profile={profile({
          skuId: 'SKU-WITH-A-VERY-LONG-IDENTIFIER-THAT-SHOULD-WRAP-IN-DETAIL-PANEL',
        })}
      />,
    );

    expect(html).toContain('Phạm vi áp dụng');
    expect(html).toContain('Áp dụng cho mọi giá trị');
    expect(html).toContain('Tất cả');
    expect(html).toContain('Không giới hạn');
    expect(html).toContain('break-words');
    expect(html).not.toContain('Scope (null = wildcard)');
  });
});

describe('ProfileAssignmentPanel labels', () => {
  it('renders assignment type labels instead of raw enum text in the assignment list', () => {
    const html = renderToStaticMarkup(
      <ProfileAssignmentPanel
        assignments={[
          assignment(),
          assignment({
            id: 'assignment-2',
            assignmentType: 'WAREHOUSE',
            warehouseTypeCode: null,
            warehouseId: 'WH-01',
          }),
        ]}
        onCreate={() => undefined}
      />,
    );

    expect(html).toContain('Loại kho');
    expect(html).toContain('Kho cụ thể');
    expect(html).toContain('DC');
    expect(html).toContain('WH-01');
    expect(html).not.toMatch(/>WAREHOUSE_TYPE<\/span>/);
    expect(html).not.toMatch(/>WAREHOUSE<\/span>/);
  });

  it('surfaces missing assignment target and unsupported assignment type distinctly', () => {
    const html = renderToStaticMarkup(
      <ProfileAssignmentPanel
        assignments={[
          assignment({ warehouseTypeCode: null }),
          assignment({
            id: 'assignment-unknown',
            assignmentType: 'CUSTOM_ASSIGNMENT' as WarehouseProfileAssignment['assignmentType'],
            warehouseTypeCode: null,
            warehouseId: 'WH-EDGE',
          }),
        ]}
        onCreate={() => undefined}
      />,
    );

    expect(html).toContain('Thiếu mã loại kho');
    expect(html).toContain('Loại gán chưa hỗ trợ (CUSTOM_ASSIGNMENT)');
    expect(html).toContain('WH-EDGE');
    expect(html).not.toContain('Chưa chọn loại kho');
    expect(html).toContain('min-w-0');
    expect(html).toContain('break-words');
  });
});

describe('WarehouseProfileTable responsive shell', () => {
  it('renders a desktop table and a mobile card list for the same profiles', () => {
    const html = renderToStaticMarkup(
      <WarehouseProfileTable
        profiles={[
          profile({
            profileCode: 'VERY-LONG-WAREHOUSE-PROFILE-CODE-THAT-SHOULD-WRAP-ON-MOBILE',
            profileName: 'Tên hồ sơ kho rất dài để kiểm tra wrap trên màn hình nhỏ',
          }),
        ]}
        selectedId="profile-1"
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="Danh sách hồ sơ kho dạng bảng"');
    expect(html).toContain('aria-label="Danh sách hồ sơ kho dạng thẻ"');
    expect(html).toContain('md:hidden');
    expect(html).toContain('hidden md:block');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-state="selected"');
    expect(html).toContain('table-fixed');
    expect(html).toContain('whitespace-normal');
    expect(html).toContain('Đang chọn');
    expect(html).toContain('break-words');
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
