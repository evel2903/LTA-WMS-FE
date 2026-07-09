import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { useReasonCodeOptions } from '@modules/ReasonCode/Application/Queries/UseReasonCodeOptions';
import type { ActionCode, ObjectType } from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

interface ReasonCodeSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  action: ActionCode;
  objectType: ObjectType;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}

export function ReasonCodeSelect({
  id,
  name,
  label,
  value,
  action,
  objectType,
  placeholder = 'Chọn mã lý do',
  optional = false,
  disabled = false,
  autoFocus = false,
  onChange,
}: ReasonCodeSelectProps) {
  const { options, isLoading, isError } = useReasonCodeOptions({
    action,
    objectType,
  });

  return (
    <ComboboxSelect
      id={id}
      name={name}
      label={label}
      value={value}
      placeholder={placeholder}
      options={options}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Chưa có mã lý do phù hợp."
      errorMessage="Không tải được danh sách mã lý do."
      optional={optional}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={onChange}
    />
  );
}
