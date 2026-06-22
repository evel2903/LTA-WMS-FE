export const BARCODE_LABEL_ENDPOINTS = {
  LABEL_TEMPLATES: '/label-templates',
  LABEL_TEMPLATE_BY_ID: (id: string) => `/label-templates/${id}`,
  LABEL_TEMPLATE_VERSIONS: (id: string) => `/label-templates/${id}/versions`,
  PRINT_JOBS: '/print-jobs',
  PRINT_JOB_BY_ID: (id: string) => `/print-jobs/${id}`,
  PREVIEW: '/print-jobs/preview',
  REPRINT: (id: string) => `/print-jobs/${id}/reprint`,
  LABEL_BLOCKING_VALIDATE: '/label-blocking/validate',
} as const;
