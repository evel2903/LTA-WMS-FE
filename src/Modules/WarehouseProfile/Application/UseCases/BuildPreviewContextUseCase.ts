import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { PreviewContextInput } from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';

/**
 * Builds a preview context from a profile's own six-axis scope so an admin can
 * run a "Preview this profile" check before activating it.
 *
 * NOTE (contract divergence — see Dev Notes): the B-series spec described an
 * optional by-id self-check (`ProfileId`) so the resolver could target a still
 * DRAFT candidate. The MERGED BE preview HTTP request
 * (`PreviewRuleResolutionRequest`) declares NO `ProfileId` and runs under the
 * global `forbidNonWhitelisted` ValidationPipe, so sending it would 400. The B5
 * activation gate uses the by-id path IN-PROCESS, never over HTTP. Therefore the
 * FE self-check copies the profile's SCOPE only; the BE resolves the most
 * specific ACTIVE profile by that scope. B6 does not change the BE.
 *
 * This is a pure projection — it copies the profile's scope as-is and never
 * invents axis values (a wildcard `null` stays `null`). It does NOT resolve any
 * rule precedence; resolution is owned by the backend (architecture 8.2).
 */
export function buildPreviewContextFromProfile(profile: WarehouseProfile): PreviewContextInput {
  return {
    warehouseTypeCode: profile.warehouseTypeCode,
    warehouseId: profile.warehouseId,
    zoneId: profile.zoneId,
    locationType: profile.locationType,
    ownerId: profile.ownerId,
    skuId: profile.skuId,
    itemClass: profile.itemClass,
    orderType: profile.orderType,
    customerId: profile.customerId,
    supplierId: profile.supplierId,
  };
}
