import { describe, expect, it } from 'vitest';

import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepository';
import type { HttpClient } from '@shared/Services/Http/ApiClient';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 },
    } as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({ Id: 'new-id', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('WarehouseProfileRepository', () => {
  it('hits the warehouse-profile + rule + preview endpoints at root paths', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.listProfiles({ status: 'DRAFT' });
    await repository.getProfile('profile-1');
    await repository.listRuleGroups();
    await repository.listRuleDefinitions({ precedenceTier: 'COMPLIANCE' });
    await repository.listProfileRules('profile-1');
    await repository.listAssignments('profile-1');

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/warehouse-profiles'],
      ['get', '/warehouse-profiles/profile-1'],
      ['get', '/rule-groups'],
      ['get', '/rule-definitions'],
      ['get', '/warehouse-profiles/profile-1/rules'],
      ['get', '/warehouse-profiles/profile-1/assignments'],
    ]);
  });

  it('builds only the whitelisted profile list params', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.listProfiles({ status: 'ACTIVE', warehouseTypeCode: 'DC', warehouseId: 'wh-1' });

    expect(http.calls[0]?.config).toEqual({
      params: { Page: 1, PageSize: 100, Status: 'ACTIVE', WarehouseTypeCode: 'DC', WarehouseId: 'wh-1' },
    });
  });

  it('builds only the whitelisted rule-definition list params (tier/control mode filter)', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.listRuleDefinitions({
      ruleGroupId: 'g-1',
      precedenceTier: 'PHYSICAL',
      controlMode: 'HARD_BLOCK',
    });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 1,
        PageSize: 100,
        RuleGroupId: 'g-1',
        PrecedenceTier: 'PHYSICAL',
        ControlMode: 'HARD_BLOCK',
      },
    });
  });

  it('creates a draft profile with a PascalCase body and never sends Status', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.createProfile({
      profileCode: 'WP-01',
      profileName: 'Default',
      warehouseTypeCode: 'DC',
      effectiveFrom: '2026-06-01',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/warehouse-profiles',
      body: { ProfileCode: 'WP-01', ProfileName: 'Default', WarehouseTypeCode: 'DC', EffectiveFrom: '2026-06-01' },
    });
    expect((http.calls[0]?.body as Record<string, unknown>).Status).toBeUndefined();
  });

  it('PATCHes with an OMIT body: absent/null fields never appear in the request', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.updateProfile('profile-1', { profileName: 'Renamed', warehouseId: null });

    const call = http.calls[0];
    expect(call?.method).toBe('patch');
    expect(call?.url).toBe('/warehouse-profiles/profile-1');
    expect(call?.body).toEqual({ ProfileName: 'Renamed' });
    expect('WarehouseId' in (call?.body as object)).toBe(false);
  });

  it('activates and deactivates at the correct paths with reason context', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.activateProfile('profile-1', { reasonCode: 'POLICY', effectiveFrom: '2026-07-01' });
    await repository.deactivateProfile('profile-1', { reasonCode: 'RETIRE', reasonNote: 'done' });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/warehouse-profiles/profile-1/activate',
      body: { ReasonCode: 'POLICY', EffectiveFrom: '2026-07-01' },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/warehouse-profiles/profile-1/deactivate',
      body: { ReasonCode: 'RETIRE', ReasonNote: 'done' },
    });
  });

  it('creates an assignment and adds/removes a profile rule at nested paths', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    await repository.createAssignment('profile-1', { assignmentType: 'WAREHOUSE', warehouseId: 'wh-9' });
    await repository.addProfileRule('profile-1', { ruleDefinitionId: 'rule-1', isEnabled: true });
    await repository.removeProfileRule('profile-1', 'rule-1');

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/warehouse-profiles/profile-1/assignments',
      body: { AssignmentType: 'WAREHOUSE', WarehouseId: 'wh-9' },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/warehouse-profiles/profile-1/rules',
      body: { RuleDefinitionId: 'rule-1', IsEnabled: true },
    });
    expect(http.calls[2]).toMatchObject({ method: 'delete', url: '/warehouse-profiles/profile-1/rules/rule-1' });
  });

  it('POSTs the preview context (six axes) to /rules/preview and never emits ProfileId', async () => {
    const http = new FakeHttpClient();
    const repository = new WarehouseProfileRepository(http);

    // Even if a profileId leaks into the context, the wire body must NOT carry it:
    // the merged BE PreviewRuleResolutionRequest declares no ProfileId and runs under
    // forbidNonWhitelisted, so any ProfileId in the body -> HTTP 400 (contract divergence).
    await repository.preview({
      warehouseTypeCode: 'DC',
      ownerId: 'owner-1',
      profileId: 'profile-1',
    } as Parameters<typeof repository.preview>[0]);

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/rules/preview',
      body: { WarehouseTypeCode: 'DC', OwnerId: 'owner-1' },
    });
    expect('ProfileId' in (http.calls[0]?.body as object)).toBe(false);
  });

  it('returns an empty page when the backend responds with a null list payload', async () => {
    class NullListHttpClient extends FakeHttpClient {
      override get<T>(url: string, config?: unknown): Promise<T> {
        this.calls.push({ method: 'get', url, config });
        return Promise.resolve(null as T);
      }
    }
    const repository = new WarehouseProfileRepository(new NullListHttpClient());
    await expect(repository.listProfiles()).resolves.toMatchObject({ items: [], totalItems: 0 });
  });
});
