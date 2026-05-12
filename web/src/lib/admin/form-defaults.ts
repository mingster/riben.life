import type { FieldValues, UseFormProps } from "react-hook-form";

/**
 * Default options for store admin CRUD forms (see `form-handling.mdc`, CHECKLIST-storeadmin-forms).
 * Spread into `useForm({ ...adminCrudUseFormProps, resolver, defaultValues })`.
 */
export const adminCrudUseFormProps = {
	mode: "onChange",
} as const satisfies Pick<UseFormProps<FieldValues>, "mode">;
