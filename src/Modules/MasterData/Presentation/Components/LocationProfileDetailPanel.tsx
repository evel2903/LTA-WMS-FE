import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { LocationProfileStatusBadge } from '@modules/MasterData/Presentation/Components/LocationProfileStatusBadge';

const POLICY_GROUPS = [
  ['Capacity', 'capacityPolicy'],
  ['Eligibility', 'eligibilityPolicy'],
  ['Mix', 'mixPolicy'],
  ['Compliance', 'compliancePolicy'],
  ['Operation', 'operationPolicy'],
] as const;

function PolicyBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function LocationProfileDetailPanel({ profile }: { profile: LocationProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-muted-foreground text-xs">Profile code</div>
          <div className="font-medium">{profile.profileCode}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Status</div>
          <LocationProfileStatusBadge status={profile.status} />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Location type</div>
          <div>{profile.locationType}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Version</div>
          <div>{profile.version}</div>
        </div>
      </div>

      <div className="grid gap-3">
        {POLICY_GROUPS.map(([label, key]) => (
          <PolicyBlock key={key} label={label} value={profile[key]} />
        ))}
      </div>
    </div>
  );
}
