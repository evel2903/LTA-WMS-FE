import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IShippingRepository } from '@modules/Shipping/Application/Interfaces/IShippingRepository';
import { SHIPPING_DEFAULT_PAGE_SIZE } from '@modules/Shipping/Domain/Constants/ShippingConstants';
import type { ShipmentPackageStaging } from '@modules/Shipping/Domain/Types/Shipping';
import type {
  AssignDockInput,
  AssignTruckInput,
  ShippingStagingListFilter,
  StagePackageInput,
} from '@modules/Shipping/Domain/Types/ShippingQuery';
import { SHIPPING_ENDPOINTS } from '@modules/Shipping/Infrastructure/Api/ShippingEndpoints';
import type {
  PagedShipmentPackageStagingDto,
  ShipmentPackageStagingDto,
} from '@modules/Shipping/Infrastructure/Dtos/ShippingDtos';
import { ShippingMapper } from '@modules/Shipping/Infrastructure/Mappers/ShippingMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return SHIPPING_DEFAULT_PAGE_SIZE;
  return value;
}

function pageNumber(value?: number): number {
  if (!value || value < 1) return 1;
  return value;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class ShippingRepository implements IShippingRepository {
  constructor(private readonly http: HttpClient) {}

  async list(
    filter: ShippingStagingListFilter = {},
  ): Promise<PaginatedResponse<ShipmentPackageStaging>> {
    const dto = await this.http.get<PagedShipmentPackageStagingDto>(
      SHIPPING_ENDPOINTS.STAGING_PACKAGES,
      {
        params: removeUndefined({
          Page: pageNumber(filter.page),
          PageSize: pageSize(filter.pageSize),
          WarehouseId: filter.warehouseId,
          OwnerId: filter.ownerId,
          Status: filter.status,
          PackageId: filter.packageId,
          OutboundOrderId: filter.outboundOrderId,
          ShipmentReference: filter.shipmentReference,
        }),
      },
    );
    return ShippingMapper.toPaged(dto);
  }

  async getById(id: string): Promise<ShipmentPackageStaging> {
    const dto = await this.http.get<ShipmentPackageStagingDto>(
      SHIPPING_ENDPOINTS.STAGING_PACKAGE_BY_ID(id),
    );
    return ShippingMapper.toStaging(dto);
  }

  async stagePackage(input: StagePackageInput): Promise<ShipmentPackageStaging> {
    const dto = await this.http.post<ShipmentPackageStagingDto>(
      SHIPPING_ENDPOINTS.STAGING_PACKAGES,
      ShippingMapper.toStagePackageRequest(input),
    );
    return ShippingMapper.toStaging(dto);
  }

  async assignDock(id: string, input: AssignDockInput): Promise<ShipmentPackageStaging> {
    const dto = await this.http.post<ShipmentPackageStagingDto>(
      SHIPPING_ENDPOINTS.ASSIGN_DOCK(id),
      ShippingMapper.toAssignDockRequest(input),
    );
    return ShippingMapper.toStaging(dto);
  }

  async assignTruck(id: string, input: AssignTruckInput): Promise<ShipmentPackageStaging> {
    const dto = await this.http.post<ShipmentPackageStagingDto>(
      SHIPPING_ENDPOINTS.ASSIGN_TRUCK(id),
      ShippingMapper.toAssignTruckRequest(input),
    );
    return ShippingMapper.toStaging(dto);
  }
}
