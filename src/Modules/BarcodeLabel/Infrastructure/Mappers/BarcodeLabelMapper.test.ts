import { describe, expect, it } from 'vitest';
import { BarcodeLabelMapper } from '@modules/BarcodeLabel/Infrastructure/Mappers/BarcodeLabelMapper';
import type {
  LabelBlockingValidationResultDto,
  LabelTemplateDto,
  PrintJobDto,
} from '@modules/BarcodeLabel/Infrastructure/Dtos/BarcodeLabelDtos';

const templateDto: LabelTemplateDto = {
  Id: 'template-1',
  TemplateCode: 'LPN-STD',
  TemplateName: 'LPN Standard',
  LabelType: 'LPN',
  Status: 'Active',
  RequiredFields: ['BarcodeValue', 'OwnerCode'],
  TemplateBody: 'LPN {{BarcodeValue}}',
  ActiveVersionId: 'version-1',
  CreatedAt: '2026-06-22T08:00:00.000Z',
  UpdatedAt: '2026-06-22T08:00:00.000Z',
  CreatedBy: 'user-1',
  UpdatedBy: 'user-1',
};

const printJobDto: PrintJobDto = {
  Id: 'job-1',
  JobCode: 'PJ-001',
  TemplateId: 'template-1',
  TemplateVersionId: 'version-1',
  BusinessObjectType: 'LPN',
  BusinessObjectId: 'lpn-1',
  BusinessObjectCode: 'LPN0001',
  WarehouseId: 'warehouse-a',
  OwnerId: 'owner-a',
  PayloadJson: { BarcodeValue: 'SSCC-1' },
  PreviewContent: 'LPN SSCC-1',
  Status: 'Previewed',
  ValidationErrors: null,
  ReprintCount: 0,
  RequestedBy: 'user-1',
  RequestedAt: '2026-06-22T08:30:00.000Z',
  CompletedAt: '2026-06-22T08:30:00.000Z',
  CreatedAt: '2026-06-22T08:30:00.000Z',
  UpdatedAt: '2026-06-22T08:30:00.000Z',
  CreatedBy: 'user-1',
  UpdatedBy: 'user-1',
};

const blockingDto: LabelBlockingValidationResultDto = {
  Allowed: false,
  Blocked: true,
  Decision: 'Blocked',
  RequiredLabelType: 'LPN',
  PolicyMode: 'hard',
  OverrideAllowed: false,
  OverrideAccepted: false,
  Reason: 'Required label evidence is missing.',
  MatchedPrintJobId: null,
  MatchedPrintJobCode: null,
  ValidationDetails: { DownstreamAction: 'putaway' },
};

describe('BarcodeLabelMapper', () => {
  it('maps label template and print job DTOs into domain types', () => {
    expect(BarcodeLabelMapper.toLabelTemplate(templateDto)).toMatchObject({
      id: 'template-1',
      templateCode: 'LPN-STD',
      requiredFields: ['BarcodeValue', 'OwnerCode'],
    });
    expect(BarcodeLabelMapper.toPrintJob(printJobDto)).toMatchObject({
      id: 'job-1',
      jobCode: 'PJ-001',
      status: 'Previewed',
      previewContent: 'LPN SSCC-1',
    });
    expect(BarcodeLabelMapper.toLabelBlockingValidationResult(blockingDto)).toMatchObject({
      allowed: false,
      decision: 'Blocked',
      requiredLabelType: 'LPN',
    });
  });

  it('builds PascalCase payloads and drops nullish optional values', () => {
    expect(
      BarcodeLabelMapper.toCreateTemplateRequest({
        templateCode: 'PKG-STD',
        templateName: 'Package Standard',
        labelType: 'Package',
        requiredFields: ['BarcodeValue'],
        templateBody: '{{BarcodeValue}}',
      }),
    ).toEqual({
      TemplateCode: 'PKG-STD',
      TemplateName: 'Package Standard',
      LabelType: 'Package',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: '{{BarcodeValue}}',
    });

    expect(
      BarcodeLabelMapper.toPreviewRequest({
        templateId: 'template-1',
        businessObjectType: 'LPN',
        businessObjectId: 'lpn-1',
        businessObjectCode: '',
        warehouseId: null,
        payloadJson: { BarcodeValue: 'SSCC-1' },
      }),
    ).toEqual({
      TemplateId: 'template-1',
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      PayloadJson: { BarcodeValue: 'SSCC-1' },
    });

    expect(
      BarcodeLabelMapper.toCreateTemplateVersionRequest({
        requiredFields: ['BarcodeValue', 'OwnerCode'],
        templateBody: '{{BarcodeValue}} {{OwnerCode}}',
      }),
    ).toEqual({
      RequiredFields: ['BarcodeValue', 'OwnerCode'],
      TemplateBody: '{{BarcodeValue}} {{OwnerCode}}',
    });

    expect(
      BarcodeLabelMapper.toReprintRequest({
        reasonCode: 'RC-V1-REPRINT',
        reasonNote: null,
      }),
    ).toEqual({ ReasonCode: 'RC-V1-REPRINT' });

    expect(
      BarcodeLabelMapper.toValidateLabelBlockingRequest({
        downstreamAction: 'putaway',
        businessObjectType: 'LPN',
        businessObjectId: 'lpn-1',
        businessObjectCode: '',
        warehouseProfileId: 'profile-1',
        warehouseId: 'warehouse-a',
        ownerId: null,
        labelType: 'LPN',
        attemptOverride: false,
      }),
    ).toEqual({
      DownstreamAction: 'putaway',
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      LabelType: 'LPN',
      AttemptOverride: false,
    });
  });
});
