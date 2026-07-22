import { describe, expect, it } from 'vitest';

import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';

// RH-03 (RH-CODE-01): the role-detail query key must use the role code verbatim. Because the API
// returns canonical codes and the client never re-cases, the cache key stays aligned with the
// stored canonical value; a client-side .toUpperCase()/.toLowerCase() here would split the cache.
describe('accessControlQueryKeys.roleDetail', () => {
  it('uses the role code verbatim (no client-side re-casing)', () => {
    const MIXED = 'InVeNtOrY_LeAd';
    expect(accessControlQueryKeys.roleDetail(MIXED)).toEqual([...accessControlQueryKeys.all, 'role', MIXED]);
    // Different-case codes are therefore DISTINCT keys — canonicalization is the server's job, so the
    // client must feed already-canonical codes (which it does) rather than fold case here.
    expect(accessControlQueryKeys.roleDetail('WMS_ADMIN')).not.toEqual(accessControlQueryKeys.roleDetail('wms_admin'));
  });
});
