import { Link, useLocation, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';

/**
 * Stub for RA-03 — RA-04 replaces this entirely with the object×action permission-matrix
 * editor. Reads the role handed off via navigation state (set by RolesMasterPage's "Chi
 * tiết" link) instead of fetching by id — the only read endpoint today is by `role_code`.
 */
export function RoleDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const role = (location.state as { role?: Role } | null)?.role;

  return (
    <ListPageShell
      title={role ? role.roleName : 'Chi tiết vai trò'}
      description={role ? `Mã: ${role.roleCode}` : undefined}
    >
      {role ? (
        <div className="grid gap-2 text-sm">
          <p>
            <span className="font-medium">Mã vai trò:</span> {role.roleCode}
          </p>
          <p>
            <span className="font-medium">Loại:</span> {role.isSystem ? 'Hệ thống' : 'Tuỳ chỉnh'}
          </p>
          <p>
            <span className="font-medium">Trạng thái:</span> {role.status}
          </p>
          <p className="text-muted-foreground">Chỉnh sửa quyền sẽ có ở bản cập nhật tiếp theo.</p>
        </div>
      ) : (
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">Không có sẵn thông tin vai trò (id: {id}).</p>
          <Link className="underline" to={ROUTES.FOUNDATION.ACCESS.ROLES}>
            Quay lại danh sách vai trò
          </Link>
        </div>
      )}
    </ListPageShell>
  );
}
