import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { useLocationProfileMutations } from '@modules/MasterData/Application/Commands/UseLocationProfileMutations';
import { useLocationProfile } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { LocationProfileDetailPanel } from '@modules/MasterData/Presentation/Components/LocationProfileDetailPanel';
import { LocationProfileStatusBadge } from '@modules/MasterData/Presentation/Components/LocationProfileStatusBadge';
import { LocationProfileForm } from '@modules/MasterData/Presentation/Forms/LocationProfileForm';
import type { LocationProfileFormValues } from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';
import {
  toCreateLocationProfileInput,
  toUpdateLocationProfileInput,
} from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';

interface LocationProfileDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

export function LocationProfileDetailPage({ mode }: LocationProfileDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const detailQuery = useLocationProfile(isCreate ? null : id);
  const mutations = useLocationProfileMutations();

  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canManage = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canManage && (isCreate || isEdit);
  const profile = detailQuery.data;

  if (!isCreate && detailQuery.isLoading) {
    return <DetailPageShell title="Location profile detail" state="loading" backTo={ROUTES.FOUNDATION.LOCATION_PROFILES} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Location profile detail" state="forbidden" backTo={ROUTES.FOUNDATION.LOCATION_PROFILES} />;
  }

  if (!isCreate && detailQuery.error) {
    return (
      <DetailPageShell
        title="Location profile detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load location profile.'}
        backTo={ROUTES.FOUNDATION.LOCATION_PROFILES}
      />
    );
  }

  if (!isCreate && !profile) {
    return <DetailPageShell title="Location profile detail" state="notFound" backTo={ROUTES.FOUNDATION.LOCATION_PROFILES} />;
  }

  const submitCreate = (values: LocationProfileFormValues) =>
    mutations.create.mutate(toCreateLocationProfileInput(values), {
      onError: setSubmitError,
      onSuccess: (created) => {
        setSubmitError(null);
        void navigate(ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(created.id));
      },
    });

  const submitUpdate = (profileId: string, values: LocationProfileFormValues) =>
    mutations.update.mutate(
      { id: profileId, input: toUpdateLocationProfileInput(values) },
      {
        onError: setSubmitError,
        onSuccess: (updated) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(updated.id));
        },
      },
    );

  const submitInactivate = (profileId: string, values: LocationProfileFormValues) =>
    mutations.update.mutate(
      {
        id: profileId,
        input: { ...toUpdateLocationProfileInput(values), status: 'Inactive' },
      },
      {
        onError: setSubmitError,
        onSuccess: (updated) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(updated.id));
        },
      },
    );

  const existingProfile = profile as NonNullable<typeof profile>;
  const title = isCreate ? 'Create location profile' : existingProfile.profileCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Location policy profile"
      backTo={ROUTES.FOUNDATION.LOCATION_PROFILES}
      backLabel="Back to location profiles"
      status={!isCreate ? <LocationProfileStatusBadge status={existingProfile.status} /> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.LOCATION_PROFILE_EDIT(existingProfile.id)}>Edit profile</Link>
          </Button>
        ) : null
      }
      state={canManage ? null : 'readOnly'}
    >
      {!isCreate ? <LocationProfileDetailPanel profile={existingProfile} /> : null}
      <ActionPanel
        title={isCreate ? 'Create location profile' : 'Location profile actions'}
        description="Create, update and inactivate use the existing master-data audit path."
        state={mutations.create.isPending || mutations.update.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <LocationProfileForm
            mode="create"
            disabled={!canMutate}
            pending={mutations.create.isPending}
            inlineError={submitError ? toMutationErrorMessage(submitError) : undefined}
            onSubmit={submitCreate}
          />
        ) : (
          <LocationProfileForm
            key={`edit-${existingProfile.id}-${existingProfile.version}`}
            mode="edit"
            initialValue={existingProfile}
            disabled={!canMutate}
            pending={mutations.update.isPending}
            inlineError={submitError ? toMutationErrorMessage(submitError) : undefined}
            onSubmit={(values) => submitUpdate(existingProfile.id, values)}
            onInactivate={(values) => submitInactivate(existingProfile.id, values)}
          />
        )}
      </ActionPanel>
    </DetailPageShell>
  );
}
