export const CATALOG_ENDPOINTS = {
  OWNERS: '/owners',
  OWNER_BY_ID: (id: string) => `/owners/${id}`,
  UOMS: '/uoms',
  UOM_BY_ID: (id: string) => `/uoms/${id}`,
  SKUS: '/skus',
  SKU_BY_ID: (id: string) => `/skus/${id}`,
  SKU_BARCODES: '/sku-barcodes',
  SKU_BARCODE_BY_ID: (id: string) => `/sku-barcodes/${id}`,
  UOM_CONVERSIONS: '/uom-conversions',
  UOM_CONVERSION_BY_ID: (id: string) => `/uom-conversions/${id}`,
  ITEM_COVERAGES: '/item-coverages',
  ITEM_COVERAGE_BY_ID: (id: string) => `/item-coverages/${id}`,
} as const;
