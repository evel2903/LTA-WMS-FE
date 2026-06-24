import type { PaginatedResponse } from '@shared/Types/Api';
import type { ShipmentPackageStaging } from '@modules/Shipping/Domain/Types/Shipping';
import type {
  AssignDockInput,
  AssignTruckInput,
  ConfirmShipmentInput,
  EvaluateGoodsIssueTriggerInput,
  RecordGateOutInput,
  ScanLoadingInput,
  StagePackageInput,
} from '@modules/Shipping/Domain/Types/ShippingQuery';
import type {
  AssignDockRequestDto,
  AssignTruckRequestDto,
  ConfirmShipmentRequestDto,
  EvaluateGoodsIssueTriggerRequestDto,
  PagedShipmentPackageStagingDto,
  RecordGateOutRequestDto,
  ScanLoadingRequestDto,
  ShipmentPackageStagingDto,
  StagePackageRequestDto,
} from '@modules/Shipping/Infrastructure/Dtos/ShippingDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class ShippingMapper {
  static toStaging(dto: ShipmentPackageStagingDto): ShipmentPackageStaging {
    return {
      id: dto.Id,
      stagingCode: dto.StagingCode,
      packageId: dto.PackageId,
      packageCode: dto.PackageCode,
      outboundOrderId: dto.OutboundOrderId,
      warehouseProfileId: dto.WarehouseProfileId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      status: dto.Status,
      inventoryStatusCode: dto.InventoryStatusCode,
      shipmentReference: dto.ShipmentReference,
      stagingLaneCode: dto.StagingLaneCode,
      stagingLocationId: dto.StagingLocationId,
      stagingLocationCode: dto.StagingLocationCode,
      dockDoorId: dto.DockDoorId,
      dockDoorCode: dto.DockDoorCode,
      truckReference: dto.TruckReference,
      vehicleNumber: dto.VehicleNumber,
      driverName: dto.DriverName,
      carrierId: dto.CarrierId,
      carrierCode: dto.CarrierCode,
      coreFlowInstanceId: dto.CoreFlowInstanceId,
      stagedAt: dto.StagedAt,
      stagedBy: dto.StagedBy,
      dockAssignedAt: dto.DockAssignedAt,
      dockAssignedBy: dto.DockAssignedBy,
      truckAssignedAt: dto.TruckAssignedAt,
      truckAssignedBy: dto.TruckAssignedBy,
      loadReference: dto.LoadReference,
      loadedAt: dto.LoadedAt,
      loadedBy: dto.LoadedBy,
      shipmentConfirmedAt: dto.ShipmentConfirmedAt,
      shipmentConfirmedBy: dto.ShipmentConfirmedBy,
      gateOutReference: dto.GateOutReference,
      gateOutAt: dto.GateOutAt,
      gateOutBy: dto.GateOutBy,
      goodsIssueTrigger: dto.GoodsIssueTrigger,
      goodsIssueTriggerStatus: dto.GoodsIssueTriggerStatus,
      goodsIssueTriggeredAt: dto.GoodsIssueTriggeredAt,
      goodsIssueTriggeredBy: dto.GoodsIssueTriggeredBy,
      loadingOutboxMessageId: dto.LoadingOutboxMessageId,
      shipmentConfirmOutboxMessageId: dto.ShipmentConfirmOutboxMessageId,
      gateOutOutboxMessageId: dto.GateOutOutboxMessageId,
      goodsIssueTriggerOutboxMessageId: dto.GoodsIssueTriggerOutboxMessageId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  }

  static toPaged(dto: PagedShipmentPackageStagingDto): PaginatedResponse<ShipmentPackageStaging> {
    return {
      items: dto.Items.map((item) => ShippingMapper.toStaging(item)),
      page: dto.Meta?.Page ?? dto.Page ?? 1,
      pageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      totalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items.length,
      totalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }

  static toStagePackageRequest(input: StagePackageInput): StagePackageRequestDto {
    return removeEmpty({
      PackageId: input.packageId,
      ShipmentReference: input.shipmentReference,
      StagingLaneCode: input.stagingLaneCode,
      StagingLocationId: input.stagingLocationId,
      StagingLocationCode: input.stagingLocationCode,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toAssignDockRequest(input: AssignDockInput): AssignDockRequestDto {
    return removeEmpty({
      DockDoorId: input.dockDoorId,
      DockDoorCode: input.dockDoorCode,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toAssignTruckRequest(input: AssignTruckInput): AssignTruckRequestDto {
    return removeEmpty({
      TruckReference: input.truckReference,
      VehicleNumber: input.vehicleNumber,
      DriverName: input.driverName,
      CarrierId: input.carrierId,
      CarrierCode: input.carrierCode,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toScanLoadingRequest(input: ScanLoadingInput): ScanLoadingRequestDto {
    return removeEmpty({
      ScannedPackageId: input.scannedPackageId,
      ScannedPackageCode: input.scannedPackageCode,
      ShipmentReference: input.shipmentReference,
      LoadReference: input.loadReference,
      TruckReference: input.truckReference,
      VehicleNumber: input.vehicleNumber,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toConfirmShipmentRequest(input: ConfirmShipmentInput): ConfirmShipmentRequestDto {
    return removeEmpty({
      ShipmentReference: input.shipmentReference,
      RequireFullLoad: input.requireFullLoad,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toRecordGateOutRequest(input: RecordGateOutInput): RecordGateOutRequestDto {
    return removeEmpty({
      GateOutReference: input.gateOutReference,
      TruckReference: input.truckReference,
      VehicleNumber: input.vehicleNumber,
      InventoryStatusCode: input.inventoryStatusCode,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toEvaluateGoodsIssueTriggerRequest(
    input: EvaluateGoodsIssueTriggerInput,
  ): EvaluateGoodsIssueTriggerRequestDto {
    return removeEmpty({
      GoodsIssueTrigger: input.goodsIssueTrigger,
      InventoryStatusCode: input.inventoryStatusCode,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }
}
