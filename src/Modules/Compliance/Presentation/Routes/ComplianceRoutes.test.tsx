import { describe, expect, it, vi } from 'vitest';

vi.mock('@modules/Compliance/Presentation/Pages/AuditLogPage', () => ({
  AuditLogPage: () => null,
}));

vi.mock('@modules/Compliance/Presentation/Pages/AuditLogDetailPage', () => ({
  AuditLogDetailPage: () => null,
}));

vi.mock('@modules/Compliance/Presentation/Pages/ExceptionQueuePage', () => ({
  ExceptionQueuePage: () => null,
}));

vi.mock('@modules/Compliance/Presentation/Pages/ExceptionDetailPage', () => ({
  ExceptionDetailPage: () => null,
}));

import { ROUTES } from '@app/Config/Routes';
import { complianceRoutes } from '@modules/Compliance/Presentation/Routes/ComplianceRoutes';

describe('complianceRoutes', () => {
  it('registers audit list/detail and exception routes', () => {
    expect(complianceRoutes.map((route) => route.path)).toEqual([
      ROUTES.FOUNDATION.AUDIT,
      ROUTES.FOUNDATION.AUDIT_DETAIL(),
      ROUTES.FOUNDATION.EXCEPTIONS,
      ROUTES.FOUNDATION.EXCEPTION_DETAIL(),
      ROUTES.FOUNDATION.EXCEPTION_ACTION(),
    ]);
  });

  it('keeps route pattern params literal and encodes concrete audit ids', () => {
    expect(ROUTES.FOUNDATION.AUDIT_DETAIL()).toBe('/foundation/audit/:id');
    expect(ROUTES.FOUNDATION.AUDIT_DETAIL('audit/a?#1')).toBe(
      '/foundation/audit/audit%2Fa%3F%231',
    );
    expect(ROUTES.FOUNDATION.AUDIT_DETAIL(':tenant/a?#1')).toBe(
      '/foundation/audit/%3Atenant%2Fa%3F%231',
    );
  });
});
