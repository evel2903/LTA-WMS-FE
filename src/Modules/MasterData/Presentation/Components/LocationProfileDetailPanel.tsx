import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  describeCapacityPolicy,
  describeCompliancePolicy,
  describeEligibilityPolicy,
  describeMixPolicy,
  describeOperationPolicy,
  type PolicyDisplayRow,
} from '@modules/MasterData/Presentation/Constants/LocationProfilePolicyDisplayText';
import { LocationProfileStatusBadge } from '@modules/MasterData/Presentation/Components/LocationProfileStatusBadge';

function PolicyBlock({ label, rows }: { label: string; rows: PolicyDisplayRow[] }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <dl className="mt-2 grid gap-1 text-sm">
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

export function LocationProfileDetailPanel({ profile }: { profile: LocationProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-muted-foreground text-xs">Mã hồ sơ</div>
          <div className="font-medium">{profile.profileCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Trạng thái</div>
          <LocationProfileStatusBadge status={profile.status} />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Loại vị trí</div>
          <div>{profile.locationType}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Phiên bản</div>
          <div>{profile.version}</div>
        </div>
      </div>

      <div className="grid gap-3">
        <PolicyBlock label="Chính sách sức chứa" rows={describeCapacityPolicy(profile.capacityPolicy)} />
        <PolicyBlock
          label="Chính sách điều kiện sử dụng"
          rows={describeEligibilityPolicy(profile.eligibilityPolicy)}
        />
        <PolicyBlock label="Chính sách trộn hàng" rows={describeMixPolicy(profile.mixPolicy)} />
        <PolicyBlock label="Chính sách tuân thủ" rows={describeCompliancePolicy(profile.compliancePolicy)} />
        <PolicyBlock label="Chính sách vận hành" rows={describeOperationPolicy(profile.operationPolicy)} />
      </div>
    </div>
  );
}
