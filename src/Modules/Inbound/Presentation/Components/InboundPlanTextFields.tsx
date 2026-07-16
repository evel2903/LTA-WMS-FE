import { Input } from '@shared/Components/Ui/Input';

// IFB-24 review fix: shared by InboundCreatePage and InboundEditPanel (was duplicated
// JSX in both).
export interface InboundPlanTextFieldsProps {
  idPrefix: string;
  sourceSystem: string;
  onSourceSystemChange: (value: string) => void;
  sourceDocumentType: string;
  onSourceDocumentTypeChange: (value: string) => void;
  sourceDocumentNumber: string;
  onSourceDocumentNumberChange: (value: string) => void;
  expectedArrivalAt: string;
  onExpectedArrivalAtChange: (value: string) => void;
}

export function InboundPlanTextFields({
  idPrefix,
  sourceSystem,
  onSourceSystemChange,
  sourceDocumentType,
  onSourceDocumentTypeChange,
  sourceDocumentNumber,
  onSourceDocumentNumberChange,
  expectedArrivalAt,
  onExpectedArrivalAtChange,
}: InboundPlanTextFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-source-system`}>
        Hệ thống nguồn
        <Input
          id={`${idPrefix}-source-system`}
          name="sourceSystem"
          value={sourceSystem}
          onChange={(event) => onSourceSystemChange(event.target.value)}
          placeholder="ERP"
        />
      </label>
      <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-source-document-type`}>
        Loại chứng từ nguồn
        <Input
          id={`${idPrefix}-source-document-type`}
          name="sourceDocumentType"
          value={sourceDocumentType}
          onChange={(event) => onSourceDocumentTypeChange(event.target.value)}
          placeholder="ASN"
        />
      </label>
      <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-source-document-number`}>
        Số chứng từ nguồn
        <Input
          id={`${idPrefix}-source-document-number`}
          name="sourceDocumentNumber"
          value={sourceDocumentNumber}
          onChange={(event) => onSourceDocumentNumberChange(event.target.value)}
          placeholder="ASN-10001"
        />
      </label>
      <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-expected-arrival-at`}>
        Thời gian đến dự kiến
        <Input
          id={`${idPrefix}-expected-arrival-at`}
          name="expectedArrivalAt"
          type="datetime-local"
          value={expectedArrivalAt}
          onChange={(event) => onExpectedArrivalAtChange(event.target.value)}
        />
      </label>
    </div>
  );
}
