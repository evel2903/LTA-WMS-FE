import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent } from '@shared/Components/Ui/Card';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { conflictMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import { useWarehouseProfileMutations } from '@modules/WarehouseProfile/Application/Commands/UseWarehouseProfileMutations';
import {
  useProfileAssignments,
  useProfileRules,
} from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import { useWarehouseProfileDetail } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfileDetail';
import { useRuleDefinitions } from '@modules/WarehouseProfile/Application/Queries/UseRuleCatalog';
import { ProfileAssignmentPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileAssignmentPanel';
import { ProfileLifecycleActions } from '@modules/WarehouseProfile/Presentation/Components/ProfileLifecycleActions';
import { ProfilePreviewPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfilePreviewPanel';
import { ProfileRulesPanel } from '@modules/WarehouseProfile/Presentation/Components/ProfileRulesPanel';
import { WarehouseProfileDetailPanel } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileDetailPanel';
import { WarehouseProfileStatusBadge } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileStatusBadge';
import { WarehouseProfileForm } from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileForm';
import { useState } from 'react';

type WarehouseProfileDetailMode = 'create' | 'detail' | 'edit';

interface WarehouseProfileDetailPageProps {
  mode: WarehouseProfileDetailMode;
}

function detailState(params: {
  mode: WarehouseProfileDetailMode;
  id?: string;
  isLoading: boolean;
  error: unknown;
  hasProfile: boolean;
}): PageBoundaryState | null {
  if (params.mode === 'create') return null;
  if (!params.id) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasProfile) return 'notFound';
  return null;
}

export function WarehouseProfileDetailPage({ mode }: WarehouseProfileDetailPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [lifecycleError, setLifecycleError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';

  const detailQuery = useWarehouseProfileDetail(isCreate ? null : (id ?? null));
  const profile = detailQuery.data ?? null;
  const assignmentsQuery = useProfileAssignments(profile?.id ?? null);
  const profileRulesQuery = useProfileRules(profile?.id ?? null);
  const ruleDefinitionsQuery = useRuleDefinitions();
  const mutations = useWarehouseProfileMutations();

  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const state = detailState({
    mode,
    id,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    hasProfile: Boolean(profile),
  });
  const canMutate = (isCreate || isEdit) && !apiError?.isForbidden;
  const lifecycleConflict = conflictMessage(lifecycleError) ?? undefined;
  const lifecycleOther =
    !lifecycleConflict && lifecycleError instanceof ApiError ? lifecycleError.message : undefined;

  const title = isCreate
    ? 'Tạo hồ sơ kho'
    : profile
      ? profile.profileCode
      : 'Hồ sơ kho';

  return (
    <DetailPageShell
      title={title}
      subtitle={
        isCreate
          ? 'Tạo hồ sơ nháp trên trang action riêng.'
          : 'Rà soát trạng thái quản trị hồ sơ trước khi mở chỉnh sửa/action.'
      }
      backTo={ROUTES.FOUNDATION.WAREHOUSE_PROFILES}
      backLabel="Quay lại hồ sơ"
      status={profile ? <WarehouseProfileStatusBadge status={profile.status} /> : null}
      actions={
        profile ? (
          isEdit ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(profile.id)}>Xem chi tiết</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_EDIT(profile.id)}>Chỉnh sửa hồ sơ</Link>
            </Button>
          )
        ) : null
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={apiError?.message ?? 'Không thể tải hồ sơ kho.'}
      contentClassName="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]"
    >
      {isCreate ? (
        <ActionPanel
          title="Tạo hồ sơ"
          description="Tạo bản nháp WarehouseProfile bằng contract nền tảng hiện có."
          state={mutations.createProfile.isPending ? 'pending' : 'idle'}
        >
          <WarehouseProfileForm
            submitLabel="Tạo bản nháp"
            disabled={!canMutate}
            pending={mutations.createProfile.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.createProfile.mutate(values, {
                onError: setSubmitError,
                onSuccess: (created) => {
                  setSubmitError(null);
                  void navigate(ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(created.id));
                },
              })
            }
          />
        </ActionPanel>
      ) : profile ? (
        <>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <WarehouseProfileDetailPanel profile={profile} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <ProfileAssignmentPanel
                  assignments={assignmentsQuery.data?.items ?? []}
                  canEdit={canMutate}
                  pending={mutations.createAssignment.isPending}
                  onCreate={(values) =>
                    mutations.createAssignment.mutate({
                      id: profile.id,
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
                  canEdit={canMutate}
                  pendingAdd={mutations.addProfileRule.isPending}
                  pendingRemove={mutations.removeProfileRule.isPending}
                  onAdd={(ruleDefinitionId) =>
                    mutations.addProfileRule.mutate({
                      id: profile.id,
                      input: { ruleDefinitionId },
                    })
                  }
                  onRemove={(ruleId) =>
                    mutations.removeProfileRule.mutate({ id: profile.id, ruleId })
                  }
                />
              </CardContent>
            </Card>

            <ProfilePreviewPanel profile={profile} canPreview={canMutate} />
          </div>

          <div className="space-y-4">
            {isEdit ? (
              <ActionPanel
                title="Chỉnh sửa hồ sơ"
                description="Cập nhật hồ sơ giữ trên route chỉnh sửa/action."
                state={mutations.updateProfile.isPending ? 'pending' : 'idle'}
              >
                <WarehouseProfileForm
                  key={`profile-${profile.id}`}
                  initialValue={profile}
                  submitLabel="Cập nhật hồ sơ"
                  disabled={!canMutate}
                  pending={mutations.updateProfile.isPending}
                  conflict={conflictMessage(submitError) ?? undefined}
                  onSubmit={(values) =>
                    mutations.updateProfile.mutate(
                      { id: profile.id, input: values },
                      { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
                    )
                  }
                />
              </ActionPanel>
            ) : (
              <ActionPanel
                title="Chi tiết chỉ đọc"
                description="Mở chế độ chỉnh sửa để đổi metadata, lifecycle, phân bổ hoặc quy tắc của hồ sơ."
                state="disabled"
                governanceState="readOnly"
              />
            )}

            <ActionPanel
              title="Hành động vòng đời"
              description="Kích hoạt và ngưng kích hoạt giữ hành vi reason/audit hiện có."
              state={
                mutations.activateProfile.isPending || mutations.deactivateProfile.isPending
                  ? 'pending'
                  : 'idle'
              }
              governanceState={canMutate ? undefined : 'readOnly'}
            >
              <ProfileLifecycleActions
                status={profile.status}
                canManage={canMutate}
                pending={
                  mutations.activateProfile.isPending || mutations.deactivateProfile.isPending
                }
                conflictMessage={lifecycleConflict}
                errorMessage={lifecycleOther}
                onActivate={(input) =>
                  mutations.activateProfile.mutate(
                    { id: profile.id, input },
                    { onError: setLifecycleError, onSuccess: () => setLifecycleError(null) },
                  )
                }
                onDeactivate={(input) =>
                  mutations.deactivateProfile.mutate(
                    { id: profile.id, input },
                    { onError: setLifecycleError, onSuccess: () => setLifecycleError(null) },
                  )
                }
              />
            </ActionPanel>
          </div>
        </>
      ) : null}
    </DetailPageShell>
  );
}
