import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import { CATALOG_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type {
  ItemCoverage,
  Owner,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CreateItemCoverageInput,
  CreateOwnerInput,
  CreateSkuBarcodeInput,
  CreateSkuInput,
  CreateUomConversionInput,
  CreateUomInput,
  ItemCoverageListFilter,
  OwnerListFilter,
  SkuBarcodeListFilter,
  SkuListFilter,
  UomConversionListFilter,
  UomListFilter,
  UpdateOwnerInput,
  UpdateSkuInput,
  UpdateUomInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';
import { CATALOG_ENDPOINTS } from '@modules/MasterData/Infrastructure/Api/CatalogEndpoints';
import type {
  ItemCoverageDto,
  OwnerDto,
  PagedMasterDataDto,
  SkuBarcodeDto,
  SkuDto,
  UomConversionDto,
  UomDto,
} from '@modules/MasterData/Infrastructure/Dtos/CatalogDtos';
import { CatalogMapper } from '@modules/MasterData/Infrastructure/Mappers/CatalogMapper';

function paging(filter: { page?: number; pageSize?: number } = {}) {
  return {
    Page: filter.page ?? 1,
    PageSize: filter.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE,
  };
}

export class CatalogRepository implements ICatalogRepository {
  constructor(private readonly http: HttpClient) {}

  // ── List endpoints — each builds only its own whitelisted params ──────────

  async listOwners(filter: OwnerListFilter = {}): Promise<PaginatedResponse<Owner>> {
    const dto = await this.http.get<PagedMasterDataDto<OwnerDto>>(CATALOG_ENDPOINTS.OWNERS, {
      params: {
        ...paging(filter),
        Status: filter.status,
        OwnerCode: filter.ownerCode,
        OwnerName: filter.ownerName,
      },
    });
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toOwner(item));
  }

  async listUoms(filter: UomListFilter = {}): Promise<PaginatedResponse<Uom>> {
    const dto = await this.http.get<PagedMasterDataDto<UomDto>>(CATALOG_ENDPOINTS.UOMS, {
      params: {
        ...paging(filter),
        Status: filter.status,
        UomCode: filter.uomCode,
        UomName: filter.uomName,
        UomType: filter.uomType,
      },
    });
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toUom(item));
  }

  async listSkus(filter: SkuListFilter = {}): Promise<PaginatedResponse<Sku>> {
    const dto = await this.http.get<PagedMasterDataDto<SkuDto>>(CATALOG_ENDPOINTS.SKUS, {
      params: {
        ...paging(filter),
        ItemStatus: filter.itemStatus,
        SkuCode: filter.skuCode,
        SkuName: filter.skuName,
        DefaultOwnerId: filter.defaultOwnerId,
        ItemClass: filter.itemClass,
      },
    });
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toSku(item));
  }

  async listSkuBarcodes(
    filter: SkuBarcodeListFilter = {},
  ): Promise<PaginatedResponse<SkuBarcode>> {
    const dto = await this.http.get<PagedMasterDataDto<SkuBarcodeDto>>(
      CATALOG_ENDPOINTS.SKU_BARCODES,
      {
        params: {
          ...paging(filter),
          SkuId: filter.skuId,
          OwnerId: filter.ownerId,
          UomId: filter.uomId,
          BarcodeValue: filter.barcodeValue,
          Status: filter.status,
        },
      },
    );
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toSkuBarcode(item));
  }

  async listUomConversions(
    filter: UomConversionListFilter = {},
  ): Promise<PaginatedResponse<UomConversion>> {
    const dto = await this.http.get<PagedMasterDataDto<UomConversionDto>>(
      CATALOG_ENDPOINTS.UOM_CONVERSIONS,
      {
        params: {
          ...paging(filter),
          SkuId: filter.skuId,
          FromUomId: filter.fromUomId,
          ToUomId: filter.toUomId,
          Status: filter.status,
          EffectiveFrom: filter.effectiveFrom,
        },
      },
    );
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toUomConversion(item));
  }

  async listItemCoverages(
    filter: ItemCoverageListFilter = {},
  ): Promise<PaginatedResponse<ItemCoverage>> {
    const dto = await this.http.get<PagedMasterDataDto<ItemCoverageDto>>(
      CATALOG_ENDPOINTS.ITEM_COVERAGES,
      {
        params: {
          ...paging(filter),
          SkuId: filter.skuId,
          WarehouseId: filter.warehouseId,
          OwnerId: filter.ownerId,
          Status: filter.status,
        },
      },
    );
    return CatalogMapper.toPaged(dto, (item) => CatalogMapper.toItemCoverage(item));
  }

  async getSku(id: string): Promise<Sku> {
    const dto = await this.http.get<SkuDto>(CATALOG_ENDPOINTS.SKU_BY_ID(id));
    return CatalogMapper.toSku(dto);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async createOwner(input: CreateOwnerInput): Promise<Owner> {
    const dto = await this.http.post<OwnerDto>(
      CATALOG_ENDPOINTS.OWNERS,
      CatalogMapper.toCreateOwnerRequest(input),
    );
    return CatalogMapper.toOwner(dto);
  }

  async updateOwner(id: string, input: UpdateOwnerInput): Promise<Owner> {
    const dto = await this.http.patch<OwnerDto>(
      CATALOG_ENDPOINTS.OWNER_BY_ID(id),
      CatalogMapper.toUpdateOwnerRequest(input),
    );
    return CatalogMapper.toOwner(dto);
  }

  async createUom(input: CreateUomInput): Promise<Uom> {
    const dto = await this.http.post<UomDto>(
      CATALOG_ENDPOINTS.UOMS,
      CatalogMapper.toCreateUomRequest(input),
    );
    return CatalogMapper.toUom(dto);
  }

  async updateUom(id: string, input: UpdateUomInput): Promise<Uom> {
    const dto = await this.http.patch<UomDto>(
      CATALOG_ENDPOINTS.UOM_BY_ID(id),
      CatalogMapper.toUpdateUomRequest(input),
    );
    return CatalogMapper.toUom(dto);
  }

  async createSku(input: CreateSkuInput): Promise<Sku> {
    const dto = await this.http.post<SkuDto>(
      CATALOG_ENDPOINTS.SKUS,
      CatalogMapper.toCreateSkuRequest(input),
    );
    return CatalogMapper.toSku(dto);
  }

  async updateSku(id: string, input: UpdateSkuInput): Promise<Sku> {
    const dto = await this.http.patch<SkuDto>(
      CATALOG_ENDPOINTS.SKU_BY_ID(id),
      CatalogMapper.toUpdateSkuRequest(input),
    );
    return CatalogMapper.toSku(dto);
  }

  async createSkuBarcode(input: CreateSkuBarcodeInput): Promise<SkuBarcode> {
    const dto = await this.http.post<SkuBarcodeDto>(
      CATALOG_ENDPOINTS.SKU_BARCODES,
      CatalogMapper.toCreateSkuBarcodeRequest(input),
    );
    return CatalogMapper.toSkuBarcode(dto);
  }

  async createUomConversion(input: CreateUomConversionInput): Promise<UomConversion> {
    const dto = await this.http.post<UomConversionDto>(
      CATALOG_ENDPOINTS.UOM_CONVERSIONS,
      CatalogMapper.toCreateUomConversionRequest(input),
    );
    return CatalogMapper.toUomConversion(dto);
  }

  async createItemCoverage(input: CreateItemCoverageInput): Promise<ItemCoverage> {
    const dto = await this.http.post<ItemCoverageDto>(
      CATALOG_ENDPOINTS.ITEM_COVERAGES,
      CatalogMapper.toCreateItemCoverageRequest(input),
    );
    return CatalogMapper.toItemCoverage(dto);
  }
}
