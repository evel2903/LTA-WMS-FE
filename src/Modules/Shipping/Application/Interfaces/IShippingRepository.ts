import type { PaginatedResponse } from '@shared/Types/Api';
import type { ShipmentPackageStaging } from '@modules/Shipping/Domain/Types/Shipping';
import type {
  AssignDockInput,
  AssignTruckInput,
  ConfirmShipmentInput,
  EvaluateGoodsIssueTriggerInput,
  PostGoodsIssueInput,
  RecordGateOutInput,
  ScanLoadingInput,
  ShippingStagingListFilter,
  StagePackageInput,
} from '@modules/Shipping/Domain/Types/ShippingQuery';

export interface IShippingRepository {
  list(filter?: ShippingStagingListFilter): Promise<PaginatedResponse<ShipmentPackageStaging>>;
  getById(id: string): Promise<ShipmentPackageStaging>;
  stagePackage(input: StagePackageInput): Promise<ShipmentPackageStaging>;
  assignDock(id: string, input: AssignDockInput): Promise<ShipmentPackageStaging>;
  assignTruck(id: string, input: AssignTruckInput): Promise<ShipmentPackageStaging>;
  scanLoading(id: string, input: ScanLoadingInput): Promise<ShipmentPackageStaging>;
  confirmShipment(id: string, input: ConfirmShipmentInput): Promise<ShipmentPackageStaging>;
  recordGateOut(id: string, input: RecordGateOutInput): Promise<ShipmentPackageStaging>;
  evaluateGoodsIssueTrigger(
    id: string,
    input: EvaluateGoodsIssueTriggerInput,
  ): Promise<ShipmentPackageStaging>;
  postGoodsIssue(id: string, input: PostGoodsIssueInput): Promise<ShipmentPackageStaging>;
}
