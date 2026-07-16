import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import { SearchableLookupSelect } from '@shared/Components/Ui/SearchableLookupSelect';
import type { InboundPlanFormLookups } from '@modules/Inbound/Presentation/Components/UseInboundPlanFormLookups';

// IFB-24 review fix: shared by InboundCreatePage and InboundEditPanel (was duplicated
// JSX in both).
export interface InboundPlanScopeFieldsProps {
  idPrefix: string;
  supplierId: string;
  onSupplierIdChange: (value: string) => void;
  ownerId: string;
  onOwnerIdChange: (value: string) => void;
  warehouseId: string;
  onWarehouseIdChange: (value: string) => void;
  warehouseProfileId: string;
  onWarehouseProfileIdChange: (value: string) => void;
  lookups: InboundPlanFormLookups;
}

export function InboundPlanScopeFields({
  idPrefix,
  supplierId,
  onSupplierIdChange,
  ownerId,
  onOwnerIdChange,
  warehouseId,
  onWarehouseIdChange,
  warehouseProfileId,
  onWarehouseProfileIdChange,
  lookups,
}: InboundPlanScopeFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LookupSelect
        id={`${idPrefix}-supplier-id`}
        name="supplierId"
        label="Nhà cung cấp"
        value={supplierId}
        placeholder="Chọn nhà cung cấp"
        options={lookups.supplierOptions}
        isLoading={lookups.supplierQuery.isLoading}
        isError={lookups.supplierQuery.isError}
        emptyMessage="Chưa có nhà cung cấp active để chọn."
        errorMessage="Không tải được danh sách nhà cung cấp."
        onChange={onSupplierIdChange}
      />
      <LookupSelect
        id={`${idPrefix}-owner-id`}
        name="ownerId"
        label="Chủ hàng"
        value={ownerId}
        placeholder="Chọn chủ hàng"
        options={lookups.ownerOptions}
        isLoading={lookups.ownerQuery.isLoading}
        isError={lookups.ownerQuery.isError}
        emptyMessage="Chưa có chủ hàng active để chọn."
        errorMessage="Không tải được danh sách chủ hàng."
        onChange={onOwnerIdChange}
      />
      <SearchableLookupSelect
        id={`${idPrefix}-warehouse-id`}
        name="warehouseId"
        label="Kho"
        value={warehouseId}
        placeholder="Chọn kho"
        options={lookups.warehouseOptions}
        isLoading={lookups.warehouseQuery.isLoading}
        isError={lookups.warehouseQuery.isError}
        emptyMessage="Chưa có kho active để chọn."
        errorMessage="Không tải được danh sách kho."
        onChange={onWarehouseIdChange}
        searchValue={lookups.warehouseSearch}
        onSearchChange={lookups.setWarehouseSearch}
        searchPlaceholder="Tìm theo mã/tên kho..."
      />
      <LookupSelect
        id={`${idPrefix}-warehouse-profile-id`}
        name="warehouseProfileId"
        label="Hồ sơ kho"
        value={warehouseProfileId}
        placeholder="Không chọn hồ sơ kho"
        options={lookups.warehouseProfileOptions}
        isLoading={lookups.warehouseProfileQuery.isLoading}
        isError={lookups.warehouseProfileQuery.isError}
        emptyMessage="Chưa có hồ sơ kho active để chọn."
        errorMessage="Không tải được danh sách hồ sơ kho."
        optional
        onChange={onWarehouseProfileIdChange}
      />
    </div>
  );
}
