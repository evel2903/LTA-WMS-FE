interface OwnerPolicyViewProps {
  billingPolicy: Record<string, unknown> | null | undefined;
  visibilityScope: Record<string, unknown> | null | undefined;
}

/**
 * Pretty-prints a policy object as read-only JSON, or a placeholder when the
 * owner has no value. A8 surfaces BillingPolicy / VisibilityScope read-only;
 * there is no policy editor in V0 (and the PATCH omit contract never resends
 * these fields), so this is display-only.
 */
function PolicyBlock({ label, value }: { label: string; value: Record<string, unknown> | null | undefined }) {
  const hasValue = value != null && Object.keys(value).length > 0;
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {hasValue ? (
        <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <span className="text-muted-foreground text-xs italic">Not set</span>
      )}
    </div>
  );
}

/** Read-only display of an owner's BillingPolicy / VisibilityScope JSON (A8). */
export function OwnerPolicyView({ billingPolicy, visibilityScope }: OwnerPolicyViewProps) {
  return (
    <div className="grid gap-3 border-t pt-3">
      <PolicyBlock label="Billing policy" value={billingPolicy} />
      <PolicyBlock label="Visibility scope" value={visibilityScope} />
    </div>
  );
}
