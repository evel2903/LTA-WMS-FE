import * as React from 'react';
import {
  useFormContext,
  useFormState,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

export interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

export const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
export const FormItemContext = React.createContext<{ id: string } | null>(null);

export function useFormField() {
  const fieldContext = React.use(FormFieldContext);
  const itemContext = React.use(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });

  if (!fieldContext) throw new Error('useFormField must be used within <FormField>');
  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext?.id ?? '';

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}
