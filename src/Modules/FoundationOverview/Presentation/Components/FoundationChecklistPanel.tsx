import type { WarehouseProfileReadinessRow } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';
import { PROFILE_CHECKLIST_STATUS_LABELS } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

export function FoundationChecklistPanel({ rows }: { rows: WarehouseProfileReadinessRow[] }) {
  const rowsWithChecklist = rows.filter((row) => row.checklist);

  if (rowsWithChecklist.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có active profile đủ điều kiện để gọi checklist B7 trong scope hiện tại.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rowsWithChecklist.map((row) => (
        <section key={row.activeProfileId} className="rounded-md border p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">
                {row.warehouseCode} · {row.activeProfileCode}
              </h3>
              <p className="text-muted-foreground text-xs">
                Evaluated at {row.checklist?.evaluatedAt ?? '—'}
              </p>
            </div>
            <FoundationStatusBadge status={row.status} />
          </div>
          <div className="space-y-2">
            {row.checklist?.items.map((item) => (
              <div key={item.code} className="grid gap-1 rounded-md bg-muted/40 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {PROFILE_CHECKLIST_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="text-muted-foreground">{item.message}</p>
                {item.deferredToStory ? (
                  <p className="text-muted-foreground text-xs">
                    Deferred to {item.deferredToStory}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
