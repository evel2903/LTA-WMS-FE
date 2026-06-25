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
          ? `Hồ sơ ${profileId} không nằm trong danh sách hoạt động; không thể xem ràng buộc.`
          : 'Chưa gán hồ sơ vị trí.'}
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
          {profile.locationType} · Phiên bản {profile.version}
        </div>
      </div>
      <PolicyBlock title="chính sách sức chứa" value={profile.capacityPolicy} />
      <PolicyBlock title="chính sách điều kiện" value={profile.eligibilityPolicy} />
      <PolicyBlock title="chính sách trộn" value={profile.mixPolicy} />
      <PolicyBlock title="chính sách tuân thủ" value={profile.compliancePolicy} />
      <PolicyBlock title="chính sách vận hành" value={profile.operationPolicy} />
    </div>
  );
}
