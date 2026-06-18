import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';

function PolicyBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs font-medium uppercase">{title}</div>
      <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function LocationProfileConstraintsPanel({
  profile,
  profileId,
}: {
  profile: LocationProfile | null;
  profileId?: string | null;
}) {
  if (!profile) {
    return (
      <div className="text-muted-foreground rounded-md border p-3 text-sm">
        {profileId
          ? `Profile ${profileId} is not in the active list; its constraints are unavailable.`
          : 'No location profile assigned.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium">
          {profile.profileCode} - {profile.profileName}
        </div>
        <div className="text-muted-foreground text-xs">
          {profile.locationType} · Version {profile.version}
        </div>
      </div>
      <PolicyBlock title="capacity policy" value={profile.capacityPolicy} />
      <PolicyBlock title="eligibility policy" value={profile.eligibilityPolicy} />
      <PolicyBlock title="mix policy" value={profile.mixPolicy} />
      <PolicyBlock title="compliance policy" value={profile.compliancePolicy} />
      <PolicyBlock title="operation policy" value={profile.operationPolicy} />
    </div>
  );
}
