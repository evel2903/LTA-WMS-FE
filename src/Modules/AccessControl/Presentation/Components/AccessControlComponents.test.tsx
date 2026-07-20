import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AccessStateView } from '@modules/AccessControl/Presentation/Components/StateViews';
import { UserAssignmentPanel } from '@modules/AccessControl/Presentation/Components/UserAssignmentPanel';
import { AssignDataScopeForm } from '@modules/AccessControl/Presentation/Forms/AssignDataScopeForm';
import { AssignRoleForm } from '@modules/AccessControl/Presentation/Forms/AssignRoleForm';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';

const user = {
  id: 'user-1',
  firstName: 'An',
  lastName: 'Nguyen',
  email: 'an.nguyen@example.com',
  createdAt: '2026-06-29T00:00:00.000Z',
};

const operatorRole: Role = {
  id: 'role-operator',
  roleCode: 'OPERATOR',
  roleName: 'Nhân viên vận hành',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
};

const pending = {
  assignRole: false,
  removeRole: false,
  assignScope: false,
  removeScope: false,
};

describe('AccessStateView', () => {
  it('renders loading / empty / denied states as polite ReUI alerts', () => {
    expect(renderToStaticMarkup(<AccessStateView state="loading" />)).toContain('role="status"');
    expect(renderToStaticMarkup(<AccessStateView state="empty" emptyLabel="Chưa có người dùng." />)).toContain(
      'Chưa có người dùng.',
    );
    const emptyHtml = renderToStaticMarkup(<AccessStateView state="empty" />);

    expect(emptyHtml).toContain('role="status"');
    expect(emptyHtml).toContain('min-h-28');
    expect(emptyHtml).toContain('py-10');
    expect(emptyHtml).toContain('place-content-center');
    expect(renderToStaticMarkup(<AccessStateView state="denied" />)).toContain('Không có quyền');
    expect(renderToStaticMarkup(<AccessStateView state="denied" />)).toContain('role="status"');
  });

  it('renders API errors as assertive destructive alerts', () => {
    const html = renderToStaticMarkup(<AccessStateView state="error" errorMessage="Máy chủ không phản hồi" />);

    expect(html).toContain('Máy chủ không phản hồi');
    expect(html).toContain('role="alert"');
  });
});

describe('AccessControl ReUI helper alerts', () => {
  it('renders user-assignment read-only and empty helpers as polite status alerts', () => {
    const html = renderToStaticMarkup(
      <UserAssignmentPanel
        user={user}
        roles={[operatorRole]}
        rolesStatus="ready"
        effective={{ userId: user.id, roles: [], permissions: [] }}
        reservedRoleCodes={[]}
        dataScopes={[]}
        canManage={false}
        pending={pending}
        conflicts={{}}
        onAssignRole={() => undefined}
        onRemoveRole={() => undefined}
        onAssignScope={() => undefined}
        onRemoveScope={() => undefined}
      />,
    );

    expect(html.match(/role="status"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html).toContain('Chế độ chỉ đọc');
    expect(html).toContain('Chưa gán vai trò nào.');
    expect(html).toContain('Chưa gán phạm vi dữ liệu nào.');
    expect(html).toContain('Không có quyền hiệu lực.');
  });

  it('renders role-assignment helper and conflict states with the correct alert roles', () => {
    const emptyRolesHtml = renderToStaticMarkup(<AssignRoleForm availableRoles={[]} onSubmit={() => undefined} />);
    const conflictHtml = renderToStaticMarkup(
      <AssignRoleForm
        availableRoles={[operatorRole]}
        conflict="Xung đột gán vai trò"
        onSubmit={() => undefined}
      />,
    );

    expect(emptyRolesHtml).toContain('role="status"');
    expect(conflictHtml).toContain('Xung đột gán vai trò');
    expect(conflictHtml).toContain('role="alert"');
  });

  it('renders data-scope assignment conflicts as a full-width destructive alert', () => {
    const html = renderToStaticMarkup(
      <AssignDataScopeForm conflict="Xung đột gán phạm vi" onSubmit={() => undefined} />,
    );

    expect(html).toContain('Xung đột gán phạm vi');
    expect(html).toContain('role="alert"');
    expect(html).toContain('w-full');
  });
});
