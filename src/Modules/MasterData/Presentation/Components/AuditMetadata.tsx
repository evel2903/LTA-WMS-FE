interface AuditMetadataProps {
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

function AuditRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 break-words">{value ?? '-'}</span>
    </div>
  );
}

/** Compact read-only display of audit metadata shown in an entity's edit card. */
export function AuditMetadata({ createdAt, updatedAt, createdBy, updatedBy }: AuditMetadataProps) {
  return (
    <div className="text-muted-foreground grid gap-1 border-t pt-3 text-xs">
      <AuditRow label="Created at" value={createdAt} />
      <AuditRow label="Created by" value={createdBy} />
      <AuditRow label="Updated at" value={updatedAt} />
      <AuditRow label="Updated by" value={updatedBy} />
    </div>
  );
}
