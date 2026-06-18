import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { conflictMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import { useWarehouseProfileMutations } from '@modules/WarehouseProfile/Application/Commands/UseWarehouseProfileMutations';
import {
  useProfileAssignments,
  useProfileRules,
  useWarehouseProfiles,
} from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import { useWarehouseProfileDetail } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfileDetail';
import { useRuleDefinitions } from '@modules/WarehouseProfile/Application/Queries/UseRuleCatalog';
import {
  useWarehouseProfileStore,
  type ProfileStatusFilter,
} from '@modules/WarehouseProfile/Application/Stores/WarehouseProfileStore';
import { ProfileAssignmentPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileAssignmentPanel';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';
import { ProfilePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfilePreviewPanel';
import { ProfileRulesPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileRulesPanel';
import { ProfileStateView } from '@modules/WarehouseProfile/Presentation/Components/StateViews';
import { WarehouseProfileDetailPanel } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileDetailPanel';
import { WarehouseProfileTable } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileTable';
import { WarehouseProfileForm } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileForm';

export function WarehouseProfilesPage() {
  const store = useWarehouseProfileStore();
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [lifecycleError, setLifecycleError] = useState<unknown>(null);

  const query = useWarehouseProfiles({
    page: store.page,
    status: store.statusFilter === 'ALL' ? undefined : store.statusFilter,
    warehouseTypeCode: store.warehouseTypeCodeFilter || undefined,
  });
  // Selection is module-local store state (reactive); the selected profile object
  // comes from a MOUNTED detail query keyed by id. Mutations invalidate that exact
  // key, so the detail panel + lifecycle buttons reflect the new status immediately
  // without re-selecting the row (Finding #1). The list row is the fallback until
  // the detail query resolves.
  const selectedId = store.selectedProfileId;
  const detailQuery = useWarehouseProfileDetail(selectedId);
  const selected =
    detailQuery.data ?? query.data?.items.find((profile) => profile.id === selectedId) ?? null;

  const assignmentsQuery = useProfileAssignments(selectedId);
  const profileRulesQuery = useProfileRules(selectedId);
  const ruleDefinitionsQuery = useRuleDefinitions();
  const mutations = useWarehouseProfileMutations();

  const profiles = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const canManage = !apiError?.isForbidden;
  const clearSelection = () => {
    store.setSelectedProfileId(null);
    setSubmitError(null);
    setLifecycleError(null);
  };

  const listState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : profiles.length === 0
          ? 'empty'
          : 'ready';

  const lifecycleConflict = conflictMessage(lifecycleError) ?? undefined;
  const lifecycleOther =
    !lifecycleConflict && lifecycleError instanceof ApiError ? lifecycleError.message : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warehouse Profiles</h1>
        <p className="text-muted-foreground">
          Create draft profiles, manage scope and assignments, and activate / deactivate.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={store.statusFilter}
            onChange={(event) => store.setStatusFilter(event.target.value as ProfileStatusFilter)}
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="RETIRED">Retired</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Warehouse type code
          <Input
            value={store.warehouseTypeCodeFilter}
            onChange={(event) => store.setWarehouseTypeCodeFilter(event.target.value)}
            placeholder="e.g. DC"
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            {listState === 'ready' ? (
              <WarehouseProfileTable
                profiles={profiles}
                selectedId={selectedId}
                onSelect={(profile) => {
                  store.setSelectedProfileId(profile.id);
                  setSubmitError(null);
                  setLifecycleError(null);
                }}
              />
            ) : (
              <ProfileStateView
                state={listState}
                emptyLabel="No profiles yet."
                errorMessage={apiError?.message ?? 'Unable to load profiles.'}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected ? 'Edit profile' : 'Create profile (draft)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected ? (
                <>
                  <WarehouseProfileForm
                    key={`profile-${selected.id}`}
                    initialValue={selected}
                    submitLabel="Update profile"
                    disabled={!canManage}
                    pending={mutations.updateProfile.isPending}
                    conflict={conflictMessage(submitError) ?? undefined}
                    onSubmit={(values) =>
                      mutations.updateProfile.mutate(
                        { id: selected.id, input: values },
                        { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
                      )
                    }
                  />
                  <WarehouseProfileDetailPanel profile={selected} />
                  <ProfileLifecycleActions
                    status={selected.status}
                    canManage={canManage}
                    pending={
                      mutations.activateProfile.isPending || mutations.deactivateProfile.isPending
                    }
                    conflictMessage={lifecycleConflict}
                    errorMessage={lifecycleOther}
                    onActivate={(input) =>
                      mutations.activateProfile.mutate(
                        { id: selected.id, input },
                        { onError: setLifecycleError, onSuccess: () => setLifecycleError(null) },
                      )
                    }
                    onDeactivate={(input) =>
                      mutations.deactivateProfile.mutate(
                        { id: selected.id, input },
                        { onError: setLifecycleError, onSuccess: () => setLifecycleError(null) },
                      )
                    }
                  />
                  <button
                    className="text-muted-foreground text-xs underline"
                    onClick={clearSelection}
                  >
                    Cancel edit / create new
                  </button>
                </>
              ) : (
                <WarehouseProfileForm
                  key={`create-${createNonce}`}
                  submitLabel="Create draft"
                  disabled={!canManage}
                  pending={mutations.createProfile.isPending}
                  conflict={conflictMessage(submitError) ?? undefined}
                  onSubmit={(values) =>
                    mutations.createProfile.mutate(values, {
                      onError: setSubmitError,
                      onSuccess: () => {
                        setSubmitError(null);
                        setCreateNonce((value) => value + 1);
                      },
                    })
                  }
                />
              )}
            </CardContent>
          </Card>

          {selected && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <ProfileAssignmentPanel
                    assignments={assignmentsQuery.data?.items ?? []}
                    canEdit={canManage}
                    pending={mutations.createAssignment.isPending}
                    onCreate={(values) =>
                      mutations.createAssignment.mutate({
                        id: selected.id,
                        input: {
                          assignmentType: values.assignmentType,
                          warehouseTypeCode: values.warehouseTypeCode || undefined,
                          warehouseId: values.warehouseId || undefined,
                        },
                      })
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <ProfileRulesPanel
                    profileRules={profileRulesQuery.data?.items ?? []}
                    ruleDefinitions={ruleDefinitionsQuery.data?.items ?? []}
                    canEdit={canManage}
                    pendingAdd={mutations.addProfileRule.isPending}
                    pendingRemove={mutations.removeProfileRule.isPending}
                    onAdd={(ruleDefinitionId) =>
                      mutations.addProfileRule.mutate({
                        id: selected.id,
                        input: { ruleDefinitionId },
                      })
                    }
                    onRemove={(ruleId) =>
                      mutations.removeProfileRule.mutate({ id: selected.id, ruleId })
                    }
                  />
                </CardContent>
              </Card>

              <ProfilePreviewPanel profile={selected} canPreview={canManage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
