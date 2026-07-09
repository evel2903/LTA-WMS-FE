import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  describeCapacityPolicy,
  describeCompliancePolicy,
  describeEligibilityPolicy,
  describeMixPolicy,
  describeOperationPolicy,
  type PolicyDisplayRow,
} from '@modules/MasterData/Presentation/Constants/LocationProfilePolicyDisplayText';

function PolicyBlock({ title, rows }: { title: string; rows: PolicyDisplayRow[] }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs font-medium uppercase">{title}</div>
      <dl className="mt-2 grid gap-1 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
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
      <Alert role="status" variant={profileId ? 'warning' : 'info'}>
        <AlertTitle>{profileId ? 'Không thể xem ràng buộc' : 'Chưa gán hồ sơ vị trí'}</AlertTitle>
        <AlertDescription>
          {profileId
            ? `Hồ sơ ${profileId} không nằm trong danh sách hoạt động; không thể xem ràng buộc.`
            : 'Chưa gán hồ sơ vị trí.'}
        </AlertDescription>
      </Alert>
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
      <PolicyBlock title="chính sách sức chứa" rows={describeCapacityPolicy(profile.capacityPolicy)} />
      <PolicyBlock title="chính sách điều kiện" rows={describeEligibilityPolicy(profile.eligibilityPolicy)} />
      <PolicyBlock title="chính sách trộn" rows={describeMixPolicy(profile.mixPolicy)} />
      <PolicyBlock title="chính sách tuân thủ" rows={describeCompliancePolicy(profile.compliancePolicy)} />
      <PolicyBlock title="chính sách vận hành" rows={describeOperationPolicy(profile.operationPolicy)} />
    </div>
  );
}
